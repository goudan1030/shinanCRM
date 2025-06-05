// 查询会员数据脚本
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

async function checkMembersData() {
  console.log('开始检查会员数据...');
  
  let connection;
  try {
    // 创建连接
    console.log('连接数据库...');
    connection = await mysql.createConnection(dbConfig);
    console.log('连接成功!');
    
    // 1. 获取members表结构
    console.log('\n检查members表结构:');
    const [tableInfo] = await connection.execute('DESCRIBE members');
    console.log('members表字段:');
    tableInfo.forEach(field => {
      console.log(`- ${field.Field} (${field.Type})`);
    });
    
    // 2. 检查记录总数
    const [countResult] = await connection.execute('SELECT COUNT(*) as total FROM members');
    console.log(`\n会员记录总数: ${countResult[0].total}`);
    
    // 3. 检查最新的10条记录 (使用nickname代替name)
    console.log('\n最新的10条会员记录:');
    const [latestMembers] = await connection.execute(`
      SELECT id, nickname, wechat, phone, created_at, updated_at
      FROM members
      ORDER BY created_at DESC
      LIMIT 10
    `);
    latestMembers.forEach(member => {
      console.log(`- ID: ${member.id}, 昵称: ${member.nickname || '无'}, 微信: ${member.wechat || '无'}, 手机: ${member.phone || '无'}, 创建时间: ${member.created_at}, 更新时间: ${member.updated_at}`);
    });
    
    // 4. 特别检查5月份的数据
    const currentYear = new Date().getFullYear();
    console.log(`\n检查${currentYear}年5月的会员记录:`);
    const [mayMembers] = await connection.execute(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM members
      WHERE MONTH(created_at) = 5 AND YEAR(created_at) = ${currentYear}
      GROUP BY DATE(created_at)
      ORDER BY date
    `);
    
    if (mayMembers.length === 0) {
      console.log(`没有找到${currentYear}年5月的会员记录!`);
    } else {
      console.log(`${currentYear}年5月会员记录统计:`);
      mayMembers.forEach(item => {
        console.log(`- ${item.date}: ${item.count}人`);
      });
    }
    
    // 5. 检查每个月的会员增长情况
    console.log('\n按月份统计会员增长情况:');
    const [monthlyGrowth] = await connection.execute(`
      SELECT 
        YEAR(created_at) as year,
        MONTH(created_at) as month,
        COUNT(*) as count
      FROM members
      GROUP BY YEAR(created_at), MONTH(created_at)
      ORDER BY year, month
    `);
    
    monthlyGrowth.forEach(item => {
      console.log(`- ${item.year}年${item.month}月: ${item.count}人`);
    });
    
    // 6. 获取一些示例数据，以检查记录的真实性
    console.log('\n随机5条会员记录详情:');
    const [sampleRecords] = await connection.execute(`
      SELECT *
      FROM members
      ORDER BY RAND()
      LIMIT 5
    `);
    
    sampleRecords.forEach((record, index) => {
      console.log(`\n会员样本 #${index + 1}:`);
      Object.keys(record).forEach(key => {
        // 排除过长的字段和不重要的信息
        if (!['self_description', 'partner_requirement'].includes(key) && record[key] !== null) {
          console.log(`  ${key}: ${record[key]}`);
        }
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
checkMembersData(); 