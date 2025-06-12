/**
 * 此文件已弃用，请使用 src/lib/database.ts
 * 为保持向后兼容，此文件仍然存在
 */

import pool, { 
  createClient,
  authenticateUser,
  updateUserProfile,
  updateUserPassword
} from './database';

// 为了保持向后兼容，导出所有需要的函数和连接池
export default pool;
export { 
  pool, 
  createClient,
  authenticateUser,
  updateUserProfile,
  updateUserPassword
};