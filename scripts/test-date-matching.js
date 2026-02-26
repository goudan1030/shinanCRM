// 测试日期匹配问题
function testDateMatching() {
  console.log('=== 测试日期匹配问题 ===');
  
  // 模拟数据库查询结果
  const dbResults = [
    { date: '08月04日', date_raw: '2025-08-04', value: 1 },
    { date: '08月03日', date_raw: '2025-08-03', value: 4 },
    { date: '08月02日', date_raw: '2025-08-02', value: 1 },
    { date: '08月01日', date_raw: '2025-08-01', value: 2 },
    { date: '07月31日', date_raw: '2025-07-31', value: 1 },
    { date: '07月30日', date_raw: '2025-07-30', value: 1 },
    { date: '07月29日', date_raw: '2025-07-29', value: 2 },
    { date: '07月28日', date_raw: '2025-07-28', value: 1 },
    { date: '07月26日', date_raw: '2025-07-26', value: 2 },
    { date: '07月25日', date_raw: '2025-07-25', value: 2 },
    { date: '07月24日', date_raw: '2025-07-24', value: 2 },
    { date: '07月23日', date_raw: '2025-07-23', value: 2 },
    { date: '07月22日', date_raw: '2025-07-22', value: 2 },
    { date: '07月21日', date_raw: '2025-07-21', value: 3 },
    { date: '07月19日', date_raw: '2025-07-19', value: 1 },
    { date: '07月17日', date_raw: '2025-07-17', value: 1 },
    { date: '07月15日', date_raw: '2025-07-15', value: 2 },
    { date: '07月14日', date_raw: '2025-07-14', value: 1 },
    { date: '07月13日', date_raw: '2025-07-13', value: 1 },
    { date: '07月11日', date_raw: '2025-07-11', value: 1 },
    { date: '07月10日', date_raw: '2025-07-10', value: 2 },
    { date: '07月08日', date_raw: '2025-07-08', value: 1 },
    { date: '07月07日', date_raw: '2025-07-07', value: 5 }
  ];
  
  // 模拟生成的日期映射（修复后的格式）
  const trends = new Map();
  const now = new Date('2025-08-04');
  
  for (let i = 0; i < 30; i++) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    date.setHours(0, 0, 0, 0);
    
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    // 格式化为"MM月DD日"，确保与SQL查询结果一致 (带前导零)
    const dateStr = `${String(month).padStart(2, '0')}月${String(day).padStart(2, '0')}日`;
    
    trends.set(dateStr, {
      month: dateStr,
      memberValue: 0,
      incomeValue: 0,
      rawDate: date.toISOString().split('T')[0]
    });
  }
  
  console.log('生成的日期映射(前10个):', Array.from(trends.keys()).slice(0, 10));
  console.log('数据库结果(前10个):', dbResults.slice(0, 10).map(item => item.date));
  
  // 测试匹配
  let matchCount = 0;
  let totalCount = 0;
  
  dbResults.forEach(item => {
    totalCount++;
    if (trends.has(item.date)) {
      matchCount++;
      trends.get(item.date).memberValue = Number(item.value);
      console.log(`✅ 匹配成功: ${item.date} = ${item.value}`);
    } else {
      console.log(`❌ 匹配失败: ${item.date} (原始: ${item.date_raw})`);
    }
  });
  
  console.log(`\n匹配统计: ${matchCount}/${totalCount} 成功匹配`);
  
  // 检查最终结果
  const result = Array.from(trends.values()).reverse();
  const hasData = result.some(item => item.memberValue > 0);
  
  console.log(`\n最终结果: ${hasData ? '有数据' : '无数据'}`);
  console.log('前5个结果:', result.slice(0, 5).map(item => `${item.month}: ${item.memberValue}`));
}

testDateMatching(); 