-- 更新女性普通会员的匹配次数管理机制

-- 1. 更新现有女性普通会员的剩余匹配次数为1
UPDATE members
SET 
  remaining_matches = 1,
  updated_at = NOW()
WHERE type = 'NORMAL' AND gender = 'FEMALE';

-- 强制更新所有不符合条件的记录
UPDATE members
SET remaining_matches = 999999
WHERE type != 'NORMAL' OR gender != 'FEMALE';

-- 2. 创建每周一重置女性普通会员匹配次数的函数
CREATE OR REPLACE FUNCTION reset_female_normal_member_matches()
RETURNS void AS $$
BEGIN
  UPDATE members
  SET 
    remaining_matches = 1,
    updated_at = NOW()
  WHERE type = 'NORMAL' AND gender = 'FEMALE';
END;
$$ LANGUAGE plpgsql;

-- 3. 创建并启用 cron 扩展（如果尚未创建）
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 4. 删除可能存在的旧定时任务（使用 try-catch 处理不存在的情况）
DO $$
BEGIN
  BEGIN
    PERFORM cron.unschedule('reset-female-normal-member-matches');
  EXCEPTION
    WHEN OTHERS THEN
      -- 如果任务不存在，忽略错误
  END;
END $$;

-- 5. 创建每周一0点触发的定时任务
SELECT cron.schedule(
  'reset-female-normal-member-matches',  -- 任务名称
  '0 0 * * 1',                         -- 每周一0点执行
  'SELECT reset_female_normal_member_matches()'  -- 执行的SQL命令
);