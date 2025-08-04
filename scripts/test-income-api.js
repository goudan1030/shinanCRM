const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testIncomeAPI() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('=== 测试收入API月份筛选功能 ===');
  
  // 测试不同的筛选条件
  const testCases = [
    { name: '全部数据', params: 'month=all&year=all' },
    { name: '1月份数据', params: 'month=1&year=all' },
    { name: '2月份数据', params: 'month=2&year=all' },
    { name: '6月份数据', params: 'month=6&year=all' },
    { name: '2025年1月数据', params: 'month=1&year=2025' },
    { name: '2025年6月数据', params: 'month=6&year=2025' },
  ];
  
  for (const testCase of testCases) {
    try {
      console.log(`\n测试: ${testCase.name}`);
      const url = `${baseUrl}/api/finance/income/list?page=1&pageSize=5&${testCase.params}`;
      console.log(`请求URL: ${url}`);
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (response.ok) {
        console.log(`✅ 成功 - 记录数: ${data.records?.length || 0}, 总数: ${data.total || 0}`);
        if (data.records && data.records.length > 0) {
          console.log(`   第一条记录: ${data.records[0].member_no} - ${data.records[0].payment_date} - ¥${data.records[0].amount}`);
        }
      } else {
        console.log(`❌ 失败 - ${data.error || '未知错误'}`);
      }
    } catch (error) {
      console.log(`❌ 请求失败: ${error.message}`);
    }
  }
}

testIncomeAPI(); 