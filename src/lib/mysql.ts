/**
 * 此文件已弃用，请使用 src/lib/database.ts
 * 为保持向后兼容，此文件仍然存在
 */

import { 
  getPool,
  authenticateUser,
  updateUserProfile,
  updateUserPassword
} from './database';

// 为向后兼容提供 createClient 函数
const createClient = () => {
  console.warn('createClient() 已弃用，请使用 getPool() 获取连接池');
  return getPool();
};

// 创建一个代理对象，将所有方法调用转发到实际的连接池
// 这样既保持了向后兼容，又实现了懒加载
const poolProxy = new Proxy({} as any, {
  get(target, prop) {
    // 当访问属性时，才获取实际的连接池
    const actualPool = getPool();
    const value = actualPool[prop as keyof typeof actualPool];
    
    // 如果是方法，绑定正确的 this 上下文
    if (typeof value === 'function') {
      return value.bind(actualPool);
    }
    
    return value;
  }
});

// 默认导出代理对象
export default poolProxy;

export { 
  poolProxy as pool, 
  createClient,
  authenticateUser,
  updateUserProfile,
  updateUserPassword
};