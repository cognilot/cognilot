import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL || 'postgresql://postgres.qenhullzuvpjxdyhtudq:GkN03jR45uKA5BA0@aws-1-us-east-1.pooler.supabase.com:6543/postgres');

async function fixConstraints() {
  console.log('Fixing constraints...');
  try {
    await sql`ALTER TABLE "users" ALTER COLUMN "is_active" DROP NOT NULL`;
    await sql`ALTER TABLE "users" ALTER COLUMN "is_active" SET DEFAULT true`;
    console.log('Fixed is_active constraint.');
  } catch (e) {
    console.log('Could not fix is_active:', e.message);
  }

  // Try to fix other potentially NOT NULL columns that are not in schema
  const cols = ['last_login', 'display_name', 'given_name', 'family_name', 'avatar_url', 'onboarding_completed'];
  for (const col of cols) {
    try {
      await sql.unsafe(`ALTER TABLE "users" ALTER COLUMN "${col}" DROP NOT NULL`);
      console.log(`Dropped NOT NULL from ${col}`);
    } catch (e) {
      // ignore
    }
  }

  console.log('Done!');
  await sql.end();
}

fixConstraints();
