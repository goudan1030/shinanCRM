import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';
import puppeteer from 'puppeteer';

// 生成合同PDF
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contractId = parseInt(params.id);
    
    // 获取URL参数，判断是预览还是下载
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'download'; // download | preview
    const userAgent = request.headers.get('user-agent') || '';
    
    // 检测是否在微信环境
    const isWeChat = userAgent.includes('MicroMessenger');
    const isIOS = userAgent.includes('iPhone') || userAgent.includes('iPad');
    
    console.log('PDF请求信息:', { mode, isWeChat, isIOS, userAgent: userAgent.substring(0, 100) });

    if (isNaN(contractId)) {
      return NextResponse.json(
        { error: '无效的合同ID' },
        { status: 400 }
      );
    }

    // 获取合同信息
    const [contractRows] = await executeQuery(
      'SELECT * FROM contracts WHERE id = ?',
      [contractId]
    );

    if (!contractRows || contractRows.length === 0) {
      return NextResponse.json(
        { error: '合同不存在' },
        { status: 404 }
      );
    }

    const contract = contractRows[0];

    // 检查合同是否已签署
    if (contract.status !== 'SIGNED') {
      return NextResponse.json(
        { error: '合同尚未签署' },
        { status: 400 }
      );
    }

    // 生成PDF
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: '/usr/bin/chromium-browser', // 使用系统安装的Chrome
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    // 处理合同内容中的图片路径，转换为绝对URL
    let pdfContent = contract.content;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                   (process.env.NODE_ENV === 'production' ? 'https://admin.xinghun.info' : 'http://localhost:3000');
    
    // 修复所有图片路径
    pdfContent = pdfContent.replace(/src="\/zhang\.png"/g, `src="${baseUrl}/zhang.png"`);
    pdfContent = pdfContent.replace(/src="\/alipay\.png"/g, `src="${baseUrl}/alipay.png"`);
    
    // 处理签名图片（base64数据）
    pdfContent = pdfContent.replace(/src="data:image\/png;base64,([^"]+)"/g, 'src="data:image/png;base64,$1"');
    
    await page.setContent(pdfContent, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      }
    });

    await browser.close();

    // 根据模式和环境设置不同的响应头
    const filename = `contract-${contract.contract_number}.pdf`;
    let headers: Record<string, string> = {
      'Content-Type': 'application/pdf',
      'Cache-Control': 'no-cache',
      'Content-Length': pdf.length.toString()
    };

    if (mode === 'preview' || isWeChat) {
      // 预览模式或微信环境：在浏览器中直接显示PDF
      headers['Content-Disposition'] = `inline; filename="${filename}"`;
      
      // 为微信环境添加特殊头部
      if (isWeChat) {
        headers['X-Content-Type-Options'] = 'nosniff';
        headers['X-Frame-Options'] = 'SAMEORIGIN';
      }
    } else {
      // 下载模式：触发文件下载
      headers['Content-Disposition'] = `attachment; filename="${filename}"`;
      
      // iOS Safari 特殊处理
      if (isIOS) {
        headers['Content-Disposition'] = `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
      }
    }

    console.log('PDF响应头:', headers);

    return new NextResponse(pdf, { headers });
  } catch (error) {
    console.error('生成PDF失败:', error);
    return NextResponse.json(
      { error: '生成PDF失败' },
      { status: 500 }
    );
  }
}
