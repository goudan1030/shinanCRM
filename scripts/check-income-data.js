// 查询收入数据脚本
const mysql = require('mysql2/promise');

// 数据库配置
const dbConfig = {
  host: '8.149.244.105',
  port: 3306,
  user: 'h5_cloud_user',
  password: 'mc72TNcMmy6HCybH',
  database: 'h5_cloud_db',
  connectTimeout: 10000 // 10秒连接超时
};

async function checkIncomeData() {
  console.log('开始检查收入数据...');
  
  let connection;
  try {
    // 创建连接
    console.log('连接数据库...');
    connection = await mysql.createConnection(dbConfig);
    console.log('连接成功!');
    
    // 1. 获取income_records表结构
    console.log('\n检查income_records表结构:');
    const [tableInfo] = await connection.execute('DESCRIBE income_records');
    console.log('income_records表字段:');
    tableInfo.forEach(field => {
      console.log(`- ${field.Field} (${field.Type})`);
    });
    
    // 2. 检查记录总数
    const [countResult] = await connection.execute('SELECT COUNT(*) as total FROM income_records');
    console.log(`\n收入记录总数: ${countResult[0].total}`);
    
    // 3. 检查最新的10条记录
    console.log('\n最新的10条收入记录:');
    const [latestRecords] = await connection.execute(`
      SELECT id, member_no, amount, payment_method, payment_date, created_at
      FROM income_records
      ORDER BY created_at DESC
      LIMIT 10
    `);
    latestRecords.forEach(record => {
      console.log(`- ID: ${record.id}, 会员编号: ${record.member_no}, 金额: ${record.amount}, 支付方式: ${record.payment_method}, 支付日期: ${record.payment_date}, 创建时间: ${record.created_at}`);
    });
    
    // 4. 特别检查5月份的数据
    const currentYear = new Date().getFullYear();
    console.log(`\n检查${currentYear}年5月的收入记录:`);
    const [mayRecords] = await connection.execute(`
      SELECT 
        DATE(payment_date) as date,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM income_records
      WHERE MONTH(payment_date) = 5 AND YEAR(payment_date) = ${currentYear}
      GROUP BY DATE(payment_date)
      ORDER BY date
    `);
    
    if (mayRecords.length === 0) {
      console.log(`没有找到${currentYear}年5月的收入记录!`);
    } else {
      console.log(`${currentYear}年5月收入记录统计:`);
      mayRecords.forEach(item => {
        console.log(`- ${item.date}: ${item.count}笔, 共${item.total_amount}元`);
      });
    }
    
    // 5. 检查每个月的收入情况
    console.log('\n按月份统计收入情况:');
    const [monthlyIncome] = await connection.execute(`
      SELECT 
        YEAR(payment_date) as year,
        MONTH(payment_date) as month,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM income_records
      GROUP BY YEAR(payment_date), MONTH(payment_date)
      ORDER BY year, month
    `);
    
    monthlyIncome.forEach(item => {
      console.log(`- ${item.year}年${item.month}月: ${item.count}笔, 共${item.total_amount}元`);
    });
    
    // 6. 检查payment_date字段和created_at字段的格式
    console.log('\n检查日期字段的格式:');
    const [dateFormatSample] = await connection.execute(`
      SELECT 
        id,
        payment_date,
        DATE_FORMAT(payment_date, '%Y-%m-%d') as formatted_payment_date,
        created_at,
        DATE_FORMAT(created_at, '%Y-%m-%d') as formatted_created_at
      FROM income_records
      LIMIT 5
    `);
    
    dateFormatSample.forEach(record => {
      console.log(`记录ID: ${record.id}`);
      console.log(`- payment_date: ${record.payment_date}`);
      console.log(`- payment_date格式化: ${record.formatted_payment_date}`);
      console.log(`- created_at: ${record.created_at}`);
      console.log(`- created_at格式化: ${record.formatted_created_at}`);
    });
    
    // 7. 获取5条随机样本记录
    console.log('\n随机5条收入记录详情:');
    const [sampleRecords] = await connection.execute(`
      SELECT *
      FROM income_records
      ORDER BY RAND()
      LIMIT 5
    `);
    
    sampleRecords.forEach((record, index) => {
      console.log(`\n收入样本 #${index + 1}:`);
      Object.keys(record).forEach(key => {
        console.log(`  ${key}: ${record[key]}`);
      });
    });
    
    // 关闭连接
    await connection.end();
    console.log('\n连接已关闭');
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    if (connection) {
      try {
        await connection.end();
      } catch (err) {
        console.error('关闭连接失败:', err);
      }
    }
  }
}

// 执行检查
checkIncomeData(); 