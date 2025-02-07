-- 更新年费会员的剩余匹配次数设置

-- 1. 更新现有年费会员的剩余匹配次数为1
UPDATE members
SET remaining_matches = 1
WHERE type = 'ANNUAL';

-- 2. 修改会员升级函数，设置年费会员的初始匹配次数为1
CREATE OR REPLACE FUNCTION upgrade_member(
  p_member_id UUID,
  p_type VARCHAR,
  p_payment_time TIMESTAMP,
  p_expiry_time TIMESTAMP DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_old_type VARCHAR;
  v_old_status VARCHAR;
BEGIN
  -- 获取当前会员类型和状态
  SELECT type, status INTO v_old_type, v_old_status
  FROM members
  WHERE id = p_member_id;

  -- 如果会员不存在，抛出异常
  IF NOT FOUND THEN
    RAISE EXCEPTION '会员不存在';
  END IF;

  -- 如果会员状态不是激活状态，抛出异常
  IF v_old_status != 'ACTIVE' THEN
    RAISE EXCEPTION '只能升级激活状态的会员';
  END IF;

  -- 如果会员类型与目标类型相同，抛出异常
  IF v_old_type = p_type THEN
    RAISE EXCEPTION '会员已经是该类型';
  END IF;

  -- 更新会员类型和相关信息
  UPDATE members
  SET 
    type = p_type,
    payment_time = p_payment_time,
    expiry_time = p_expiry_time,
    remaining_matches = CASE 
      WHEN p_type = 'ONE_TIME' THEN 3
      WHEN p_type = 'ANNUAL' THEN 1
      ELSE remaining_matches
    END,
    updated_at = NOW()
  WHERE id = p_member_id;

  -- 记录类型变更
  INSERT INTO member_type_logs (
    id,
    member_id,
    old_type,
    new_type,
    payment_time,
    expiry_time,
    notes,
    created_at
  ) VALUES (
    uuid_generate_v4(),
    p_member_id,
    v_old_type,
    p_type,
    p_payment_time,
    p_expiry_time,
    p_notes,
    NOW()
  );
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

-- 4. 创建并启用 cron 扩展
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 5. 创建每日0点触发的定时任务
SELECT cron.schedule(
  'reset-annual-member-matches',  -- 任务名称
  '0 0 * * *',                   -- 每天0点执行
  $$SELECT reset_annual_member_matches()$$
);