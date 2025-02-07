-- 重置会员的剩余匹配次数

-- 1. 更新所有会员的剩余匹配次数
UPDATE members
SET 
  remaining_matches = CASE
    WHEN type = 'NORMAL' AND gender = 'FEMALE' THEN 1
    WHEN type = 'NORMAL' AND gender = 'MALE' THEN 0
    WHEN type = 'ONE_TIME' THEN 3
    WHEN type = 'ANNUAL' THEN 1
    ELSE remaining_matches
  END,
  updated_at = NOW();

-- 强制更新所有普通男性会员的匹配次数为0
UPDATE members
SET 
  remaining_matches = 0,
  updated_at = NOW()
WHERE type = 'NORMAL' AND gender = 'MALE';

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

-- 3. 创建每日重置年费会员匹配次数的函数
CREATE OR REPLACE FUNCTION reset_annual_member_matches()
RETURNS void AS $$
BEGIN
  UPDATE members
  SET 
    remaining_matches = 1,
    updated_at = NOW()
  WHERE type = 'ANNUAL';
END;
$$ LANGUAGE plpgsql;

-- 4. 创建并启用 cron 扩展（如果尚未创建）
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 5. 删除可能存在的旧定时任务
DO $$
BEGIN
  BEGIN
    PERFORM cron.unschedule('reset-female-normal-member-matches');
    PERFORM cron.unschedule('reset-annual-member-matches');
  EXCEPTION
    WHEN OTHERS THEN
      -- 如果任务不存在，忽略错误
  END;
END $$;

-- 6. 创建定时任务
-- 每周一0点重置女性普通会员匹配次数
SELECT cron.schedule(
  'reset-female-normal-member-matches',  -- 任务名称
  '0 0 * * 1',                         -- 每周一0点执行
  'SELECT reset_female_normal_member_matches()'  -- 执行的SQL命令
);

-- 每日0点重置年费会员匹配次数
SELECT cron.schedule(
  'reset-annual-member-matches',  -- 任务名称
  '0 0 * * *',                   -- 每天0点执行
  'SELECT reset_annual_member_matches()'  -- 执行的SQL命令
);