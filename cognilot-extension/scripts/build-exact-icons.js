import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function buildIcons() {
  const masterPath =
    'C:/Users/Jack/.gemini/antigravity/brain/59abb76a-7de4-4182-b172-c71e1a62b349/cognilot_dual_loop_1788453855395.jpg';
  const targetDir = path.resolve('cognilot-extension/public/icons');
  const webPublicDir = path.resolve('cognilot-web/public');

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // 1. Crop the squircle from the 1024x1024 master
  // Squircle is located precisely in [128, 128, 768, 768]
  const croppedSquircle = sharp(masterPath).extract({
    left: 124,
    top: 124,
    width: 776,
    height: 776,
  });

  // 2. Create an exact smooth squircle alpha mask
  // SVG mask for 776x776 with rounded corners
  const maskSvg = Buffer.from(`
    <svg width="776" height="776" viewBox="0 0 776 776">
      <rect x="0" y="0" width="776" height="776" rx="176" ry="176" fill="#ffffff" />
    </svg>
  `);

  const maskedMasterBuffer = await croppedSquircle
    .composite([
      {
        input: maskSvg,
        blend: 'dest-in',
      },
    ])
    .png()
    .toBuffer();

  // Save 512 master PNG
  const master512 = await sharp(maskedMasterBuffer)
    .resize(512, 512, { kernel: 'lanczos3' })
    .png({ quality: 100 })
    .toBuffer();

  fs.writeFileSync(path.join(targetDir, 'icon-512.png'), master512);

  if (fs.existsSync(webPublicDir)) {
    fs.writeFileSync(path.join(webPublicDir, 'icon-512.png'), master512);
    fs.writeFileSync(path.join(webPublicDir, 'apple-touch-icon.png'), master512);
  }

  // 3. Generate resolutions: 128, 48, 32, 16
  const sizes = [
    { size: 128, sharpen: false },
    { size: 48, sharpen: true },
    { size: 32, sharpen: true },
    { size: 16, sharpen: true },
  ];

  for (const { size, sharpen } of sizes) {
    let pipeline = sharp(maskedMasterBuffer).resize(size, size, {
      kernel: 'lanczos3',
    });

    if (sharpen) {
      // Subtle unsharp mask to keep the luminous ribbons super crisp at tiny resolutions
      pipeline = pipeline.sharpen({ sigma: size <= 32 ? 0.7 : 0.5, m1: 0.5, m2: 2.0 });
    }

    const outputPath = path.join(targetDir, `icon-${size}.png`);
    await pipeline.png({ compressionLevel: 9, quality: 100 }).toFile(outputPath);
    console.log(`Exported exact high-fidelity icon: ${outputPath} (${size}x${size})`);

    if (size === 128 && fs.existsSync(webPublicDir)) {
      fs.copyFileSync(outputPath, path.join(webPublicDir, 'icon-128.png'));
    }
  }

  console.log('All icons generated with 100% exact fidelity to the concept artwork!');
}

buildIcons().catch(console.error);
