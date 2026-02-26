import { createClient } from '@supabase/supabase-js'
import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)

// 使用service_role密钥而不是anon密钥
// 注意: service_role密钥具有绕过RLS策略的能力,应当保密
console.log('使用service_role密钥访问Supabase...')
console.log('请确保.env文件中设置了SUPABASE_SERVICE_ROLE_KEY')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',  // 使用service_role密钥
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
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
        // 排除特定字段
        if (key === 'id') {
          // 跳过,让Supabase自动生成ID 
          continue
        } else if (key === 'deleted') {
          // 排除deleted字段,因为Supabase members表没有这个字段
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
    console.log('转换后示例(排除deleted字段):', JSON.stringify(transformedMembers[0], null, 2))
    
    // 测试是否可以访问和写入Supabase
    console.log('Testing connection to Supabase...');
    const { error: testError } = await supabase
      .from('members')
      .insert([{ member_no: 'TEST_CONNECTION' }]);
    
    if (testError) {
      console.error('无法访问Supabase members表:', testError)
      console.log('请确保使用有效的service_role密钥并设置在.env文件中')
      return
    }
    
    console.log('Supabase访问测试成功')
    
    // 分批上传到Supabase (每批20条)
    const batchSize = 20
    for (let i = 0; i < transformedMembers.length; i += batchSize) {
      const batch = transformedMembers.slice(i, i + batchSize)
      console.log(`正在上传第 ${Math.floor(i/batchSize) + 1}/${Math.ceil(transformedMembers.length/batchSize)} 批,共 ${batch.length} 条记录...`)
      
      // 插入数据到Supabase
      const { error } = await supabase
        .from('members')
        .insert(batch)
      
      if (error) {
        console.error('上传数据到Supabase失败:', error)
        
        // 尝试单条插入
        console.log('尝试单条记录插入...')
        for (const record of batch) {
          const { error: singleError } = await supabase
            .from('members')
            .insert(record)
          
          if (singleError) {
            console.error(`记录 ${record.member_no} 插入失败:`, singleError)
          } else {
            console.log(`记录 ${record.member_no} 插入成功`)
          }
        }
      } else {
        console.log(`成功上传第 ${Math.floor(i/batchSize) + 1} 批数据`)
      }
      
      // 避免API限制,添加短暂延迟
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    console.log('导入完成!')
    
    // 验证导入结果
    console.log('Verifying import...');
    const { error: verifyError } = await supabase
      .from('members')
      .select('*', { count: 'exact' });
    
    if (verifyError) {
      console.error('验证数据导入失败:', verifyError)
    } else {
      console.log(`Supabase members表现在有记录`)
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