import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/mysql';

/**
 * 企业微信交互查询功能测试API
 * POST /api/wecom/message-test
 */
export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();
    
    if (!message) {
      return NextResponse.json({
        success: false,
        error: '请提供测试消息内容'
      }, { status: 400 });
    }

    console.log('测试消息:', message);

    // 测试会员编号识别
    const memberNumber = extractMemberNumber(message);
    
    const result: any = {
      inputMessage: message,
      extractedMemberNumber: memberNumber,
      timestamp: new Date().toISOString()
    };

    if (memberNumber) {
      // 测试数据库查询
      try {
        const memberInfo = await getMemberByNumber(memberNumber);
        result.queryResult = memberInfo ? {
          found: true,
          memberInfo: {
            id: memberInfo.id,
            member_no: memberInfo.member_no,
            gender: memberInfo.gender,
            status: memberInfo.status,
            type: memberInfo.type,
            created_at: memberInfo.created_at
          }
        } : {
          found: false,
          message: '未找到对应会员'
        };
      } catch (error) {
        result.queryResult = {
          error: error instanceof Error ? error.message : '查询出错'
        };
      }
    } else {
      result.queryResult = {
        message: '未识别到会员编号，将显示帮助信息'
      };
    }

    return NextResponse.json({
      success: true,
      result: result
    });

  } catch (error) {
    console.error('测试API出错:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '测试失败'
    }, { status: 500 });
  }
}

/**
 * 智能识别会员编号（与主API相同的逻辑）
 */
function extractMemberNumber(text: string): string | null {
  // 匹配各种可能的会员编号格式
  const patterns = [
    /M\d+/i,           // M17071, M12345
    /\b\d{4,6}\b/,     // 10921, 12345
    /\b\d{1,2}[A-Z]\d+/i, // 1A123, 2B456
    /[A-Z]\d{4,}/i     // A1234, B5678
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0].toUpperCase();
    }
  }
  
  return null;
}

/**
 * 根据编号查询会员信息（与主API相同的逻辑）
 */
async function getMemberByNumber(memberNumber: string): Promise<any> {
  try {
    // 支持多种查询方式
    const queries = [
      'SELECT * FROM members WHERE member_no = ? AND deleted = 0',
      'SELECT * FROM members WHERE UPPER(member_no) = ? AND deleted = 0',
      'SELECT * FROM members WHERE id = ? AND deleted = 0'
    ];
    
    for (const query of queries) {
      const [rows] = await pool.execute(query, [memberNumber]);
      const members = rows as any[];
      
      if (members.length > 0) {
        return members[0];
      }
    }
    
    return null;
  } catch (error) {
    console.error('查询会员信息出错:', error);
    throw error;
  }
} 