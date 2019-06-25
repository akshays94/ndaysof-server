const Pool = require('pg').Pool

pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

module.exports = pool