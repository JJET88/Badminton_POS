import mysql from "mysql2/promise";

// ✅ Use mysql.createPool() from mysql2/promise directly
// This already returns a promise-based pool
// export const mysqlPool = mysql.createPool({
//   host: 'localhost',
//   user: 'u6704798',
//   password: '6704798',
//   database: 'badminton_pos',
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0
// });

export const mysqlPool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'badminton_pos',
   port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,
  ssl: process.env.DB_SSL === 'true' ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
});

  
//   // Connection pool settings
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0,
//   enableKeepAlive: true,
//   keepAliveInitialDelay: 0,
  
//   // Important for TiDB
//   charset: 'utf8mb4',
//   timezone: '+00:00',
  
//   // Timeout settings
//   connectTimeout: 60000,
//   acquireTimeout: 60000,
//   timeout: 60000
// });

// // Test connection function
// export async function testConnection() {
//   try {
//     const connection = await mysqlPool.getConnection();
//     console.log('✅ Database connection successful');
    
//     // Test query
//     const [rows] = await connection.query('SELECT 1 as test');
//     console.log('✅ Test query successful:', rows);
    
//     connection.release();
//     return true;
//   } catch (error) {
//     console.error('❌ Database connection failed:', {
//       message: error.message,
//       code: error.code,
//       errno: error.errno
//     });
//     return false;
//   }
// }

// // Call this on server start (optional)
// if (process.env.NODE_ENV === 'development') {
//   testConnection();
// }