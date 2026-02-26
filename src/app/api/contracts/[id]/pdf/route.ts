import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';
import puppeteer from 'puppeteer';
import { existsSync } from 'fs';
import path from 'path';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api/contracts/pdf');

const CHROME_FALLBACK_PATHS = [
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/snap/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
];

const isAbsolutePath = (filePath: string) => {
  return filePath.startsWith('/') || /^[a-zA-Z]:\\/.test(filePath);
};

type ChromeDebugInfo = {
  envCandidates: Array<{
    original?: string;
    resolved?: string;
    exists: boolean;
    skippedReason?: string;
  }>;
  fallbackCandidates: Array<{ path: string; exists: boolean }>;
  puppeteerDefault?: string;
  selected?: string;
};

const resolveExecutablePath = (): { executablePath?: string; debugInfo: ChromeDebugInfo } => {
  const debugInfo: ChromeDebugInfo = {
    envCandidates: [],
    fallbackCandidates: []
  };

  const envPaths = [
    process.env.CHROME_EXECUTABLE_PATH,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROMIUM_PATH,
    process.env.CHROME_PATH,
    process.env.CHROME_BIN
  ].filter((value): value is string => !!value && value.trim().length > 0);

  const fallbackCandidates = CHROME_FALLBACK_PATHS.map(candidatePath => ({
    path: candidatePath,
    exists: existsSync(candidatePath)
  }));
  debugInfo.fallbackCandidates = fallbackCandidates;
  const fallbackPath = fallbackCandidates.find(item => item.exists)?.path;

  for (const candidate of envPaths) {
    const resolved = isAbsolutePath(candidate) ? candidate : path.resolve(candidate);
    const exists = existsSync(resolved);
    const candidateInfo: ChromeDebugInfo['envCandidates'][number] = {
      original: candidate,
      resolved,
      exists
    };

    if (!exists) {
      candidateInfo.skippedReason = 'not_found';
      debugInfo.envCandidates.push(candidateInfo);
      continue;
    }

    if (resolved.includes('.local-chromium') && fallbackPath) {
      candidateInfo.skippedReason = 'bundled_chromium_preempted_by_system';
      debugInfo.envCandidates.push(candidateInfo);
      continue;
    }

    debugInfo.envCandidates.push(candidateInfo);
    debugInfo.selected = resolved;
    return { executablePath: resolved, debugInfo };
  }

  if (fallbackPath) {
    debugInfo.selected = fallbackPath;
    return { executablePath: fallbackPath, debugInfo };
  }

  try {
    const defaultPath = puppeteer.executablePath();
    debugInfo.puppeteerDefault = defaultPath;
    
    // 检查puppeteer默认路径是否存在
    if (defaultPath && existsSync(defaultPath)) {
      debugInfo.selected = defaultPath;
      return { executablePath: defaultPath, debugInfo };
    } else {
      logger.warn('Puppeteer默认路径不存在，尝试下载', { 
        defaultPath,
        error: 'executable not found'
      });
      // 如果默认路径不存在，尝试让puppeteer下载
      // 注意：这需要PUPPETEER_SKIP_DOWNLOAD未设置
      debugInfo.selected = defaultPath;
      return { executablePath: defaultPath, debugInfo };
    }
  } catch (error) {
    logger.warn('未能获取puppeteer自带的Chromium路径', { 
      error: error instanceof Error ? error.message : String(error)
    });
    return { executablePath: undefined, debugInfo };
  }
};

