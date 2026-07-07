import fetch from 'node-fetch';
const API_URL = 'http://localhost:8000/api/profile';
const token = process.argv[2];

fetch(API_URL, {
  headers: {
    Authorization: `Bearer ${token}`
  }
}).then(r => r.text()).then(console.log).catch(console.error);
