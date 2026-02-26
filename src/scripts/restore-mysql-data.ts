import mysql from 'mysql2/promise'
import * as fs from 'fs'
import * as path from 'path'
import dotenv from 'dotenv'

dotenv.config()

const downloadPath = '/Users/zwd/Downloads'
const sqlFilesPattern = /members_rows.*\.sql/

async function restoreData() {
  console.log('开始从SQL文件恢复数据...')
  
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
    
    // 获取下载文件夹中的SQL文件
    const files = fs.readdirSync(downloadPath).filter(file => sqlFilesPattern.test(file))
    
    if (files.length === 0) {
      console.log('未找到匹配的SQL文件')
      return
    }
    
    console.log(`找到 ${files.length} 个SQL文件:`)
    files.forEach(file => console.log(`- ${file}`))
    
    // 按名称排序文件
    files.sort()
    
    // 执行每个SQL文件中的插入语句
    let totalInserted = 0
    
    for (const file of files) {
      const filePath = path.join(downloadPath, file)
      console.log(`正在处理文件: ${file}`)
      
      const content = fs.readFileSync(filePath, 'utf8')
      
      // 由于SQL文件可能包含多条INSERT语句，我们需要分别执行
      // 注意：这里假设SQL文件格式是标准的INSERT INTO语句
      // 如果文件格式不一致，可能需要调整此逻辑
      
      try {
        // 直接执行SQL文件内容
        const [result] = await connection.query(content)
        const affectedRows = (result as any).affectedRows || 0
        totalInserted += affectedRows
        console.log(`成功从文件 ${file} 插入 ${affectedRows} 条记录`)
      } catch (error) {
        console.error(`执行文件 ${file} 失败:`, error)
        
        // 尝试提取并分别执行每条INSERT语句
        console.log('尝试逐条执行SQL语句...')
        
        // 简单拆分INSERT语句(这种方法不能处理所有情况，但可以处理大多数标准格式)
        const statements = content.split(';').filter(stmt => stmt.trim().length > 0)
        
        let successfulInserts = 0
        for (const stmt of statements) {
          try {
            const [result] = await connection.query(stmt)
            const affectedRows = (result as any).affectedRows || 0
            successfulInserts += affectedRows
            console.log(`成功执行语句，插入 ${affectedRows} 条记录`)
          } catch (stmtError) {
            console.error('执行语句失败:', stmtError)
          }
        }
        
        totalInserted += successfulInserts
        console.log(`从文件 ${file} 中成功插入了 ${successfulInserts}/${statements.length} 条语句`)
      }
    }
    
    console.log(`恢复完成! 总共插入了 ${totalInserted} 条记录`)
    
    // 验证恢复结果
    const [countResult] = await connection.execute('SELECT COUNT(*) as total FROM members')
    const totalRecords = (countResult as any)[0].total
    console.log(`MySQL members表现在有 ${totalRecords} 条记录`)
    
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

restoreData() 