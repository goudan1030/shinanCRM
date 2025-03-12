import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    const data = await request.formData();
    const file = data.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: '请选择文件' },
        { status: 400 }
      );
    }

    // 验证文件类型
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: '文件类型不支持，请上传图片文件' },
        { status: 400 }
      );
    }

    // 验证文件大小（2MB）
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: '图片大小不能超过2MB' },
        { status: 400 }
      );
    }

    // 获取文件的字节数据
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 生成唯一的文件名
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const filename = `${uniqueSuffix}-${file.name}`;

    // 确保上传目录存在
    const uploadDir = path.join(process.cwd(), 'public/uploads/chatgroups');
    await ensureDir(uploadDir);

    // 写入文件
    const filepath = path.join(uploadDir, filename);
    await writeFile(filepath, buffer);

    // 返回可访问的URL
    const imageUrl = `/uploads/chatgroups/${filename}`;

    return NextResponse.json({
      success: true,
      url: imageUrl
    });

  } catch (error) {
    console.error('群聊二维码上传失败:', error);
    return NextResponse.json(
      { success: false, error: '群聊二维码上传失败' },
      { status: 500 }
    );
  }
}

// 确保目录存在的辅助函数
async function ensureDir(dirPath: string) {
  try {
    await import('fs/promises').then(fs => fs.mkdir(dirPath, { recursive: true }));
  } catch (error) {
    if ((error as any).code !== 'EEXIST') {
      throw error;
    }
  }
} 