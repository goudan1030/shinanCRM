import { createClient } from '@supabase/supabase-js'
import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function migrateMembersToSupabase() {
  console.log('开始将MySQL中的members表数据导入到Supabase...')
  
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
    
    // 获取members表结构
    const [fields] = await connection.execute('DESCRIBE members')
    console.log('MySQL members表结构:', fields)
    
    // 查询所有members数据
    const [rows] = await connection.execute('SELECT * FROM members')
    const members = rows as Record<string, any>[]
    
    if (!members || members.length === 0) {
      console.log('MySQL members表中没有数据')
      return
    }
    
    console.log(`从MySQL获取到 ${members.length} 条members记录`)
    console.log('示例数据:', JSON.stringify(members[0], null, 2))
    
    // 转换数据格式以适应Supabase
    const transformedMembers = members.map(member => {
      // 创建新对象,避免修改原对象
      const transformedMember: Record<string, any> = {}
      
      // 遍历每个字段
      for (const [key, value] of Object.entries(member)) {
        // 处理特殊字段
        if (key === 'id') {
          // 跳过,让Supabase自动生成ID 
          continue
        } else if (key === 'uuid') {
          // 使用uuid作为Supabase的id
          if (value) {
            transformedMember.id = value
          }
          continue
        } else if (value instanceof Date) {
          // 格式化日期
          transformedMember[key] = value.toISOString()
        } else if (typeof value === 'string' && value === 'NULL') {
          // 处理字符串"NULL"
          transformedMember[key] = null
        } else {
          // 其他字段直接复制
          transformedMember[key] = value
        }
      }
      
      return transformedMember
    })
    
    console.log('数据转换完成')
    console.log('转换后示例:', JSON.stringify(transformedMembers[0], null, 2))
    
    // 分批上传到Supabase (每批50条)
    const batchSize = 50
    for (let i = 0; i < transformedMembers.length; i += batchSize) {
      const batch = transformedMembers.slice(i, i + batchSize)
      console.log(`正在上传第 ${Math.floor(i/batchSize) + 1}/${Math.ceil(transformedMembers.length/batchSize)} 批,共 ${batch.length} 条记录...`)
      
      // 插入数据到Supabase
      const { data, error } = await supabase
        .from('members')
        .insert(batch)
        .select()
      
      if (error) {
        console.error('上传数据到Supabase失败:', error)
      } else {
        console.log(`成功上传 ${data.length} 条记录到Supabase`)
      }
    }
    
    console.log('导入完成!')
    
    // 验证导入结果
    const { data: verifyData, error: verifyError } = await supabase
      .from('members')
      .select('*', { count: 'exact' })
    
    if (verifyError) {
      console.error('验证数据导入失败:', verifyError)
    } else {
      console.log(`Supabase members表现在有 ${verifyData.length} 条记录`)
    }
    
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

migrateMembersToSupabase() 