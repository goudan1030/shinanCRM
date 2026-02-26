import { NextResponse } from 'next/server';
import pool from '../../../../lib/mysql';
import { RowDataPacket } from 'mysql2';

export async function GET(request: Request) {
  try {
    // 获取请求参数
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const searchTerm = searchParams.get('search');
    const gender = searchParams.get('gender');
    const type = searchParams.get('type');
    
    // 构建查询条件
    let baseQuery = `
      SELECT 
        member_no, wechat, phone, 
        type, status, gender, birth_year, 
        height, weight, education, occupation,
        province, city, district, target_area,
        house_car, hukou_province, hukou_city,
        children_plan, marriage_cert, marriage_history,
        sexual_orientation, self_description, partner_requirement,
        remaining_matches, created_at, updated_at
      FROM members 
      WHERE (deleted IS NULL OR deleted = FALSE)
    `;
    
    const queryParams = [];
    
    // 添加筛选条件
    if (status) {
      baseQuery += ` AND status = ?`;
      queryParams.push(status);
    }
    
    if (gender) {
      baseQuery += ` AND gender = ?`;
      queryParams.push(gender);
    }
    
    if (type) {
      baseQuery += ` AND type = ?`;
      queryParams.push(type);
    }
    
    // 添加搜索条件
    if (searchTerm) {
      baseQuery += ` AND (member_no LIKE ? OR wechat LIKE ? OR phone LIKE ?)`;
      const searchPattern = `%${searchTerm}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern);
    }
    
    // 排序
    baseQuery += ` ORDER BY created_at DESC`;
    
    // 执行查询
    const [rows] = await executeQuery<RowDataPacket[]>(baseQuery, queryParams);
    
    // 生成CSV标题行
    const headers = [
      '会员编号', '微信号', '手机号', '会员类型', '状态', '性别', '出生年份',
      '身高', '体重', '学历', '职业', '省份', '城市', '区县',
      '目标区域', '房车情况', '户口省份', '户口城市', '子女计划',
      '领证要求', '婚姻历史', '性取向', '自我描述', '伴侣要求',
      '剩余匹配次数', '创建时间', '更新时间'
    ];
    
    // 转换数据行
    const dataRows = (rows as RowDataPacket[]).map(row => {
      // 会员类型转换
      let typeText = '普通会员';
      if (row.type === 'ONE_TIME') typeText = '单次会员';
      if (row.type === 'ANNUAL') typeText = '年费会员';
      
      // 状态转换
      let statusText = '未知';
      if (row.status === 'ACTIVE') statusText = '活跃';
      if (row.status === 'INACTIVE') statusText = '已停用';
      
      // 性别转换
      let genderText = '';
      if (row.gender === 'male') genderText = '男';
      if (row.gender === 'female') genderText = '女';
      
      // 生成CSV行数据
      return [
        row.member_no,
        row.wechat,
        row.phone,
        typeText,
        statusText,
        genderText,
        row.birth_year || '',
        row.height || '',
        row.weight || '',
        row.education || '',
        row.occupation || '',
        row.province || '',
        row.city || '',
        row.district || '',
        row.target_area || '',
        row.house_car || '',
        row.hukou_province || '',
        row.hukou_city || '',
        row.children_plan || '',
        row.marriage_cert || '',
        row.marriage_history || '',
        row.sexual_orientation || '',
        row.self_description || '',
        row.partner_requirement || '',
        row.remaining_matches || '0',
        row.created_at ? new Date(row.created_at).toLocaleString('zh-CN') : '',
        row.updated_at ? new Date(row.updated_at).toLocaleString('zh-CN') : ''
      ];
    });
    
    // 将所有行合并为CSV
    const csvContent = [
      headers.join(','),
      ...dataRows.map(row => row.map(cell => {
        // 处理可能包含逗号、引号或换行符的单元格
        if (cell && typeof cell === 'string') {
          if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
        }
        return cell;
      }).join(','))
    ].join('\n');
    
    // 创建响应
    const response = new NextResponse(csvContent);
    
    // 设置响应头，指示这是一个CSV文件下载
    response.headers.set('Content-Type', 'text/csv; charset=utf-8');
    response.headers.set('Content-Disposition', `attachment; filename=members-export-${new Date().toISOString().slice(0, 10)}.csv`);
    
    return response;
    
  } catch (error) {
    console.error('导出会员数据失败:', error);
    return NextResponse.json(
      { error: '导出会员数据失败', details: error.message },
      { status: 500 }
    );
  }
} 