import { createClient } from '@supabase/supabase-js'
import { createObjectCsvWriter } from 'csv-writer'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function exportToCsv() {
  // 1. 获取数据
  const { data: members, error } = await supabase
    .from('members')
    .select('*')
  
  if (error) throw error

  // 2. 创建CSV writer
  const csvWriter = createObjectCsvWriter({
    path: './members.csv',
    header: [
      // 定义你需要的字段
      {id: 'id', title: 'id'},
      {id: 'member_no', title: 'member_no'},
      // ... 其他字段
    ]
  })

  // 3. 写入CSV
  await csvWriter.writeRecords(members)
  console.log('CSV文件已生成')
}

exportToCsv() 