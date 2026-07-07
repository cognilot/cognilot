const postgres = require('postgres');
const sql = postgres('postgresql://postgres:LQf3Xi2MW5VNx6Uc@db.qenhullzuvpjxdyhtudq.supabase.co:5432/postgres');
sql`SELECT * FROM users LIMIT 1`.then(r => { 
  console.log('users:', r); 
  return sql`SELECT * FROM user_profiles LIMIT 1`; 
}).then(r => { 
  console.log('profiles:', r); 
  process.exit(0); 
}).catch(e => { 
  console.error('Error:', e); 
  process.exit(1); 
});
