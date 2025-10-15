/**
 * 检查5月份会员数据
 * 这个脚本直接查询数据库，检查5月份是否有会员和收入数据
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  // 创建数据库连接
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '121.41.65.220',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'h5_cloud_user',
    password: process.env.DB_PASSWORD || 'mc72TNcMmy6HCybH',
    database: process.env.DB_NAME || 'h5_cloud_db'
  });

  try {
    console.log('连接到数据库成功');

    // 检查会员表结构
    const [tables] = await connection.query('SHOW TABLES');
    console.log('数据库中的表:');
    tables.forEach(table => {
      console.log(`- ${Object.values(table)[0]}`);
    });

    // 获取会员表的列信息
    const [columns] = await connection.query('DESCRIBE members');
    console.log('\n会员表结构:');
    columns.forEach(col => {
      console.log(`- ${col.Field}: ${col.Type}`);
    });

    // 查询5月份创建的会员数据
    const now = new Date();
    const year = now.getFullYear();
    const month = 5; // 5月

    const [mayMembers] = await connection.query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as count 
      FROM members
      WHERE MONTH(created_at) = ? AND YEAR(created_at) = ?
      GROUP BY DATE(created_at)
      ORDER BY date`,
      [month, year]
    );

    console.log(`\n${year}年${month}月份会员创建数据:`);
    if (mayMembers.length === 0) {
      console.log('没有找到5月份的会员数据');
    } else {
      mayMembers.forEach(day => {
        console.log(`- ${day.date}: ${day.count}人`);
      });
      console.log(`共计: ${mayMembers.reduce((sum, day) => sum + day.count, 0)}人`);
    }

    // 查询4月份创建的会员数据
    const [aprilMembers] = await connection.query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as count 
      FROM members
      WHERE MONTH(created_at) = ? AND YEAR(created_at) = ?
      GROUP BY DATE(created_at)
      ORDER BY date`,
      [4, year]
    );

    console.log(`\n${year}年4月份会员创建数据:`);
    if (aprilMembers.length === 0) {
      console.log('没有找到4月份的会员数据');
    } else {
      aprilMembers.forEach(day => {
        console.log(`- ${day.date}: ${day.count}人`);
      });
      console.log(`共计: ${aprilMembers.reduce((sum, day) => sum + day.count, 0)}人`);
    }

    // 特别检查是否有时间异常的记录
    const [abnormalTimes] = await connection.query(
      `SELECT 
        id, created_at, updated_at
      FROM members
      WHERE created_at IS NULL OR YEAR(created_at) < 2020 OR YEAR(created_at) > ?
      LIMIT 10`,
      [year + 1]
    );

    console.log('\n时间异常记录检查:');
    if (abnormalTimes.length === 0) {
      console.log('没有发现时间异常的记录');
    } else {
      console.log('发现时间异常记录:');
      abnormalTimes.forEach(record => {
        console.log(`- ID: ${record.id}, 创建时间: ${record.created_at}, 更新时间: ${record.updated_at}`);
      });
    }

    // 测试API使用的SQL查询
    const [testApiQuery] = await connection.query(
      `SELECT 
        DATE_FORMAT(created_at, '%m月%d日') as date_formatted,
        DATE(created_at) as date_raw,
        COUNT(*) as value
      FROM members
      GROUP BY DATE(created_at), DATE_FORMAT(created_at, '%m月%d日')
      ORDER BY DATE(created_at) DESC
      LIMIT 30`
    );

    console.log('\nAPI查询结果测试:');
    if (testApiQuery.length === 0) {
      console.log('API查询没有返回数据');
    } else {
      console.log('API查询返回数据:');
      testApiQuery.slice(0, 10).forEach(item => {
        console.log(`- 日期格式化: "${item.date_formatted}", 原始日期: ${item.date_raw}, 数量: ${item.value}`);
      });
    }

  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    // 关闭连接
    await connection.end();
    console.log('\n数据库连接已关闭');
  }
}

main().catch(console.error); 