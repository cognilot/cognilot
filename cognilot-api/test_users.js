import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL || 'postgresql://postgres.qenhullzuvpjxdyhtudq:GkN03jR45uKA5BA0@aws-1-us-east-1.pooler.supabase.com:6543/postgres');
sql`SELECT * FROM users`.then(console.log).finally(() => sql.end());
