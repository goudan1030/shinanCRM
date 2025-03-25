import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
// 使用service_role密钥而不是anon密钥
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

console.log('Supabase URL:', supabaseUrl)
console.log('检查Supabase中的会员表情况...')

if (!supabaseServiceRoleKey) {
  console.error('请确保.env文件中设置了SUPABASE_SERVICE_ROLE_KEY')
}

// 使用service_role密钥创建客户端
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function checkMembers() {
  try {
    console.log('检查Supabase中的会员表情况...')

    // 尝试不同的表名
    const tablesToCheck = [
      'members',   // 主表名
      'member',    // 单数形式
      'users',     // 可能的用户表
      'profiles',  // 可能的配置文件表
      'customers', // 可能的客户表
      'clients'    // 可能的客户端表
    ]

    for (const tableName of tablesToCheck) {
      try {
        console.log(`检查表 ${tableName}...`)
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(5)

        if (error) {
          console.log(`表 ${tableName} 不存在或无法访问:`, error.message)
          continue
        }

        console.log(`表 ${tableName} 存在,包含 ${data.length} 条记录`)
        
        if (data.length > 0) {
          console.log('示例数据:', JSON.stringify(data[0], null, 2))
          console.log('表结构:', Object.keys(data[0]).join(', '))
        }
        
        // 尝试获取所有记录数
        try {
          const { count, error: countError } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true })
            
          if (countError) {
            console.log(`无法获取 ${tableName} 表的记录数量:`, countError.message)
          } else {
            console.log(`表 ${tableName} 总记录数: ${count}`)
          }
        } catch (e) {
          console.error(`获取 ${tableName} 记录数时出错:`, e)
        }
      } catch (e) {
        console.error(`检查表 ${tableName} 时出错:`, e) 
      }
    }

    // 尝试通过RPC获取所有表
    try {
      console.log('尝试获取所有可用的表...')
      const { data, error } = await supabase.rpc('get_schemas')
      
      if (error) {
        console.log('通过RPC获取表架构失败:', error.message)
      } else {
        console.log('找到的模式:', data)
      }
    } catch (e) {
      console.error('获取模式信息时出错:', e)
    }

  } catch (error) {
    console.error('检查过程中出错:', error)
  }
}

checkMembers() 