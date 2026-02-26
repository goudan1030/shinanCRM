const mysql = require('mysql2/promise');

// 设置数据库连接信息
const DB_CONFIG = {
  host: 'localhost',
  port: 3306,
  user: 'h5_cloud_user',
  password: 'mc72TNcMmy6HCybH',
  database: 'h5_cloud_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

async function fixDeleteMember() {
  console.log('==== 会员删除功能修复工具 ====');
  
  let connection;
  try {
    // 创建连接
    console.log('连接到数据库...');
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✅ 数据库连接成功');
    
    // 1. 检查会员表结构
    console.log('\n检查会员表结构...');
    const [membersColumns] = await connection.query('SHOW COLUMNS FROM members');
    
    // 检查是否有软删除相关的列
    const existingColumns = membersColumns.map(col => col.Field.toLowerCase());
    console.log('已有列:', existingColumns.join(', '));
    
    // 判断是否需要添加软删除字段
    const hasIsDeleted = existingColumns.includes('is_deleted');
    const hasDeletedAt = existingColumns.includes('deleted_at');
    
    let needAlterTable = false;
    let alterTableSql = 'ALTER TABLE members';
    
    if (!hasIsDeleted) {
      console.log('需要添加 is_deleted 列');
      alterTableSql += ' ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0 COMMENT "是否已删除: 0-否 1-是"';
      needAlterTable = true;
    }
    
    if (!hasDeletedAt) {
      console.log('需要添加 deleted_at 列');
      if (needAlterTable) {
        alterTableSql += ',';
      }
      alterTableSql += ' ADD COLUMN deleted_at DATETIME NULL COMMENT "删除时间"';
      needAlterTable = true;
    }
    
    // 修改表结构
    if (needAlterTable) {
      console.log('修改会员表结构...');
      await connection.query(alterTableSql);
      console.log('✅ 表结构修改成功');
    } else {
      console.log('✅ 表结构已包含软删除所需字段');
    }
    
    // 2. 检查和创建存储过程
    console.log('\n检查 delete_member 存储过程...');
    const [procedures] = await connection.query(
      `SELECT ROUTINE_NAME FROM INFORMATION_SCHEMA.ROUTINES 
       WHERE ROUTINE_TYPE='PROCEDURE' AND ROUTINE_SCHEMA=? AND ROUTINE_NAME='delete_member'`,
      [DB_CONFIG.database]
    );
    
    // 删除已存在的存储过程
    if (procedures.length > 0) {
      console.log('删除已存在的存储过程...');
      await connection.query('DROP PROCEDURE IF EXISTS delete_member');
      console.log('✅ 已删除旧的存储过程');
    }
    
    // 创建新的存储过程
    console.log('创建新的 delete_member 存储过程...');
    
    const createProcedureSql = `
    CREATE PROCEDURE delete_member(IN member_id INT)
    BEGIN
      DECLARE member_exists INT DEFAULT 0;
      
      -- 检查会员是否存在
      SELECT COUNT(*) INTO member_exists FROM members WHERE id = member_id;
      
      IF member_exists > 0 THEN
        -- 更新会员为删除状态
        UPDATE members 
        SET is_deleted = 1, 
            deleted_at = NOW(), 
            updated_at = NOW()
        WHERE id = member_id;
        
        -- 记录会员操作日志
        INSERT INTO member_operation_logs (
          member_id, 
          operation_type, 
          notes, 
          created_at
        ) VALUES (
          member_id, 
          'DELETE', 
          '会员已删除', 
          NOW()
        );
        
        -- 返回操作成功
        SELECT 'success' as result;
      ELSE
        -- 会员不存在，返回错误
        SELECT 'member_not_found' as result;
      END IF;
    END
    `;
    
    await connection.query(createProcedureSql);
    console.log('✅ 存储过程创建成功');
    
    // 3. 检查操作日志表是否存在
    console.log('\n检查会员操作日志表...');
    const [tables] = await connection.query(
      `SHOW TABLES LIKE 'member_operation_logs'`
    );
    
    if (tables.length === 0) {
      console.log('创建会员操作日志表...');
      const createLogTableSql = `
      CREATE TABLE member_operation_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        member_id INT NOT NULL COMMENT '会员ID',
        operation_type VARCHAR(20) NOT NULL COMMENT '操作类型: ADD-新增 DELETE-删除 UPDATE-更新 REVOKE-撤销',
        notes TEXT COMMENT '操作备注',
        created_at DATETIME NOT NULL COMMENT '操作时间',
        operator_id INT COMMENT '操作人ID',
        operator_name VARCHAR(50) COMMENT '操作人姓名'
      ) COMMENT='会员操作日志表';
      `;
      
      await connection.query(createLogTableSql);
      console.log('✅ 会员操作日志表创建成功');
    } else {
      console.log('✅ 会员操作日志表已存在');
    }
    
    // 4. 测试恢复被误删的会员
    console.log('\n是否需要恢复被误删的会员？(y/n)');
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    readline.question('请输入 y 或 n: ', async (answer) => {
      if (answer.toLowerCase() === 'y') {
        console.log('恢复被误删的会员...');
        
        // 查询被撤销的会员
        const [revokedMembers] = await connection.query(
          `SELECT id, name FROM members WHERE status = 'REVOKED'`
        );
        
        if (revokedMembers.length > 0) {
          console.log(`找到 ${revokedMembers.length} 个已撤销的会员:`);
          revokedMembers.forEach((member, index) => {
            console.log(`${index + 1}. ID: ${member.id}, 姓名: ${member.name || '未知'}`);
          });
          
          console.log('\n这些会员目前是否被标记为已删除但实际未删除？');
          console.log('如果是，我们将确保这些会员的 is_deleted 字段设置为 0');
          
          console.log('正在更新...');
          await connection.query(
            `UPDATE members SET is_deleted = 0, deleted_at = NULL WHERE status = 'REVOKED'`
          );
          console.log('✅ 已恢复被撤销的会员');
        } else {
          console.log('未找到已撤销的会员');
        }
      }
      
      readline.close();
      await connection.end();
      console.log('\n==== 会员删除功能修复完成 ====');
      console.log('现在您应该能够正常删除会员了');
    });
    
  } catch (error) {
    console.error('修复过程中出错:', error);
    if (connection) {
      await connection.end();
    }
  }
}

fixDeleteMember().catch(console.error); 