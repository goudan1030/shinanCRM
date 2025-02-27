import { NextResponse } from 'next/server';
import { pool } from '@/lib/mysql';

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    // 获取当前会员信息
    const [memberRows] = await pool.execute(
      'SELECT status FROM members WHERE id = ?',
      [params.id]
    );

    if (!memberRows[0]) {
      return NextResponse.json(
        { error: '会员不存在' },
        { status: 404 }
      );
    }

    // 开始事务
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // 调用存储过程进行逻辑删除
      await connection.execute('CALL delete_member(?)', [params.id]);
      await connection.commit();

      return NextResponse.json({ message: '会员删除成功' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('会员删除失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '会员删除失败' },
      { status: 500 }
    );
  }
}