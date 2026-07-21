const { Pool } = require('pg');
const { databaseUrl } = require('./config/security');
const pool = new Pool({ connectionString: databaseUrl });

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

module.exports = pool;
