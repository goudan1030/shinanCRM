import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

console.log('Supabase URL:', supabaseUrl)
console.log('使用service_role密钥检查Supabase会员表...')

if (!supabaseServiceRoleKey) {
  console.error('请确保.env文件中设置了SUPABASE_SERVICE_ROLE_KEY')
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function checkMembers() {
  try {
    console.log('检查表 members...')
    
    // 使用service_role密钥查询members表
    const { data, error, count } = await supabase
      .from('members')
      .select('*', { count: 'exact' })
      .limit(5)
    
    if (error) {
      console.error('查询members表失败:', error.message)
    } else {
      console.log(`表 members 存在,包含 ${count} 条记录`)
      if (data && data.length > 0) {
        console.log('示例数据:', JSON.stringify(data[0], null, 2))
      } else {
        console.log('表中没有数据')
      }
    }
    
    // 获取所有记录数
    const { count: totalCount, error: countError } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
    
    if (countError) {
      console.error('获取总记录数失败:', countError.message)
    } else {
      console.log(`表 members 总记录数: ${totalCount}`)
    }

  } catch (error) {
    console.error('检查过程中发生错误:', error)
  }
}

checkMembers() 