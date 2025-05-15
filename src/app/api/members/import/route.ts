import { NextResponse } from 'next/server';
import pool from '../../../../lib/mysql';
import { membersCache } from '../../../../lib/cache';

export async function POST(request: Request) {
  try {
    // 获取上传的文件内容
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: '未上传文件' }, { status: 400 });
    }
    
    // 检查文件类型
    if (!file.name.endsWith('.csv') && !file.type.includes('csv')) {
      return NextResponse.json({ error: '仅支持CSV文件格式' }, { status: 400 });
    }
    
    // 读取文件内容
    const fileContent = await file.text();
    const lines = fileContent.split('\n');
    
    // 检查文件内容
    if (lines.length < 2) {
      return NextResponse.json({ error: '文件内容不正确或为空' }, { status: 400 });
    }
    
    // 解析标题行
    const headers = lines[0].split(',').map(header => header.trim());
    
    // 验证必要的标题
    const requiredFields = ['会员编号', '微信号', '手机号'];
    for (const field of requiredFields) {
      if (!headers.includes(field)) {
        return NextResponse.json({ 
          error: `CSV文件缺少必要字段: ${field}`,
          details: `请确保CSV文件包含以下必要字段: ${requiredFields.join(', ')}`
        }, { status: 400 });
      }
    }
    
    // 获取字段索引
    const fieldIndexMap = {
      member_no: headers.indexOf('会员编号'),
      wechat: headers.indexOf('微信号'),
      phone: headers.indexOf('手机号'),
      type: headers.indexOf('会员类型'),
      gender: headers.indexOf('性别'),
      birth_year: headers.indexOf('出生年份'),
      height: headers.indexOf('身高'),
      weight: headers.indexOf('体重'),
      education: headers.indexOf('学历'),
      occupation: headers.indexOf('职业'),
      income: headers.indexOf('收入'),
      province: headers.indexOf('省份'),
      city: headers.indexOf('城市'),
      district: headers.indexOf('区县'),
      target_area: headers.indexOf('目标区域'),
      house_car: headers.indexOf('房车情况'),
      hukou_province: headers.indexOf('户口省份'),
      hukou_city: headers.indexOf('户口城市'),
      children_plan: headers.indexOf('子女计划'),
      marriage_cert: headers.indexOf('领证要求'),
      marriage_history: headers.indexOf('婚姻历史'),
      sexual_orientation: headers.indexOf('性取向'),
      self_description: headers.indexOf('自我描述'),
      partner_requirement: headers.indexOf('伴侣要求')
    };
    
    // 开始数据导入
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // 跳过标题行，处理数据行
      const dataRows = lines.slice(1).filter(line => line.trim().length > 0);
      let successCount = 0;
      let failureCount = 0;
      const errors = [];
      
      for (let i = 0; i < dataRows.length; i++) {
        try {
          // 解析CSV行，考虑引号内包含逗号的情况
          let row = [];
          let field = '';
          let inQuotes = false;
          
          for (let j = 0; j < dataRows[i].length; j++) {
            const char = dataRows[i][j];
            
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              row.push(field);
              field = '';
            } else {
              field += char;
            }
          }
          row.push(field); // 添加最后一个字段
          
          // 获取必要字段值
          const member_no = row[fieldIndexMap.member_no]?.trim();
          const wechat = row[fieldIndexMap.wechat]?.trim();
          const phone = row[fieldIndexMap.phone]?.trim();
          
          // 验证必要字段
          if (!member_no || !wechat || !phone) {
            failureCount++;
            errors.push(`第${i + 2}行: 缺少必要字段 (会员编号/微信号/手机号)`);
            continue;
          }
          
          // 转换会员类型
          let memberType = 'NORMAL';
          if (fieldIndexMap.type >= 0) {
            const typeText = row[fieldIndexMap.type]?.trim();
            if (typeText.includes('一次性') || typeText.includes('单次')) {
              memberType = 'ONE_TIME';
            } else if (typeText.includes('年费')) {
              memberType = 'ANNUAL';
            }
          }
          
          // 转换性别
          let gender = null;
          if (fieldIndexMap.gender >= 0) {
            const genderText = row[fieldIndexMap.gender]?.trim();
            if (genderText === '男') gender = 'male';
            if (genderText === '女') gender = 'female';
          }
          
          // 转换学历
          let education = null;
          if (fieldIndexMap.education >= 0) {
            const educationText = row[fieldIndexMap.education]?.trim();
            if (educationText.includes('高中')) education = 'HIGH_SCHOOL';
            else if (educationText.includes('大专')) education = 'COLLEGE';
            else if (educationText.includes('本科')) education = 'BACHELOR';
            else if (educationText.includes('硕士')) education = 'MASTER';
            else if (educationText.includes('博士')) education = 'PHD';
          }
          
          // 构建插入参数
          const params = [
            member_no,
            null, // nickname
            wechat,
            phone,
            memberType,
            gender,
            fieldIndexMap.birth_year >= 0 ? parseInt(row[fieldIndexMap.birth_year]) || null : null,
            fieldIndexMap.height >= 0 ? parseInt(row[fieldIndexMap.height]) || null : null,
            fieldIndexMap.weight >= 0 ? parseInt(row[fieldIndexMap.weight]) || null : null,
            education,
            fieldIndexMap.occupation >= 0 ? row[fieldIndexMap.occupation]?.trim() || null : null,
            fieldIndexMap.province >= 0 ? row[fieldIndexMap.province]?.trim() || null : null,
            fieldIndexMap.city >= 0 ? row[fieldIndexMap.city]?.trim() || null : null,
            fieldIndexMap.district >= 0 ? row[fieldIndexMap.district]?.trim() || null : null,
            fieldIndexMap.target_area >= 0 ? row[fieldIndexMap.target_area]?.trim() || null : null,
            fieldIndexMap.house_car >= 0 ? row[fieldIndexMap.house_car]?.trim() || null : null,
            fieldIndexMap.hukou_province >= 0 ? row[fieldIndexMap.hukou_province]?.trim() || null : null,
            fieldIndexMap.hukou_city >= 0 ? row[fieldIndexMap.hukou_city]?.trim() || null : null,
            fieldIndexMap.children_plan >= 0 ? row[fieldIndexMap.children_plan]?.trim() || null : null,
            fieldIndexMap.marriage_cert >= 0 ? row[fieldIndexMap.marriage_cert]?.trim() || null : null,
            fieldIndexMap.marriage_history >= 0 ? row[fieldIndexMap.marriage_history]?.trim() || null : null,
            fieldIndexMap.sexual_orientation >= 0 ? row[fieldIndexMap.sexual_orientation]?.trim() || null : null,
            fieldIndexMap.self_description >= 0 ? row[fieldIndexMap.self_description]?.trim() || null : null,
            fieldIndexMap.partner_requirement >= 0 ? row[fieldIndexMap.partner_requirement]?.trim() || null : null,
            'ACTIVE', // 设置默认状态为激活
            gender === 'female' ? 1 : 0, // 女性默认1次匹配机会，男性0次
          ];
          
          // 执行插入
          await connection.execute(
            `INSERT INTO members (
              member_no, nickname, wechat, phone, type,
              gender, birth_year, height, weight,
              education, occupation, province, city, district,
              target_area, house_car, hukou_province, hukou_city,
              children_plan, marriage_cert, marriage_history,
              sexual_orientation, self_description, partner_requirement,
              status, remaining_matches, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            params
          );
          
          successCount++;
        } catch (rowError) {
          failureCount++;
          errors.push(`第${i + 2}行: ${rowError.message}`);
        }
      }
      
      // 提交事务
      await connection.commit();
      
      // 清除缓存
      const cacheKeys = membersCache.keys();
      cacheKeys.forEach(key => {
        if (key.startsWith('members_list_')) {
          membersCache.delete(key);
        }
      });
      
      return NextResponse.json({
        success: true,
        message: `导入完成，成功: ${successCount} 条，失败: ${failureCount} 条`,
        details: {
          total: dataRows.length,
          success: successCount,
          failure: failureCount,
          errors: errors.slice(0, 10) // 只返回前10个错误信息
        }
      });
      
    } catch (error) {
      // 回滚事务
      await connection.rollback();
      throw error;
    } finally {
      // 释放连接
      connection.release();
    }
    
  } catch (error) {
    console.error('会员导入失败:', error);
    return NextResponse.json(
      { 
        error: '会员导入失败', 
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
} 