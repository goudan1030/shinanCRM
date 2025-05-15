const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkDeleteProcedure() {
  console.log('==== 检查会员删除存储过程 ====');
  
  try {
    // 创建连接
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'h5_cloud_user',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'h5_cloud_db'
    });
    
    console.log('✅ 数据库连接成功');
    
    // 检查存储过程是否存在
    const [procedures] = await connection.query(
      "SELECT ROUTINE_NAME FROM INFORMATION_SCHEMA.ROUTINES WHERE ROUTINE_TYPE='PROCEDURE' AND ROUTINE_SCHEMA=?",
      [process.env.DB_NAME || 'h5_cloud_db']
    );
    
    const procedureExists = procedures.some(proc => proc.ROUTINE_NAME === 'delete_member');
    
    if (procedureExists) {
      console.log('✅ delete_member 存储过程存在');
      
      // 获取存储过程定义
      const [procedureDefinition] = await connection.query(
        "SHOW CREATE PROCEDURE delete_member"
      );
      
      console.log('\n存储过程定义:');
      console.log(procedureDefinition[0]['Create Procedure']);
      
      // 执行测试查询，检查表结构
      console.log('\n检查 members 表结构:');
      const [membersColumns] = await connection.query(
        "SHOW COLUMNS FROM members"
      );
      
      console.log('members 表列:');
      membersColumns.forEach(column => {
        console.log(`- ${column.Field}: ${column.Type} ${column.Null === 'NO' ? '(非空)' : ''} ${column.Key === 'PRI' ? '(主键)' : ''}`);
      });
      
      // 检查是否有软删除相关的列
      const hasDeletedColumn = membersColumns.some(column => 
        ['is_deleted', 'deleted_at', 'deleted', 'is_active'].includes(column.Field.toLowerCase())
      );
      
      if (hasDeletedColumn) {
        console.log('\n✅ members 表包含软删除相关列');
      } else {
        console.log('\n❌ members 表不包含软删除相关列，可能无法实现逻辑删除');
      }
      
      // 检查相关日志表
      console.log('\n检查会员操作日志表:');
      try {
        const [logTables] = await connection.query(
          "SHOW TABLES LIKE '%log%'"
        );
        
        console.log('找到以下可能的日志表:');
        logTables.forEach(table => {
          console.log(`- ${Object.values(table)[0]}`);
        });
      } catch (error) {
        console.error('检查日志表时出错:', error.message);
      }
      
    } else {
      console.log('❌ delete_member 存储过程不存在!');
      
      // 检查是否有其他与删除相关的存储过程
      const deleteProcedures = procedures.filter(proc => 
        proc.ROUTINE_NAME.toLowerCase().includes('delete')
      );
      
      if (deleteProcedures.length > 0) {
        console.log('\n找到其他与删除相关的存储过程:');
        deleteProcedures.forEach(proc => {
          console.log(`- ${proc.ROUTINE_NAME}`);
        });
      } else {
        console.log('\n没有找到其他与删除相关的存储过程');
      }
    }
    
    // 关闭连接
    await connection.end();
    
  } catch (error) {
    console.error('检查存储过程时出错:', error);
  }
}

checkDeleteProcedure().catch(console.error); 