// 生成合同PDF
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let chromeDebugInfo: ChromeDebugInfo | undefined;
  let debug = false;

  try {
    const contractId = parseInt(params.id);
    
    // 获取URL参数，判断是预览还是下载
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'download'; // download | preview
    debug = searchParams.get('debug') === '1';
    const userAgent = request.headers.get('user-agent') || '';
    
    // 检测是否在微信环境
    const isWeChat = userAgent.includes('MicroMessenger');
    const isIOS = userAgent.includes('iPhone') || userAgent.includes('iPad');
    
    logger.info('PDF请求', { contractId, mode, isWeChat, isIOS, userAgent: userAgent.substring(0, 100) });

    if (isNaN(contractId)) {
      return NextResponse.json(
        { error: '无效的合同ID' },
        { status: 400 }
      );
    }

    // 获取合同信息
    const contractResult = await executeQuery(
      'SELECT * FROM contracts WHERE id = ?',
      [contractId]
    );

    logger.debug('合同查询结果', { 
      contractId,
      resultType: Array.isArray(contractResult) ? 'array' : typeof contractResult,
      resultLength: Array.isArray(contractResult) ? contractResult.length : 'N/A'
    });

    // executeQuery返回格式: [rows, fields]
    let contractRows: any[] = [];
    if (Array.isArray(contractResult)) {
      if (contractResult.length === 2 && Array.isArray(contractResult[0])) {
        // 格式: [[rows], fields]
        contractRows = contractResult[0];
      } else if (Array.isArray(contractResult[0])) {
        // 格式: [[rows]]
        contractRows = contractResult[0];
      } else {
        // 格式: [rows]
        contractRows = contractResult;
      }
    }

    if (!contractRows || contractRows.length === 0) {
      logger.error('合同不存在', { contractId });
      return NextResponse.json(
        { error: '合同不存在' },
        { status: 404 }
      );
    }

    const contract = contractRows[0];
    logger.info('找到合同', { id: contract.id, contract_number: contract.contract_number, status: contract.status });

    // 检查合同是否已签署
    if (contract.status !== 'SIGNED') {
      return NextResponse.json(
        { error: '合同尚未签署' },
        { status: 400 }
      );
    }

    const resolveResult = resolveExecutablePath();
    const executablePath = resolveResult.executablePath;
    chromeDebugInfo = resolveResult.debugInfo;
    logger.info('Chromium路径解析', { 
      executablePath: executablePath || 'puppeteer默认内置版本',
      debugInfo: chromeDebugInfo
    });

    if (!executablePath) {
      logger.error('无法找到Chrome/Chromium可执行文件', { contractId, debugInfo: chromeDebugInfo });
      return NextResponse.json(
        {
          error: 'PDF生成失败：无法找到Chrome/Chromium浏览器',
          detail: '服务器未安装Chrome或Chromium浏览器，请联系管理员安装',
          chrome: debug ? chromeDebugInfo : undefined
        },
        { status: 500 }
      );
    }

    // 生成PDF
    logger.info('启动Puppeteer浏览器', { contractId, executablePath });
    let browser;
    try {
      browser = await puppeteer.launch({
      headless: true,
      executablePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--disable-extensions'
        ],
        timeout: 30000 // 30秒超时
      });
      logger.info('浏览器启动成功', { contractId });
    } catch (launchError) {
      logger.error('浏览器启动失败', { 
        contractId, 
        error: launchError instanceof Error ? launchError.message : String(launchError),
        stack: launchError instanceof Error ? launchError.stack : undefined
      });
      return NextResponse.json(
        {
          error: 'PDF生成失败：无法启动浏览器',
          detail: launchError instanceof Error ? launchError.message : '未知错误',
          chrome: debug ? chromeDebugInfo : undefined
        },
        { status: 500 }
      );
    }

    let page;
    try {
      page = await browser.newPage();
      logger.info('页面创建成功', { contractId });
    } catch (pageError) {
      logger.error('创建页面失败', { 
        contractId,
        error: pageError instanceof Error ? pageError.message : String(pageError),
        stack: pageError instanceof Error ? pageError.stack : undefined
      });
      await browser.close();
      return NextResponse.json(
        {
          error: 'PDF生成失败：无法创建页面',
          detail: pageError instanceof Error ? pageError.message : '未知错误'
        },
        { status: 500 }
      );
    }
    
    try {
    // 处理合同内容中的图片路径，转换为绝对URL
      let pdfContent = contract.content || '';
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                   (process.env.NODE_ENV === 'production' ? 'https://admin.xinghun.info' : 'http://localhost:3000');
    
      logger.debug('处理合同内容', { contractId, baseUrl });
      
    // 修复所有图片路径
    pdfContent = pdfContent.replace(/src="\/zhang\.png"/g, `src="${baseUrl}/zhang.png"`);
    pdfContent = pdfContent.replace(/src="\/alipay\.png"/g, `src="${baseUrl}/alipay.png"`);
    
    // 处理签名图片（base64数据）
    pdfContent = pdfContent.replace(/src="data:image\/png;base64,([^"]+)"/g, 'src="data:image/png;base64,$1"');
    
    // 添加中文字体支持，防止乱码
    const htmlWithFonts = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;700&display=swap');
        * {
          font-family: 'Noto Sans SC', 'Microsoft YaHei', 'SimSun', 'Arial Unicode MS', sans-serif !important;
        }
        body {
          font-family: 'Noto Sans SC', 'Microsoft YaHei', 'SimSun', 'Arial Unicode MS', sans-serif !important;
          line-height: 1.6;
          color: #333;
        }
        p, div, span, h1, h2, h3, h4, h5, h6 {
          font-family: 'Noto Sans SC', 'Microsoft YaHei', 'SimSun', 'Arial Unicode MS', sans-serif !important;
        }
      </style>
    </head>
    <body>
      ${pdfContent}
    </body>
    </html>`;
    
      logger.debug('设置页面内容', { contractId });
      await page.setContent(htmlWithFonts, { 
        waitUntil: 'networkidle0',
        timeout: 30000 // 30秒超时
      });
      logger.debug('页面内容加载完成', { contractId });

      logger.info('生成PDF', { contractId });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
        },
        timeout: 30000 // 30秒超时
    });
      logger.info('PDF生成成功', { contractId, size: pdf.length });

    await browser.close();
      logger.debug('浏览器已关闭', { contractId });

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

    logger.debug('PDF响应头', { contractId, headers });

    return new NextResponse(pdf, { headers });
    } catch (pdfError) {
      logger.error('PDF生成过程失败', { 
        contractId,
        error: pdfError instanceof Error ? pdfError.message : String(pdfError),
        stack: pdfError instanceof Error ? pdfError.stack : undefined
      });
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          logger.error('关闭浏览器失败', { 
            contractId,
            error: closeError instanceof Error ? closeError.message : String(closeError)
          });
        }
      }
      const errorMessage = pdfError instanceof Error ? pdfError.message : '未知错误';
      const errorStack = pdfError instanceof Error ? pdfError.stack : undefined;
      return NextResponse.json(
        {
          error: '生成PDF失败',
          detail: debug || process.env.NODE_ENV !== 'production' ? errorMessage : undefined,
          stack: !process.env.NODE_ENV || process.env.NODE_ENV !== 'production' ? errorStack : undefined,
          chrome: debug ? chromeDebugInfo : undefined
        },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('生成PDF失败', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    const errorStack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json(
      {
        error: '生成PDF失败',
        detail: debug || process.env.NODE_ENV !== 'production' ? errorMessage : undefined,
        stack: !process.env.NODE_ENV || process.env.NODE_ENV !== 'production' ? errorStack : undefined,
        chrome: debug ? chromeDebugInfo : undefined
      },
      { status: 500 }
    );
  }
}
