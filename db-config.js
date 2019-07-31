const Pool = require('pg').Pool

if (process.env.NODE_ENV === 'development') {
	pool = new Pool({
	  connectionString: process.env.DATABASE_URL,
	  // connectionString: 'postgres://akshays94test:akshayrollingakshaytest@mytestdb:5432/ndaysoftestdb'
	})
} else if (process.env.NODE_ENV === 'test') {
	// postgres://akshays94:akshayrollingakshay@mydb:5432/ndaysofdb
	pool = new Pool({
	  connectionString: 'postgres://akshays94test:akshayrollingakshaytest@mytestdb:5432/ndaysoftestdb'
	})
}

module.exports = pool