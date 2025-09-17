const mysql = require('mysql2/promise');

async function testContractsAPI() {
  try {
    const connection = await mysql.createConnection({
      host: '8.149.244.105',
      user: 'h5_cloud_user',
      password: 'mc72TNcMmy6HCybH',
      port: 3306,
      database: 'h5_cloud_db',
      charset: 'utf8mb4'
    });

    console.log('🔍 测试合同API逻辑...');
    
    // 模拟API查询
    const page = 1;
    const limit = 10;
    const status = 'all';
    const contractType = 'all';
    const search = '';
    
    let whereConditions = [];
    let queryParams = [];

    if (status && status !== 'all') {
      whereConditions.push('c.status = ?');
      queryParams.push(status);
    }

    if (contractType && contractType !== 'all') {
      whereConditions.push('c.contract_type = ?');
      queryParams.push(contractType);
    }

    if (search) {
      whereConditions.push('(c.contract_number LIKE ? OR m.nickname LIKE ? OR m.member_no LIKE ?)');
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    // 获取合同列表
    const contractsQuery = `
      SELECT 
        c.*,
        m.member_no,
        m.nickname as member_name,
        m.phone as member_phone,
        m.wechat as member_wechat,
        ct.name as template_name
      FROM contracts c
      LEFT JOIN members m ON c.member_id = m.id
      LEFT JOIN contract_templates ct ON c.template_id = ct.id
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `;

    queryParams.push(limit, offset);
    console.log('查询SQL:', contractsQuery);
    console.log('查询参数:', queryParams);
    
    const [contracts] = await connection.execute(contractsQuery, queryParams);

    // 获取总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM contracts c
      LEFT JOIN members m ON c.member_id = m.id
      ${whereClause}
    `;
    
    const countParams = queryParams.slice(0, -2); // 移除 limit 和 offset
    const [countResult] = await connection.execute(countQuery, countParams);
    const total = countResult[0]?.total || 0;

    console.log('📋 查询结果:');
    console.log('合同数量:', contracts.length);
    console.log('总数:', total);
    
    contracts.forEach((contract, index) => {
      console.log(`\n合同 ${index + 1}:`);
      console.log(`  ID: ${contract.id}`);
      console.log(`  编号: ${contract.contract_number}`);
      console.log(`  状态: ${contract.status}`);
      console.log(`  类型: ${contract.contract_type}`);
      console.log(`  会员姓名: ${contract.member_name || 'null'}`);
      console.log(`  会员编号: ${contract.member_no || 'null'}`);
      console.log(`  应该显示签署按钮: ${contract.status === 'PENDING' ? '是' : '否'}`);
    });
    
    await connection.end();
  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
}

testContractsAPI();
