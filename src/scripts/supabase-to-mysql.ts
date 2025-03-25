import { createClient } from '@supabase/supabase-js'
import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

// 输出环境变量用于调试
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function migrateFromSupabase() {
  console.log('开始从Supabase导入数据到MySQL...')
  
  // 先检查Supabase中表的情况
  const tableNames = ['users', 'members', 'matches', 'settlements', 
                     'expenses', 'incomes', 'expense_records', 
                     'income_records', 'settlement_records']
  
  let connection: mysql.Connection | null = null;
  
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
    
    // 检查并迁移每个表
    for (const tableName of tableNames) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1)
        
        if (error) {
          console.log(`表 ${tableName} 不存在或无法访问:`, error.message)
          continue 
        }
        
        if (data && data.length > 0) {
          console.log(`表 ${tableName} 存在并有数据,开始迁移...`)
          await migrateTable(connection, tableName)
        } else {
          console.log(`表 ${tableName} 存在但没有数据,跳过迁移`)
        }
      } catch (err) {
        console.error(`检查表 ${tableName} 时出错:`, err)
      }
    }
    
    console.log('所有表检查和迁移完成!')
    
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

async function migrateTable(connection: mysql.Connection, tableName: string) {
  console.log(`开始迁移表 ${tableName}...`)
  
  try {
    // 获取所有数据
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
    
    if (error) {
      console.error(`获取 ${tableName} 数据失败:`, error)
      return
    }
    
    if (!data || data.length === 0) {
      console.log(`表 ${tableName} 没有数据`)
      return
    }
    
    console.log(`获取到 ${data.length} 条 ${tableName} 记录`)
    console.log('示例数据:', JSON.stringify(data[0], null, 2))
    
    // 检查MySQL表是否存在
    const [tableExists] = await connection.execute(`SHOW TABLES LIKE '${tableName}'`)
    
    if (Array.isArray(tableExists) && tableExists.length === 0) {
      console.log(`MySQL中不存在 ${tableName} 表,跳过迁移`)
      return
    }
    
    // 在MySQL表中插入数据
    let successCount = 0
    let errorCount = 0
    
    // 检查MySQL表结构
    const [fields] = await connection.execute(`DESCRIBE ${tableName}`)
    console.log(`MySQL ${tableName} 表结构:`, fields)
    
    for (const record of data) {
      try {
        // 准备插入的记录,删除id字段(MySQL会自动生成),
        // 处理日期格式,添加uuid字段存储原始ID
        const recordToInsert: Record<string, any> = {}
        
        // 先保存原始ID
        if (record.id) {
          recordToInsert.uuid = record.id
        }
        
        // 复制其他字段
        for (const [key, value] of Object.entries(record)) {
          // 跳过id字段,因为MySQL使用自增ID
          if (key === 'id') continue
          
          // 处理日期格式
          if (typeof value === 'string' && 
              (value.includes('T') && value.includes('Z') || 
               value.includes('+'))) {
            // 假设这是ISO日期字符串,转换为MySQL datetime格式
            const dateObj = new Date(value)
            recordToInsert[key] = dateObj.toISOString().slice(0, 19).replace('T', ' ')
          } else {
            recordToInsert[key] = value
          }
        }
        
        // 构建INSERT语句
        const keys = Object.keys(recordToInsert)
        const values = Object.values(recordToInsert)
        const placeholders = keys.map(() => '?').join(', ')
        
        const query = `INSERT INTO ${tableName} (${keys.join(', ')}) VALUES (${placeholders})`
        
        // 执行插入
        await connection.execute(query, values)
        
        successCount++
        
        // 每20条记录输出一次进度
        if (successCount % 20 === 0 || successCount === data.length) {
          console.log(`已成功迁移 ${successCount}/${data.length} 条记录...`)
        }
      } catch (err) {
        console.error(`插入记录失败:`, err)
        errorCount++
      }
    }
    
    console.log(`${tableName} 表数据迁移完成!`)
    console.log(`成功: ${successCount} 条, 失败: ${errorCount} 条`)
    
  } catch (error) {
    console.error(`迁移 ${tableName} 表时出错:`, error)
  }
}

migrateFromSupabase() 