import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';
import puppeteer from 'puppeteer';

// 生成合同PDF
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contractId = parseInt(params.id);

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
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(contract.content, { waitUntil: 'networkidle0' });

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

    // 返回PDF文件
    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="contract-${contract.contract_number}.pdf"`,
        'Cache-Control': 'no-cache'
      }
    });
  } catch (error) {
    console.error('生成PDF失败:', error);
    return NextResponse.json(
      { error: '生成PDF失败' },
      { status: 500 }
    );
  }
}
