import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL);

async function main() {
  try {
    await sql`ALTER TABLE usage_credits ADD CONSTRAINT usage_credits_user_id_date_unique UNIQUE (user_id, date);`;
    console.log('Unique constraint added successfully');
  } catch (err) {
    if (err.message && err.message.includes('already exists')) {
      console.log('Constraint already exists');
    } else {
      console.error('Error:', err);
      process.exit(1);
    }
  } finally {
    await sql.end();
  }
}

main();
