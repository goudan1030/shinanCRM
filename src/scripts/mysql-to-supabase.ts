import { createClient } from '@supabase/supabase-js'
import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

// 输出环境变量用于调试
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('Supabase Key (前10字符):', 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 10) + '...' : 
  '未设置')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function migrateToSupabase() {
  console.log('开始将MySQL数据迁移到Supabase...')
  
  // 连接MySQL
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    })
    
    console.log('MySQL连接成功!')
    
    // 开始迁移members表
    await migrateTableToSupabase(connection, 'members')
    
  } catch (error) {
    console.error('迁移过程中发生错误:', error)
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

async function migrateTableToSupabase(connection: mysql.Connection, tableName: string) {
  console.log(`准备迁移 ${tableName} 表数据到Supabase...`)
  
  try {
    // 1. 检查MySQL表中的数据
    const [rows] = await connection.execute(`SELECT * FROM ${tableName}`)
    const records = rows as Record<string, any>[]
    
    if (!records || records.length === 0) {
      console.log(`MySQL ${tableName} 表没有数据`)
      return
    }
    
    console.log(`从MySQL获取到 ${records.length} 条 ${tableName} 记录`)
    console.log('示例数据:', JSON.stringify(records[0], null, 2))
    
    // 2. 转换数据格式，适配Supabase
    const transformedRecords = records.map(record => {
      const transformedRecord: Record<string, any> = {}
      
      // 遍历每个字段
      for (const [key, value] of Object.entries(record)) {
        // 特殊处理自增ID字段
        if (key === 'id') {
          // 跳过ID，让Supabase自动生成
          continue
        }
        
        // 处理日期字段
        if (value instanceof Date) {
          // 日期格式转换为ISO字符串
          transformedRecord[key] = value.toISOString()
        } else {
          transformedRecord[key] = value
        }
      }
      
      // 添加uuid字段作为id
      if (record.uuid) {
        transformedRecord.id = record.uuid
      }
      
      return transformedRecord
    })
    
    console.log(`数据转换完成，准备插入到Supabase...`)
    console.log('转换后示例:', JSON.stringify(transformedRecords[0], null, 2))
    
    // 3. 分批插入到Supabase (每批100条)
    const batchSize = 100
    for (let i = 0; i < transformedRecords.length; i += batchSize) {
      const batch = transformedRecords.slice(i, i + batchSize)
      console.log(`正在插入第 ${i/batchSize + 1} 批，共 ${batch.length} 条记录...`)
      
      const { data, error } = await supabase
        .from(tableName)
        .insert(batch)
      
      if (error) {
        console.error(`插入第 ${i/batchSize + 1} 批数据时出错:`, error)
      } else {
        console.log(`成功插入第 ${i/batchSize + 1} 批数据`)
      }
    }
    
    console.log(`${tableName} 表数据迁移到Supabase完成!`)
    
  } catch (error) {
    console.error(`迁移 ${tableName} 表数据到Supabase时出错:`, error)
  }
}

migrateToSupabase() 