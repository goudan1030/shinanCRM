/**
 * 会员数据导出功能测试脚本
 * 
 * 本脚本用于测试会员数据导出API的正确性
 * 运行方式: node scripts/test-export.js
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// 配置项
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
const OUTPUT_DIR = path.join(__dirname, '../temp');

// 确保输出目录存在
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * 测试不同条件下的会员导出功能
 */
async function testExport() {
  console.log('开始测试会员数据导出功能...');
  
  const testCases = [
    { name: '所有会员', params: {} },
    { name: '活跃会员', params: { status: 'ACTIVE' } },
    { name: '男性会员', params: { gender: 'male' } },
    { name: '女性会员', params: { gender: 'female' } },
    { name: '普通会员', params: { type: 'NORMAL' } },
    { name: '一次性会员', params: { type: 'ONE_TIME' } },
    { name: '年费会员', params: { type: 'ANNUAL' } },
    { name: '搜索会员', params: { search: 'test' } },
  ];
  
  for (const testCase of testCases) {
    try {
      console.log(`测试导出 ${testCase.name}...`);
      
      // 构建查询参数
      const queryParams = new URLSearchParams(testCase.params);
      const exportUrl = `${API_BASE_URL}/members/export?${queryParams}`;
      
      // 发送请求
      const response = await fetch(exportUrl);
      
      // 检查响应状态
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`导出 ${testCase.name} 失败: ${response.status} ${response.statusText}`);
        
        // 尝试解析错误响应
        try {
          const errorJson = JSON.parse(errorText);
          console.error(`错误详情: ${errorJson.error || errorJson.details || errorText}`);
          
          if (errorJson.details) {
            console.error(`错误原因: ${errorJson.details}`);
          }
        } catch (e) {
          console.error(`错误详情: ${errorText}`);
        }
        
        continue;
      }
      
      // 检查内容类型
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('text/csv')) {
        console.error(`导出 ${testCase.name} 错误: 内容类型不正确 (${contentType})`);
        continue;
      }
      
      // 检查内容处置
      const contentDisposition = response.headers.get('content-disposition');
      if (!contentDisposition || !contentDisposition.includes('attachment')) {
        console.error(`导出 ${testCase.name} 错误: 内容处置不正确 (${contentDisposition})`);
        continue;
      }
      
      // 保存响应内容到文件
      const csvContent = await response.text();
      const fileName = `members-export-${testCase.name.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`;
      const filePath = path.join(OUTPUT_DIR, fileName);
      
      fs.writeFileSync(filePath, csvContent, 'utf8');
      console.log(`成功导出 ${testCase.name} 到文件: ${filePath}`);
      
      // 检查CSV文件头
      const lines = csvContent.split('\n');
      if (lines.length < 2) {
        console.warn(`导出 ${testCase.name} 警告: CSV文件只有标题行或为空`);
        continue;
      }
      
      const headers = lines[0].split(',');
      const requiredHeaders = ['会员编号', '微信号', '手机号'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      
      if (missingHeaders.length > 0) {
        console.error(`导出 ${testCase.name} 错误: CSV标题行缺少必要字段: ${missingHeaders.join(', ')}`);
        continue;
      }
      
      console.log(`导出 ${testCase.name} 成功，包含 ${lines.length - 1} 条记录`);
      
    } catch (error) {
      console.error(`导出 ${testCase.name} 异常:`, error);
    }
  }
  
  console.log('会员数据导出功能测试完成');
}

// 执行测试
testExport().catch(error => {
  console.error('测试过程中发生错误:', error);
  process.exit(1);
}); 