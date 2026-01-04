const { executeQuery } = require('../src/lib/database-netlify');

/**
 * 批量更新用户状态：根据资料完善情况自动更新状态
 * - registered = 1 且 status = temporary → 更新为 active
 * - registered = 0 且 status = active → 更新为 temporary（但disabled状态保持不变）
 */
async function updateUsersStatusByRegistered() {
  try {
    console.log('🚀 开始批量更新用户状态...');
    
    // 1. 统计需要更新的用户
    const [countResult1] = await executeQuery(
      'SELECT COUNT(*) as count FROM users WHERE registered = 1 AND status = "temporary"'
    );
    const count1 = Array.isArray(countResult1) && countResult1[0] && typeof countResult1[0] === 'object' && 'count' in countResult1[0]
      ? Number((countResult1[0] as any).count) || 0
      : 0;
    
    const [countResult2] = await executeQuery(
      'SELECT COUNT(*) as count FROM users WHERE registered = 0 AND status = "active"'
    );
    const count2 = Array.isArray(countResult2) && countResult2[0] && typeof countResult2[0] === 'object' && 'count' in countResult2[0]
      ? Number((countResult2[0] as any).count) || 0
      : 0;
    
    console.log(`📊 找到 ${count1} 个已完善资料但状态为temporary的用户`);
    console.log(`📊 找到 ${count2} 个未完善资料但状态为active的用户`);
    
    if (count1 === 0 && count2 === 0) {
      console.log('✅ 没有需要更新的用户');
      return;
    }
    
    // 2. 显示更新前的状态统计
    const [beforeStats] = await executeQuery(
      'SELECT status, COUNT(*) as count FROM users GROUP BY status'
    );
    console.log('📈 更新前的状态统计:');
    console.table(beforeStats);
    
    // 3. 执行更新：已完善资料的用户更新为active
    if (count1 > 0) {
      const [updateResult1] = await executeQuery(
        'UPDATE users SET status = "active", updated_at = NOW() WHERE registered = 1 AND status = "temporary"'
      );
      console.log(`✅ 成功更新了 ${(updateResult1 as any).affectedRows || 0} 个用户的状态为 active`);
    }
    
    // 4. 执行更新：未完善资料的用户更新为temporary（但disabled状态保持不变）
    if (count2 > 0) {
      const [updateResult2] = await executeQuery(
        'UPDATE users SET status = "temporary", updated_at = NOW() WHERE registered = 0 AND status = "active"'
      );
      console.log(`✅ 成功更新了 ${(updateResult2 as any).affectedRows || 0} 个用户的状态为 temporary`);
    }
    
    // 5. 显示更新后的状态统计
    const [afterStats] = await executeQuery(
      'SELECT status, COUNT(*) as count FROM users GROUP BY status'
    );
    console.log('📈 更新后的状态统计:');
    console.table(afterStats);
    
    // 6. 验证更新结果
    const [verifyResult1] = await executeQuery(
      'SELECT COUNT(*) as count FROM users WHERE registered = 1 AND status = "active"'
    );
    const [verifyResult2] = await executeQuery(
      'SELECT COUNT(*) as count FROM users WHERE registered = 0 AND status = "temporary"'
    );
    console.log(`🔍 验证结果: ${(verifyResult1 as any[])[0]?.count || 0} 个 registered=1 的用户现在是 active 状态`);
    console.log(`🔍 验证结果: ${(verifyResult2 as any[])[0]?.count || 0} 个 registered=0 的用户现在是 temporary 状态`);
    
    console.log('✅ 批量更新完成！');
  } catch (error) {
    console.error('❌ 批量更新失败:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  updateUsersStatusByRegistered()
    .then(() => {
      console.log('✅ 脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { updateUsersStatusByRegistered };
