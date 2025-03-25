import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('Supabase Key (前10字符):', 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 10) + '...' : 
  '未设置')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function checkSupabase() {
  try {
    console.log('正在检查Supabase中的members表...')
    
    // 检查members表是否存在
    const { data: membersData, error: membersError } = await supabase
      .from('members')
      .select('*')
      .limit(10)
    
    if (membersError) {
      console.error('获取members表数据失败:', membersError)
      return
    }
    
    console.log(`members表存在，获取到 ${membersData.length} 条记录`)
    
    if (membersData.length > 0) {
      console.log('示例数据:', JSON.stringify(membersData[0], null, 2))
      console.log('表结构字段:', Object.keys(membersData[0]).join(', '))
    } else {
      // 尝试查询所有数据
      const { count, error: countError } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
      
      if (countError) {
        console.error('计数查询失败:', countError)
      } else {
        console.log(`members表总记录数: ${count}`)
      }
      
      // 尝试查看大一点的数据范围
      console.log('尝试获取更多记录...')
      const { data: moreData, error: moreError } = await supabase
        .from('members')
        .select('*')
        .limit(100)
      
      if (moreError) {
        console.error('获取更多数据失败:', moreError)
      } else {
        console.log(`扩大范围查询到 ${moreData.length} 条记录`)
        if (moreData.length > 0) {
          console.log('找到数据！示例:', JSON.stringify(moreData[0], null, 2))
        }
      }
    }
    
    // 检查表结构
    console.log('尝试检查表结构...')
    // 可惜JavaScript客户端不能直接获取表结构，
    // 只能从返回的数据中推断
  } catch (error) {
    console.error('检查过程出错:', error)
  }
}

checkSupabase() 