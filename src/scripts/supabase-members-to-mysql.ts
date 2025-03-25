import { createClient } from '@supabase/supabase-js'
import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

console.log('Supabase URL:', supabaseUrl)
console.log('正在准备从Supabase导入数据到MySQL...')

if (!supabaseServiceRoleKey) {
  console.error('请确保.env文件中设置了SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// 使用service_role密钥创建Supabase客户端
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function migrateSupabaseToMySQL() {
  console.log('开始从Supabase导入members表数据到MySQL...')
  
  let connection: mysql.Connection | null = null
  
  try {
    // 首先从Supabase获取数据
    console.log('从Supabase获取members数据...')
    const { data: members, error, count } = await supabase
      .from('members')
      .select('*', { count: 'exact' })
    
    if (error) {
      console.error('从Supabase获取数据失败:', error.message)
      return
    }
    
    if (!members || members.length === 0) {
      console.log('Supabase members表中没有数据')
      return
    }
    
    console.log(`从Supabase获取到 ${count} 条members记录`)
    console.log('示例数据:', JSON.stringify(members[0], null, 2))
    
    // 连接MySQL
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    })
    
    console.log('MySQL连接成功!')
    
    // 清空MySQL中的现有数据(可选)
    // 如果不需要清空数据,请注释掉以下两行
    // console.log('清空MySQL中的members表...')
    // await connection.execute('TRUNCATE TABLE members')
    
    // 查看MySQL表结构
    console.log('查看MySQL members表结构...')
    const [columns] = await connection.execute('DESCRIBE members')
    console.log('MySQL members表结构:', JSON.stringify(columns, null, 2))
    
    // 准备批量插入
    console.log('准备数据转换...')
    
    // 获取MySQL表的所有列
    const [columnResults] = await connection.execute('SHOW COLUMNS FROM members') as [any[], any]
    const mysqlColumns = columnResults.map(col => col.Field)
    console.log('MySQL表列:', mysqlColumns.join(', '))
    
    // 准备插入语句
    const insertBatch = async (batch: any[]) => {
      try {
        // 转换数据格式以适应MySQL
        const values = batch.map(member => {
          const rowValues = mysqlColumns.map(column => {
            // 如果Supabase数据中没有该列,返回null
            if (!(column in member)) {
              return null
            }
            
            const value = member[column]
            
            // 处理特殊类型
            if (value === null || value === undefined) {
              return null
            } else if (typeof value === 'object' && value instanceof Date) {
              return value
            } else if (typeof value === 'object') {
              return JSON.stringify(value)
            } else {
              return value
            }
          })
          
          return rowValues
        })
        
        // 生成SQL语句
        const placeholders = values[0].map(() => '?').join(', ')
        const sql = `INSERT INTO members (${mysqlColumns.join(', ')}) VALUES (${placeholders})`
        
        // 执行插入
        const insertPromises = values.map(rowValues => 
          connection!.execute(sql, rowValues)
        )
        
        await Promise.all(insertPromises)
        return true
      } catch (error) {
        console.error('批量插入出错:', error)
        return false
      }
    }
    
    // 将数据分批插入MySQL (每批20条)
    const batchSize = 20
    let successCount = 0
    
    for (let i = 0; i < members.length; i += batchSize) {
      const batch = members.slice(i, i + batchSize)
      console.log(`正在导入第 ${Math.floor(i/batchSize) + 1}/${Math.ceil(members.length/batchSize)} 批,共 ${batch.length} 条记录...`)
      
      try {
        const success = await insertBatch(batch)
        if (success) {
          successCount += batch.length
          console.log(`成功导入第 ${Math.floor(i/batchSize) + 1} 批数据`)
        } else {
          console.error(`导入第 ${Math.floor(i/batchSize) + 1} 批数据失败,尝试单条插入`)
          
          // 尝试单条插入
          for (const member of batch) {
            try {
              const columnsList = Object.keys(member).filter(key => mysqlColumns.includes(key))
              const valuesList = columnsList.map(col => member[col])
              
              const placeholders = columnsList.map(() => '?').join(', ')
              const sql = `INSERT INTO members (${columnsList.join(', ')}) VALUES (${placeholders})`
              
              await connection!.execute(sql, valuesList)
              successCount++
              console.log(`成功导入记录 ${member.member_no || member.id}`)
            } catch (error) {
              console.error(`导入记录 ${member.member_no || member.id} 失败:`, error)
            }
          }
        }
      } catch (error) {
        console.error(`导入第 ${Math.floor(i/batchSize) + 1} 批数据时发生错误:`, error)
      }
      
      // 避免过快导入
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    console.log(`导入完成! 成功导入 ${successCount}/${members.length} 条记录`)
    
    // 验证导入
    const [result] = await connection.execute('SELECT COUNT(*) as total FROM members')
    const total = (result as any)[0].total
    console.log(`MySQL members表现在有 ${total} 条记录`)
    
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

migrateSupabaseToMySQL() 