-- 更新会员升级函数，将支付信息存储到对应的表中
DROP FUNCTION IF EXISTS upgrade_member(UUID, VARCHAR, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, TEXT);

CREATE OR REPLACE FUNCTION upgrade_member(
  p_member_id UUID,
  p_type VARCHAR,
  p_payment_time TIMESTAMP WITH TIME ZONE,
  p_expiry_time TIMESTAMP WITH TIME ZONE DEFAULT NULL,
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

  -- 如果会员类型与目标类型相同，或者是从年费会员降级到一次性会员，抛出异常
  IF v_old_type = p_type OR (v_old_type = 'ANNUAL' AND p_type = 'ONE_TIME') THEN
    RAISE EXCEPTION '不允许的会员类型变更';
  END IF;

  -- 更新会员类型和相关信息
  UPDATE members
  SET 
    type = p_type,
    remaining_matches = CASE 
      WHEN p_type = 'ONE_TIME' THEN 3
      WHEN p_type = 'ANNUAL' THEN 1
      ELSE remaining_matches
    END,
    updated_at = NOW()
  WHERE id = p_member_id;

  -- 根据会员类型存储支付信息
  IF p_type = 'ONE_TIME' THEN
    INSERT INTO member_one_time_info (
      member_id,
      payment_time
    ) VALUES (
      p_member_id,
      p_payment_time
    );
  ELSIF p_type = 'ANNUAL' THEN
    INSERT INTO member_annual_info (
      member_id,
      payment_time,
      expiry_time
    ) VALUES (
      p_member_id,
      p_payment_time,
      p_expiry_time
    );
  END IF;

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