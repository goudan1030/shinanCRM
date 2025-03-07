import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

// 删除用户API
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    
    if (!id) {
      return NextResponse.json({ success: false, error: '缺少用户ID' }, { status: 400 });
    }
    
    // 创建数据库连接
    const pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    
    const connection = await pool.getConnection();
    
    try {
      // 开始事务
      await connection.beginTransaction();
      
      // 删除用户
      const [result] = await connection.execute(
        'DELETE FROM users WHERE id = ?',
        [id]
      );
      
      // 提交事务
      await connection.commit();
      
      return NextResponse.json({
        success: true,
        message: '用户删除成功'
      });
    } catch (error) {
      // 回滚事务
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('删除用户失败:', error);
    return NextResponse.json(
      { success: false, error: '删除用户失败' },
      { status: 500 }
    );
  }
} 