import { NextResponse } from 'next/server';

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
    
    // 将文件内容转换为Base64编码
    const base64Data = buffer.toString('base64');
    
    // 构建完整的data URI格式
    const dataUri = `data:${file.type};base64,${base64Data}`;

    return NextResponse.json({
      success: true,
      url: dataUri
    });

  } catch (error) {
    console.error('群聊二维码上传失败:', error);
    return NextResponse.json(
      { success: false, error: '群聊二维码上传失败' },
      { status: 500 }
    );
  }
} 