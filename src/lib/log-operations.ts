/**
 * 操作日志记录工具函数
 * 用于在服务器端记录各种会员相关的操作日志
 */

// 操作类型定义
export enum OperationType {
  CREATE = 'CREATE',    // 创建会员
  UPDATE = 'UPDATE',    // 更新会员信息
  ACTIVATE = 'ACTIVATE', // 激活会员
  REVOKE = 'REVOKE',    // 撤销会员
  UPGRADE = 'UPGRADE',  // 升级会员
  MATCH = 'MATCH'       // 匹配会员
}

// 目标类型定义
export enum TargetType {
  MEMBER = 'MEMBER'     // 会员
}

/**
 * 记录操作日志的函数
 * @param pool MySQL连接池
 * @param operationType 操作类型
 * @param targetType 目标类型
 * @param targetId 目标ID
 * @param userId 操作用户ID
 * @param detail 操作详情
 * @param userEmail 操作用户邮箱（可选）
 * @returns 插入的日志ID
 */
export async function recordOperationLog(
  pool: any,
  operationType: OperationType,
  targetType: TargetType,
  targetId: string | number,
  userId: string | number,
  detail?: string,
  userEmail?: string
) {
  try {
    // 如果提供了邮箱，尝试先查询确认这个用户是否存在，并确保邮箱字段是最新的
    if (userEmail) {
      await pool.execute(
        `UPDATE admin_users SET email = ? WHERE id = ?`,
        [userEmail, userId]
      );
    }
    
    const [result] = await pool.execute(
      `INSERT INTO operation_logs (
        user_id, operation_type, target_type, target_id, detail, created_at
      ) VALUES (?, ?, ?, ?, ?, NOW())`,
      [
        userId,
        operationType,
        targetType,
        targetId,
        detail || null
      ]
    );
    
    return (result as any).insertId;
  } catch (error) {
    console.error('记录操作日志失败:', error);
    // 日志记录失败不应该影响主要业务流程，所以这里只记录错误，不抛出异常
    return null;
  }
}

/**
 * 构建操作详情字符串
 * @param operation 操作名称
 * @param targetName 目标名称
 * @param additionalInfo 额外信息
 * @returns 格式化的操作详情字符串
 */
export function buildOperationDetail(
  operation: string,
  targetName: string,
  additionalInfo?: string
): string {
  let detail = `${operation}了会员 ${targetName}`;
  
  if (additionalInfo) {
    detail += `，${additionalInfo}`;
  }
  
  return detail;
} 