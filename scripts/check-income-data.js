// 查询收入数据脚本
const mysql = require('mysql2/promise');

async function checkIncomeData() {
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
    console.log('=== 检查收入记录数据 ===');
    
    // 1. 检查总记录数
    const [totalResult] = await connection.execute('SELECT COUNT(*) as total FROM income_records');
    console.log(`总记录数: ${totalResult[0].total}`);
    
    // 2. 检查最近的几条记录
    const [recentRecords] = await connection.execute(`
      SELECT id, member_no, payment_date, payment_method, amount, created_at 
      FROM income_records 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    console.log('\n最近的5条记录:');
    recentRecords.forEach(record => {
      console.log(`ID: ${record.id}, 会员: ${record.member_no}, 支付日期: ${record.payment_date}, 金额: ${record.amount}`);
    });
    
    // 3. 检查按月份分布
    const [monthlyStats] = await connection.execute(`
      SELECT 
        MONTH(payment_date) as month,
        YEAR(payment_date) as year,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM income_records 
      GROUP BY YEAR(payment_date), MONTH(payment_date)
      ORDER BY year DESC, month DESC
      LIMIT 12
    `);
    console.log('\n按月份分布:');
    monthlyStats.forEach(stat => {
      console.log(`${stat.year}年${stat.month}月: ${stat.count}条记录, 总金额: ${stat.total_amount}`);
    });
    
    // 4. 测试按月份筛选
    console.log('\n=== 测试按月份筛选 ===');
    for (let month = 1; month <= 12; month++) {
      const [monthData] = await connection.execute(`
        SELECT COUNT(*) as count 
        FROM income_records 
        WHERE MONTH(payment_date) = ?
      `, [month]);
      console.log(`${month}月: ${monthData[0].count}条记录`);
    }
    
    // 5. 检查日期格式
    const [dateSample] = await connection.execute(`
      SELECT payment_date, created_at 
      FROM income_records 
      ORDER BY created_at DESC 
      LIMIT 3
    `);
    console.log('\n日期格式样本:');
    dateSample.forEach(record => {
      console.log(`支付日期: ${record.payment_date} (类型: ${typeof record.payment_date})`);
      console.log(`创建时间: ${record.created_at} (类型: ${typeof record.created_at})`);
    });
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await connection.end();
  }
}

checkIncomeData(); 