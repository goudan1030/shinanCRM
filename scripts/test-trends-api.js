const mysql = require('mysql2/promise');

async function testTrendsAPI() {
  const connection = await mysql.createConnection({
    host: '8.149.244.105',
    port: 3306,
    user: 'h5_cloud_user',
    password: 'mc72TNcMmy6HCybH',
    database: 'h5_cloud_db',
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('=== 测试修复后的趋势API查询逻辑 ===');
    
    // 测试会员趋势查询（修复后的逻辑）
    const [memberTrend] = await connection.execute(`
      SELECT 
        DATE_FORMAT(created_at, '%m月%d日') as date, 
        DATE_FORMAT(created_at, '%Y-%m-%d') as date_raw,
        COUNT(*) as value
      FROM members
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY MONTH(created_at), DAY(created_at), DATE_FORMAT(created_at, '%m月%d日'), DATE_FORMAT(created_at, '%Y-%m-%d')
      ORDER BY MONTH(created_at) DESC, DAY(created_at) DESC
      LIMIT 50
    `);
    
    console.log('\n会员趋势查询结果:');
    if (memberTrend.length === 0) {
      console.log('没有找到最近30天的会员数据');
    } else {
      memberTrend.forEach(record => {
        console.log(`${record.date} (${record.date_raw}): ${record.value}人`);
      });
    }
    
    // 测试收入趋势查询（修复后的逻辑）
    const [incomeTrend] = await connection.execute(`
      SELECT 
        DATE_FORMAT(payment_date, '%m月%d日') as date,
        DATE_FORMAT(payment_date, '%Y-%m-%d') as date_raw,
        COALESCE(SUM(amount), 0) as value
      FROM income_records
      WHERE payment_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY MONTH(payment_date), DAY(payment_date), DATE_FORMAT(payment_date, '%m月%d日'), DATE_FORMAT(payment_date, '%Y-%m-%d')
      ORDER BY MONTH(payment_date) DESC, DAY(payment_date) DESC
      LIMIT 50
    `);
    
    console.log('\n收入趋势查询结果:');
    if (incomeTrend.length === 0) {
      console.log('没有找到最近30天的收入数据');
    } else {
      incomeTrend.forEach(record => {
        console.log(`${record.date} (${record.date_raw}): ¥${record.value}`);
      });
    }
    
    // 检查日期范围
    const [dateRange] = await connection.execute(`
      SELECT 
        MIN(created_at) as earliest_member,
        MAX(created_at) as latest_member,
        MIN(payment_date) as earliest_income,
        MAX(payment_date) as latest_income
      FROM (
        SELECT created_at, NULL as payment_date FROM members WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        UNION ALL
        SELECT NULL as created_at, payment_date FROM income_records WHERE payment_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      ) as combined
    `);
    
    console.log('\n数据日期范围:');
    console.log(`会员数据: ${dateRange[0].earliest_member} 至 ${dateRange[0].latest_member}`);
    console.log(`收入数据: ${dateRange[0].earliest_income} 至 ${dateRange[0].latest_income}`);
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await connection.end();
  }
}

testTrendsAPI(); 