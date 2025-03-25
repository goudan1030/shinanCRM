import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function checkMembersSchema() {
  try {
    console.log('检查Supabase中的members表结构...')
    
    // 创建一个测试记录来检查表结构
    const testData = {
      member_no: 'TEST001',
      type: 'NORMAL',
      status: 'ACTIVE',
      gender: 'male',
      birth_year: 2000,
      self_description: '这是一条测试记录，将在检查完成后删除',
    }
    
    console.log('尝试插入测试记录来检查表结构...')
    const { data: insertData, error: insertError } = await supabase
      .from('members')
      .insert(testData)
      .select()
    
    if (insertError) {
      console.error('无法插入测试记录:', insertError)
      
      // 尝试获取表列信息
      console.log('尝试查询表信息...')
      try {
        // 尝试使用system方法获取表结构
        const { error: systemError } = await supabase
          .rpc('get_table_columns', { table_name: 'members' })
        
        if (systemError) {
          console.log('使用RPC获取表结构失败:', systemError.message)
        }
      } catch (e) {
        console.error('查询表结构时出错:', e)
      }
      
      // 尝试简单查询
      try {
        const { data, error } = await supabase
          .from('members')
          .select('*')
          .limit(1)
        
        if (error) {
          console.error('简单查询失败:', error)
        } else {
          console.log('简单查询成功，返回记录数:', data.length)
          
          // 创建一个最简单的记录尝试插入
          const minimalData = { member_no: 'MINIMAL001' }
          console.log('尝试插入最简单的记录:', minimalData)
          
          const { data: minData, error: minError } = await supabase
            .from('members')
            .insert(minimalData)
            .select()
          
          if (minError) {
            console.error('最简插入失败:', minError)
            
            // 尝试逐个字段测试
            console.log('尝试逐个字段测试...')
            const fields = [
              'member_no', 'type', 'status', 'province', 'city', 
              'district', 'gender', 'target_area', 'birth_year', 
              'height', 'weight', 'education', 'occupation', 
              'house_car', 'hukou_province', 'hukou_city', 
              'children_plan', 'marriage_cert', 'self_description', 
              'partner_requirement', 'remaining_matches', 
              'created_at', 'updated_at', 'wechat', 'phone'
            ]
            
            // 尝试插入包含各种可能的字段的记录
            for (const field of fields) {
              try {
                const testObj: Record<string, any> = { member_no: `FIELD_${field}` }
                testObj[field] = field === 'member_no' ? `FIELD_${field}` : 'test'
                
                console.log(`测试字段 ${field}...`)
                const { error } = await supabase
                  .from('members')
                  .insert(testObj)
                  .select()
                
                if (error) {
                  console.log(`字段 ${field} 测试失败:`, error.message)
                } else {
                  console.log(`字段 ${field} 测试成功`)
                }
              } catch (e) {
                console.error(`测试字段 ${field} 时出错:`, e)
              }
            }
          } else {
            console.log('最简插入成功:', minData)
          }
        }
      } catch (e) {
        console.error('尝试简单查询时出错:', e)
      }
    } else {
      console.log('测试记录插入成功:', insertData)
      
      if (insertData && insertData.length > 0) {
        console.log('表结构如下:')
        console.log(Object.keys(insertData[0]).join(', '))
        
        // 删除测试记录
        const id = insertData[0].id
        console.log(`删除测试记录 ID: ${id}...`)
        
        const { error: deleteError } = await supabase
          .from('members')
          .delete()
          .eq('id', id)
        
        if (deleteError) {
          console.error('删除测试记录失败:', deleteError)
        } else {
          console.log('测试记录已删除')
        }
      }
    }
  } catch (error) {
    console.error('检查过程中出错:', error)
  }
}

checkMembersSchema() 