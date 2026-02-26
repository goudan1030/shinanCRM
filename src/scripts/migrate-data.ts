import { createClient } from '@supabase/supabase-js'
import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

// 输出环境变量用于调试
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
// 不要输出完整的密钥,只显示前10个字符
console.log('Supabase Key (前10字符):', 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 10) + '...' : 
  '未设置')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function migrateData() {
  console.log('开始数据迁移...')
  
  try {
    console.log('获取Supabase中所有可用的表...')
    
    // 使用系统表查询获取所有表
    // 注意: 这需要更高权限的Supabase密钥,可能无法直接使用匿名密钥
    const { data: tablesData, error: tablesError } = await supabase
      .rpc('get_tables')
    
    if (tablesError) {
      console.error('无法获取Supabase表列表:', tablesError)
      console.log('尝试替代方法: 检查预定义的表列表...')
      
      // 尝试常见的表名
      const possibleTables = [
        'members', 'users', 'auth.users', 'profiles', 'matches', 'settlements', 
        'expenses', 'incomes', 'expense_records', 'income_records', 'settlement_records'
      ]
      
      for (const table of possibleTables) {
        await checkAndMigrateTable(table)
      }
      
      return
    }
    
    console.log('找到以下表:', tablesData)
    
    // 处理返回的表列表
    for (const table of tablesData) {
      await checkAndMigrateTable(table.name || table)
    }
    
    console.log('所有表检查和迁移完成!')
    
  } catch (error) {
    console.error('迁移过程中发生错误:', error)
    
    // 尝试常见的表名作为备份方案
    console.log('尝试备份方案: 检查预定义的表列表...')
    const possibleTables = [
      'members', 'users', 'auth.users', 'profiles', 'matches', 'settlements', 
      'expenses', 'incomes', 'expense_records', 'income_records', 'settlement_records'
    ]
    
    for (const table of possibleTables) {
      await checkAndMigrateTable(table)
    }
  }
}

// 检查表是否存在并迁移数据
async function checkAndMigrateTable(tableName: string) {
  console.log(`检查表 ${tableName}...`)
  
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(5)
    
    if (error) {
      console.log(`表 ${tableName} 不存在或无法访问:`, error.message)
      return
    }
    
    console.log(`表 ${tableName} 存在, 获取到 ${data.length} 条示例记录`)
    
    if (data.length > 0) {
      console.log(`表 ${tableName} 的示例数据:`, JSON.stringify(data[0], null, 2))
      
      // 迁移这个表的数据
      const proceed = true  // 在这里你可以添加询问用户是否继续的逻辑
      
      if (proceed) {
        await migrateTableData(tableName);
      }
    } else {
      console.log(`表 ${tableName} 存在但没有数据`)
    }
  } catch (e) {
    console.error(`检查表 ${tableName} 时出错:`, e)
  }
}

// 迁移表数据的函数
async function migrateTableData(tableName: string) {
  console.log(`准备迁移 ${tableName} 表数据...`)
  
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
    
    // 获取表的所有数据
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
    
    if (error) {
      console.error(`获取 ${tableName} 表数据失败:`, error)
      return
    }
    
    if (!data || data.length === 0) {
      console.log(`${tableName} 表没有数据`)
      return
    }
    
    console.log(`获取到 ${data.length} 条 ${tableName} 记录,开始迁移...`)
    
    try {
      // 检查MySQL表是否存在
      const [rows] = await connection.execute(`SHOW TABLES LIKE '${tableName}'`)
      
      if (Array.isArray(rows) && rows.length === 0) {
        console.log(`MySQL中不存在 ${tableName} 表,跳过迁移`)
        return
      }
      
      // 获取MySQL表结构
      const [fields] = await connection.execute(`DESCRIBE ${tableName}`)
      console.log(`MySQL ${tableName} 表结构:`, fields)
    } catch (err) {
      console.error(`检查MySQL表 ${tableName} 时出错:`, err)
      return
    }
    
    // 迁移数据
    let successCount = 0
    let errorCount = 0
    
    for (const record of data) {
      try {
        // 移除id字段(如果存在),因为MySQL会自动生成
        const recordToInsert = { ...record }
        delete recordToInsert.id
        
        // 处理日期字段
        if (recordToInsert.created_at) {
          recordToInsert.created_at = new Date(recordToInsert.created_at).toISOString().slice(0, 19).replace('T', ' ')
        }
        if (recordToInsert.updated_at) {
          recordToInsert.updated_at = new Date(recordToInsert.updated_at).toISOString().slice(0, 19).replace('T', ' ')
        }
        
        // 构建INSERT语句 - 使用命名参数而不是问号占位符
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
    console.error(`迁移 ${tableName} 表数据时出错:`, error)
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

migrateData()