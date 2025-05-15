import { NextResponse } from 'next/server';
import pool from '../../../../../lib/mysql';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { membersCache } from '../../../../../lib/cache';

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const startTime = Date.now(); // 记录开始时间
  
  try {
    // 获取会员ID
    const memberId = params.id;
    
    // 先检查会员是否存在
    const [checkResult] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM members WHERE id = ?',
      [memberId]
    );
    
    if (!checkResult || checkResult.length === 0) {
      return NextResponse.json(
        { error: '会员不存在或已被删除' },
        { status: 404 }
      );
    }
    
    // 使用软删除方式标记会员为已删除
    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE members SET deleted = TRUE, updated_at = NOW() WHERE id = ?',
      [memberId]
    );
    
    // 检查是否有记录被更新
    if (!result || result.affectedRows === 0) {
      return NextResponse.json(
        { error: '会员删除失败' },
        { status: 500 }
      );
    }
    
    // 尝试记录操作日志 - 使用单独连接，不阻塞主操作
    try {
      setTimeout(async () => {
        const logConnection = await pool.getConnection();
        try {
          await logConnection.execute(
            `INSERT INTO member_operation_logs (
              member_id, operation_type, notes, created_at
            ) VALUES (?, 'DELETE', ?, NOW())`,
            [memberId, '会员已删除']
          );
        } catch (logError) {
          console.warn('无法记录操作日志:', logError);
        } finally {
          logConnection.release();
        }
      }, 0);
    } catch (logSetupError) {
      console.warn('设置日志记录失败:', logSetupError);
    }
    
    // 清除所有相关缓存，确保前端显示最新数据
    const cacheKeys = membersCache.keys();
    const relevantKeys = cacheKeys.filter(key => key.startsWith('members_list_'));
    
    // 清除所有相关缓存键，而不仅仅是前5个
    relevantKeys.forEach(key => {
      membersCache.delete(key);
    });
    
    const endTime = Date.now(); // 记录结束时间
    const executionTime = endTime - startTime;
    
    return NextResponse.json({ 
      message: '会员删除成功',
      member_id: memberId,
      execution_time_ms: executionTime
    });
  } catch (error) {
    console.error('会员删除失败:', error);
    
    const endTime = Date.now();
    const executionTime = endTime - startTime;
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : '会员删除失败',
        execution_time_ms: executionTime
      },
      { status: 500 }
    );
  }
}