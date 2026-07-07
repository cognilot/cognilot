import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL || 'postgresql://postgres.qenhullzuvpjxdyhtudq:GkN03jR45uKA5BA0@aws-1-us-east-1.pooler.supabase.com:6543/postgres');

async function fixCreatedAt() {
  console.log('Fixing created_at default value...');
  try {
    await sql`ALTER TABLE "users" ALTER COLUMN "created_at" SET DEFAULT now()`;
    console.log('Successfully set DEFAULT now() for created_at');
  } catch (e) {
    console.log('Error setting default for created_at:', e.message);
  }

  try {
    await sql`ALTER TABLE "users" ALTER COLUMN "updated_at" SET DEFAULT now()`;
    console.log('Successfully set DEFAULT now() for updated_at');
  } catch (e) {
    // Ignore if it already has it
  }

  await sql.end();
}

fixCreatedAt();
