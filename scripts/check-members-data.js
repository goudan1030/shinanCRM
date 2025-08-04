// 查询会员数据脚本
const mysql = require('mysql2/promise');

async function checkMembersData() {
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
    console.log('=== 检查会员数据 ===');
    
    // 1. 检查总记录数
    const [totalResult] = await connection.execute('SELECT COUNT(*) as total FROM members');
    console.log(`总会员数: ${totalResult[0].total}`);
    
    // 2. 检查最近的几条记录
    const [recentRecords] = await connection.execute(`
      SELECT id, member_no, created_at, status
      FROM members 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    console.log('\n最近的5条会员记录:');
    recentRecords.forEach(record => {
      console.log(`ID: ${record.id}, 会员号: ${record.member_no}, 创建时间: ${record.created_at}, 状态: ${record.status}`);
    });
    
    // 3. 检查最近30天的数据分布
    const [recent30Days] = await connection.execute(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM members 
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `);
    console.log('\n最近30天的会员注册分布:');
    recent30Days.forEach(record => {
      console.log(`${record.date}: ${record.count}人`);
    });
    
    // 4. 检查按月份分布（最近6个月）
    const [monthlyStats] = await connection.execute(`
      SELECT 
        YEAR(created_at) as year,
        MONTH(created_at) as month,
        COUNT(*) as count
      FROM members 
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY YEAR(created_at), MONTH(created_at)
      ORDER BY year DESC, month DESC
    `);
    console.log('\n最近6个月的会员注册分布:');
    monthlyStats.forEach(stat => {
      console.log(`${stat.year}年${stat.month}月: ${stat.count}人`);
    });
    
    // 5. 测试趋势API的查询逻辑
    console.log('\n=== 测试趋势API查询逻辑 ===');
    
    // 测试会员趋势查询
    const [memberTrendTest] = await connection.execute(`
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
    console.log('\n趋势API会员查询结果:');
    memberTrendTest.forEach(record => {
      console.log(`${record.date} (${record.date_raw}): ${record.value}人`);
    });
    
    // 6. 检查当前日期范围
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    console.log('\n=== 日期范围检查 ===');
    console.log(`当前时间: ${now.toISOString()}`);
    console.log(`30天前: ${thirtyDaysAgo.toISOString()}`);
    console.log(`查询范围: ${thirtyDaysAgo.toISOString().split('T')[0]} 至 ${now.toISOString().split('T')[0]}`);
    
    // 7. 检查这个范围内的实际数据
    const [rangeData] = await connection.execute(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM members 
      WHERE created_at >= ? AND created_at <= ?
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `, [thirtyDaysAgo.toISOString().split('T')[0], now.toISOString().split('T')[0]]);
    
    console.log('\n指定日期范围内的数据:');
    if (rangeData.length === 0) {
      console.log('没有找到数据！');
    } else {
      rangeData.forEach(record => {
        console.log(`${record.date}: ${record.count}人`);
      });
    }
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await connection.end();
  }
}

checkMembersData(); 