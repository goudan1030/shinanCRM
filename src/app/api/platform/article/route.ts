import { NextResponse } from 'next/server';
import { executeQuery, testNetlifyConnection } from '@/lib/database-netlify';
import { readFile } from 'fs/promises';
import path from 'path';

// 获取文章列表
export async function GET(request: Request) {
  try {
    console.log('=== 开始获取文章列表 ===');
    
    // 首先测试数据库连接
    const dbConnected = await testNetlifyConnection();
    if (!dbConnected) {
      throw new Error('数据库连接失败');
    }
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const offset = (page - 1) * pageSize;

    console.log('查询参数:', { page, pageSize });

    // 获取总数
    console.log('获取文章总数...');
    const [countResult] = await executeQuery(
      'SELECT COUNT(*) as total FROM articles'
    );
    const total = (countResult as any[])[0].total;
    console.log('文章总数:', total);

    // 获取分页数据
    console.log('获取文章列表...');
    const [rows] = await executeQuery(
      'SELECT * FROM articles ORDER BY is_top DESC, sort_order DESC, created_at DESC LIMIT ? OFFSET ?',
      [pageSize, offset]
    );
    
    console.log('✓ 文章列表查询成功，返回', (rows as any[]).length, '条记录');
    
    return NextResponse.json({
      success: true,
      data: rows,
      total,
      totalPages: Math.ceil(total / pageSize)
    });
  } catch (error) {
    console.error('获取文章列表失败:', error);
    
    // 详细的错误日志
    if (error instanceof Error) {
      console.error('错误详情:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      // 特殊处理数据库连接错误
      if (error.message.includes('connect') || error.message.includes('ECONNREFUSED')) {
        return NextResponse.json(
          { 
            error: 'Database connection failed. Please check server configuration.',
            details: '数据库连接失败，请检查服务器配置'
          },
          { status: 503 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        error: '获取文章列表失败',
        details: error instanceof Error ? error.message : '服务器内部错误'
      },
      { status: 500 }
    );
  }
}

// 新增/更新文章
export async function POST(request: Request) {
  try {
    console.log('=== 开始保存文章 ===');
    
    // 首先测试数据库连接
    const dbConnected = await testNetlifyConnection();
    if (!dbConnected) {
      throw new Error('数据库连接失败');
    }
    
    const data = await request.json();
    
    console.log('文章数据:', { 
      id: data.id, 
      title: data.title,
      hasContent: !!data.content,
      hasCoverUrl: !!data.cover_url 
    });
    
    // 检查图片数据是否存在
    if (!data.cover_url) {
      return NextResponse.json(
        { error: '请上传封面图片' },
        { status: 400 }
      );
    }

    // 如果是相对路径，直接从文件系统读取
    if (data.cover_url.startsWith('/uploads/')) {
      try {
        // 获取图片的完整文件系统路径
        const imagePath = path.join(process.cwd(), 'public', data.cover_url);
        
        // 直接读取文件
        const imageBuffer = await readFile(imagePath);
        
        // 转换为 base64
        const base64Image = imageBuffer.toString('base64');
        
        // 根据文件扩展名确定 MIME 类型
        const ext = path.extname(imagePath).toLowerCase();
        const mimeType = ext === '.png' ? 'image/png' : 
                        ext === '.gif' ? 'image/gif' : 
                        'image/jpeg';
        
        data.cover_url = `data:${mimeType};base64,${base64Image}`;
        console.log('✓ 图片转换为Base64成功');
      } catch (error) {
        console.error('图片读取失败:', error);
        return NextResponse.json(
          { error: '图片读取失败' },
          { status: 400 }
        );
      }
    }

    // 确保图片是 Base64 格式
    if (!data.cover_url.startsWith('data:image/')) {
      return NextResponse.json(
        { error: '图片必须是 Base64 格式' },
        { status: 400 }
      );
    }

    if (data.id) {
      // 更新文章
      console.log('更新文章:', data.id);
      await executeQuery(
        `UPDATE articles SET 
          title = ?,
          cover_url = ?,
          content = ?,
          summary = ?,
          link_url = ?,
          is_hidden = ?,
          is_top = ?,
          sort_order = ?,
          updated_at = NOW()
        WHERE id = ?`,
        [
          data.title,
          data.cover_url,
          data.content,
          data.summary,
          data.link_url,
          data.is_hidden,
          data.is_top,
          data.sort_order,
          data.id
        ]
      );
      console.log('✓ 文章更新成功');
      return NextResponse.json({ success: true });
    }

    // 新增文章
    console.log('新增文章:', data.title);
    const [result] = await executeQuery(
      `INSERT INTO articles (
        title, cover_url, content, summary, link_url,
        is_hidden, is_top, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        data.title,
        data.cover_url,
        data.content,
        data.summary,
        data.link_url,
        data.is_hidden,
        data.is_top,
        data.sort_order
      ]
    );

    const insertId = (result as any).insertId;
    console.log('✓ 文章创建成功:', { insertId });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('保存文章失败:', error);
    
    // 详细的错误日志
    if (error instanceof Error) {
      console.error('错误详情:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : '保存失败',
        details: error instanceof Error ? error.message : '服务器内部错误'
      },
      { status: 500 }
    );
  }
} // 强制更新于 Mon Mar  3 13:33:04 CST 2025
