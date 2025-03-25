import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import { v4 as uuidv4 } from 'uuid'

dotenv.config()

async function manualRestoreData() {
  console.log('开始手动恢复MySQL数据...')
  
  let connection: mysql.Connection | null = null
  
  try {
    // 连接MySQL
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    })
    
    console.log('MySQL连接成功!')
    
    // 先删除旧表，重新创建
    console.log('删除可能存在的旧表...')
    await connection.query('DROP TABLE IF EXISTS members')
    
    // 创建新表
    console.log('创建members表...')
    
    const createTableSQL = `
      CREATE TABLE members (
        id VARCHAR(100) PRIMARY KEY,
        member_no VARCHAR(10),
        type ENUM('NORMAL', 'VIP') DEFAULT 'NORMAL',
        status ENUM('ACTIVE', 'INACTIVE', 'REVOKED') DEFAULT 'ACTIVE',
        province VARCHAR(50),
        city VARCHAR(50),
        district VARCHAR(50),
        gender ENUM('male', 'female') DEFAULT NULL,
        target_area VARCHAR(100),
        birth_year VARCHAR(10),
        height VARCHAR(10),
        weight VARCHAR(10),
        education ENUM('PRIMARY_SCHOOL', 'MIDDLE_SCHOOL', 'HIGH_SCHOOL', 'JUNIOR_COLLEGE', 'BACHELOR', 'MASTER', 'DOCTOR') DEFAULT NULL,
        occupation VARCHAR(100),
        house_car ENUM('NEITHER', 'HOUSE_ONLY', 'CAR_ONLY', 'BOTH') DEFAULT 'NEITHER',
        hukou_province VARCHAR(50),
        hukou_city VARCHAR(50),
        children_plan ENUM('NONE', 'SEPARATE', 'BOTH', 'NEGOTIATE') DEFAULT NULL,
        marriage_cert ENUM('DONT_WANT', 'WANT', 'NEGOTIATE') DEFAULT NULL,
        self_description TEXT,
        partner_requirement TEXT,
        remaining_matches INT DEFAULT 1,
        success_time DATETIME DEFAULT NULL,
        success_reason VARCHAR(255) DEFAULT NULL,
        created_at DATETIME,
        updated_at DATETIME,
        wechat VARCHAR(50),
        phone VARCHAR(20),
        marriage_history VARCHAR(50) DEFAULT NULL,
        sexual_orientation VARCHAR(50) DEFAULT NULL,
        nickname VARCHAR(50) DEFAULT NULL
      );
    `
    
    await connection.query(createTableSQL)
    console.log('成功创建members表!')
    
    // 准备一些测试数据，使用MySQL原生的INSERT语法
    const testData = [
      {
        id: uuidv4(),
        member_no: '10001',
        type: 'NORMAL',
        status: 'ACTIVE',
        province: '广东省',
        city: '深圳市',
        district: '南山区',
        gender: 'male',
        birth_year: '1990',
        height: '175',
        weight: '70',
        education: 'BACHELOR',
        occupation: '软件工程师',
        wechat: 'test123',
        phone: '13800138000',
        self_description: '测试数据1',
        partner_requirement: '测试要求1',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        member_no: '10002',
        type: 'NORMAL',
        status: 'ACTIVE',
        province: '北京市',
        city: '北京市',
        district: '海淀区',
        gender: 'female',
        birth_year: '1992',
        height: '165',
        weight: '50',
        education: 'MASTER',
        occupation: '教师',
        wechat: 'test456',
        phone: '13900139000',
        self_description: '测试数据2',
        partner_requirement: '测试要求2',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        member_no: '10003',
        type: 'NORMAL',
        status: 'ACTIVE',
        province: '上海市',
        city: '上海市',
        district: '浦东新区',
        gender: 'male',
        birth_year: '1988',
        height: '180',
        weight: '75',
        education: 'BACHELOR',
        occupation: '金融分析师',
        wechat: 'test789',
        phone: '13700137000',
        self_description: '测试数据3',
        partner_requirement: '测试要求3',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        member_no: '10004',
        type: 'NORMAL',
        status: 'ACTIVE',
        province: '浙江省',
        city: '杭州市',
        district: '西湖区',
        gender: 'female',
        birth_year: '1991',
        height: '163',
        weight: '48',
        education: 'BACHELOR',
        occupation: '设计师',
        wechat: 'test101',
        phone: '13600136000',
        self_description: '测试数据4',
        partner_requirement: '测试要求4',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        member_no: '10005',
        type: 'NORMAL',
        status: 'ACTIVE',
        province: '江苏省',
        city: '南京市',
        district: '鼓楼区',
        gender: 'male',
        birth_year: '1993',
        height: '178',
        weight: '65',
        education: 'MASTER',
        occupation: '医生',
        wechat: 'test202',
        phone: '13500135000',
        self_description: '测试数据5',
        partner_requirement: '测试要求5',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]
    
    // 插入测试数据
    console.log('开始插入测试数据...')
    
    for (const record of testData) {
      const insertSQL = `
        INSERT INTO members 
        (id, member_no, type, status, province, city, district, gender, birth_year, 
         height, weight, education, occupation, wechat, phone, 
         self_description, partner_requirement, created_at, updated_at)
        VALUES 
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      
      const params = [
        record.id, record.member_no, record.type, record.status,
        record.province, record.city, record.district, record.gender,
        record.birth_year, record.height, record.weight, record.education,
        record.occupation, record.wechat, record.phone,
        record.self_description, record.partner_requirement,
        record.created_at, record.updated_at
      ]
      
      await connection.query(insertSQL, params)
    }
    
    console.log(`成功插入 ${testData.length} 条测试记录!`)
    
    // 验证恢复结果
    const [countResult] = await connection.execute('SELECT COUNT(*) as total FROM members')
    const totalRecords = (countResult as any)[0].total
    console.log(`MySQL members表现在有 ${totalRecords} 条记录`)
    
    // 抽样展示几条记录
    const [sampleResult] = await connection.execute('SELECT * FROM members LIMIT 5')
    console.log('记录样本:')
    console.log(sampleResult)
    
  } catch (error) {
    console.error('恢复过程中发生错误:', error)
  } finally {
    if (connection) {
      try {
        await connection.end()
        console.log('MySQL连接已关闭')
      } catch (err) {
        console.error('关闭MySQL连接时出错:', err)
      }
    }
  }
}

manualRestoreData() 