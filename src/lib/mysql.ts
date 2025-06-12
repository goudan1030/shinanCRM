/**
 * 此文件已弃用，请使用 src/lib/database.ts
 * 为保持向后兼容，此文件仍然存在
 */

import getPoolFn, { 
  getPool,
  authenticateUser,
  updateUserProfile,
  updateUserPassword
} from './database';

// 获取连接池实例，并将其直接导出作为默认导出
const pool = getPool();

// 为向后兼容提供 createClient 函数
const createClient = () => {
  console.warn('createClient() 已弃用，请使用 getPool() 获取连接池');
  return getPool();
};

// 为了保持向后兼容，导出所有需要的函数和连接池
export default pool;
export { 
  pool, 
  createClient,
  authenticateUser,
  updateUserProfile,
  updateUserPassword
};