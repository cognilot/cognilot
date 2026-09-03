import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

function getSvg(size = 512, isSmall = false) {
  const strokeWidth = isSmall ? 52 : 44;
  const loopWidth = 130;
  const loopHeight = 260;
  const rx = 65;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">
  <defs>
    <!-- Background Gradient -->
    <radialGradient id="bg-glow" cx="50%" cy="50%" r="60%">
      <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.18" />
      <stop offset="60%" stop-color="#8b5cf6" stop-opacity="0.08" />
      <stop offset="100%" stop-color="#050505" stop-opacity="0" />
    </radialGradient>

    <!-- Cyan Gradient -->
    <linearGradient id="cyan-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#22d3ee" />
      <stop offset="100%" stop-color="#06b6d4" />
    </linearGradient>

    <!-- White Gradient -->
    <linearGradient id="white-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#e2e8f0" />
    </linearGradient>

    <!-- Drop Shadow -->
    <filter id="knot-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.75" />
    </filter>

    <!-- Clip path for weave at top-left -->
    <clipPath id="weave-clip">
      <rect x="-180" y="-180" width="180" height="180" />
    </clipPath>
  </defs>

  <!-- Squircle Container -->
  <rect x="20" y="20" width="472" height="472" rx="108" ry="108" fill="#050505" stroke="rgba(255, 255, 255, 0.14)" stroke-width="4" />
  
  <!-- Subtle Ambient Glow inside container -->
  <rect x="20" y="20" width="472" height="472" rx="108" ry="108" fill="url(#bg-glow)" />

  <g transform="translate(256, 256)" filter="url(#knot-shadow)">
    <!-- Loop 1 (White - Tilted -45 deg) -->
    <g transform="rotate(-45)">
      <rect
        x="${-loopWidth / 2}"
        y="${-loopHeight / 2}"
        width="${loopWidth}"
        height="${loopHeight}"
        rx="${rx}"
        ry="${rx}"
        fill="none"
        stroke="url(#white-grad)"
        stroke-width="${strokeWidth}"
        stroke-linejoin="round"
      />
    </g>

    <!-- Loop 2 (Cyan - Tilted +45 deg) -->
    <g transform="rotate(45)">
      <rect
        x="${-loopWidth / 2}"
        y="${-loopHeight / 2}"
        width="${loopWidth}"
        height="${loopHeight}"
        rx="${rx}"
        ry="${rx}"
        fill="none"
        stroke="url(#cyan-grad)"
        stroke-width="${strokeWidth}"
        stroke-linejoin="round"
      />
    </g>

    <!-- Weave Overlay: Top-Left & Bottom-Right of Loop 1 drawn over Loop 2 for the 3D over-under knot effect -->
    <g clip-path="url(#weave-clip)">
      <g transform="rotate(-45)">
        <rect
          x="${-loopWidth / 2}"
          y="${-loopHeight / 2}"
          width="${loopWidth}"
          height="${loopHeight}"
          rx="${rx}"
          ry="${rx}"
          fill="none"
          stroke="url(#white-grad)"
          stroke-width="${strokeWidth}"
          stroke-linejoin="round"
        />
      </g>
    </g>
  </g>
</svg>`;
}

async function main() {
  const targetDir = path.resolve('cognilot-extension/public/icons');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Master SVG
  const masterSvg = getSvg(512);
  fs.writeFileSync(path.join(targetDir, 'icon.svg'), masterSvg, 'utf-8');

  // Also sync to web public
  const webPublicDir = path.resolve('cognilot-web/public');
  if (fs.existsSync(webPublicDir)) {
    fs.writeFileSync(path.join(webPublicDir, 'icon.svg'), masterSvg, 'utf-8');
  }

  // Resolutions
  const sizes = [16, 32, 48, 128];

  for (const size of sizes) {
    const isSmall = size <= 32;
    const svg = getSvg(size, isSmall);
    const outputPath = path.join(targetDir, `icon-${size}.png`);

    await sharp(Buffer.from(svg))
      .resize(size, size)
      .png({ quality: 100, compressionLevel: 9 })
      .toFile(outputPath);

    console.log(`Generated: ${outputPath} (${size}x${size})`);
  }

  console.log('All icons generated successfully with mathematical precision!');
}

main().catch(console.error);
