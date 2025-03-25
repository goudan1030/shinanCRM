import { createClient } from '@supabase/supabase-js'
import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

// 配置Supabase客户端
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('错误: 找不到 Supabase URL 或 Service Role Key 环境变量')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

// 将Supabase时间戳格式转换为MySQL兼容格式
function formatDateTime(dateTimeString: string | null): string | null {
  if (!dateTimeString) return null
  
  try {
    // 去除时区信息，截取到毫秒部分
    const timestampParts = dateTimeString.split('+')[0]
    const date = new Date(timestampParts)
    
    // 转换为MySQL兼容格式: YYYY-MM-DD HH:MM:SS
    const mysqlDateTime = date.toISOString().slice(0, 19).replace('T', ' ')
    return mysqlDateTime
  } catch (error) {
    console.error(`日期转换错误: ${dateTimeString}`, error)
    return null
  }
}

async function importSupabaseToMySQL() {
  console.log('开始从Supabase导入数据到MySQL...')
  
  let connection: mysql.Connection | null = null
  
  try {
    // 1. 从Supabase获取数据
    console.log('从Supabase获取members表数据...')
    const { data: members, error } = await supabase
      .from('members')
      .select('*')
    
    if (error) {
      throw new Error(`Supabase查询错误: ${error.message}`)
    }
    
    if (!members || members.length === 0) {
      console.log('Supabase中没有找到任何成员数据')
      return
    }
    
    console.log(`从Supabase获取到 ${members.length} 条记录`)
    
    // 2. 连接MySQL
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    })
    
    console.log('MySQL连接成功!')
    
    // 3. 查询现有MySQL数据，决定是否需要清理
    const [existingCount] = await connection.execute('SELECT COUNT(*) as total FROM members')
    const totalExisting = (existingCount as any)[0].total
    
    console.log(`MySQL members表当前有 ${totalExisting} 条记录`)
    
    // 5. 开始插入/更新数据
    console.log('开始导入数据到MySQL...')
    let successCount = 0
    let errorCount = 0
    
    // 使用事务保证数据一致性
    await connection.beginTransaction()
    
    try {
      // 处理每条记录
      for (const record of members) {
        const fieldNames = []
        const placeholders = []
        const values = []
        
        // 动态构建SQL语句
        for (const [key, value] of Object.entries(record)) {
          // 跳过某些不需要的字段
          if (key === 'raw_data' || key === 'metadata') continue
          
          fieldNames.push(key)
          placeholders.push('?')
          
          // 处理日期时间字段
          if (key === 'created_at' || key === 'updated_at' || key === 'success_time') {
            values.push(formatDateTime(value as string))
          } else {
            values.push(value)
          }
        }
        
        // 构建ON DUPLICATE KEY UPDATE部分
        const updateParts = fieldNames
          .filter(field => field !== 'id') // 排除主键
          .map(field => `${field} = VALUES(${field})`)
        
        // 生成完整的SQL语句
        const insertSQL = `
          INSERT INTO members (${fieldNames.join(', ')})
          VALUES (${placeholders.join(', ')})
          ON DUPLICATE KEY UPDATE ${updateParts.join(', ')}
        `
        
        try {
          await connection.execute(insertSQL, values)
          successCount++
        } catch (err) {
          console.error(`插入记录ID ${record.id} 出错:`, err)
          errorCount++
        }
      }
      
      // 提交事务
      await connection.commit()
      console.log(`成功导入 ${successCount} 条记录，失败 ${errorCount} 条记录`)
      
    } catch (err) {
      // 发生错误时回滚事务
      await connection.rollback()
      console.error('导入过程中发生错误，事务已回滚:', err)
      throw err
    }
    
    // 6. 验证导入结果
    const [newCount] = await connection.execute('SELECT COUNT(*) as total FROM members')
    const totalNew = (newCount as any)[0].total
    console.log(`导入完成后，MySQL members表现在有 ${totalNew} 条记录`)
    
    // 7. 获取一些样本记录
    const [sampleResult] = await connection.execute('SELECT * FROM members LIMIT 5')
    console.log('记录样本:')
    console.log(sampleResult)
    
  } catch (error) {
    console.error('导入过程中发生错误:', error)
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

// 执行导入
importSupabaseToMySQL() 