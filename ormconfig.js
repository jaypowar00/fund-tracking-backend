module.exports = {
   "type": "postgres",
   "host": process.env.FTDB_HOST || "localhost",
   "port": 5432,
   "username": process.env.FTDB_USER || "postgres",
   "password": process.env.FTDB_PASSWORD || "super",
   "database": process.env.FTDB_DATABASE || "db1",
   "synchronize": true,
   "logging": false,
   "entities": [
      "src/entity/**/*.ts"
   ],
   "migrations": [
      "src/migration/**/*.ts"
   ],
   "subscribers": [
      "src/subscriber/**/*.ts"
   ],
   "cli": {
      "entitiesDir": "src/entity",
      "migrationsDir": "src/migration",
      "subscribersDir": "src/subscriber"
   },
   ssl: {
      rejectUnauthorized: false
  }
}