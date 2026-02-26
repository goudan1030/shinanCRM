-- 创建会员激活存储过程
CREATE OR REPLACE FUNCTION activate_member(
  p_member_id UUID,
  p_reason TEXT,
  p_notes TEXT DEFAULT NULL,
  p_activated_by UUID DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_old_status VARCHAR;
BEGIN
  -- 设置当前用户ID到会话变量
  PERFORM set_config('app.current_user_id', p_activated_by::text, FALSE);

  -- 获取当前会员状态
  SELECT status INTO v_old_status
  FROM members
  WHERE id = p_member_id;

  -- 如果会员不存在，抛出异常
  IF NOT FOUND THEN
    RAISE EXCEPTION '会员不存在';
  END IF;

  -- 如果会员状态不是已撤销，抛出异常
  IF v_old_status != 'REVOKED' THEN
    RAISE EXCEPTION '只能激活已撤销的会员';
  END IF;

  -- 更新会员状态为激活
  UPDATE members
  SET 
    status = 'ACTIVE',
    updated_at = NOW()
  WHERE id = p_member_id;

  -- 记录状态变更
  INSERT INTO member_status_logs (
    id,
    member_id,
    old_status,
    new_status,
    reason,
    created_at,
    operator_id
  ) VALUES (
    uuid_generate_v4(),
    p_member_id,
    v_old_status,
    'ACTIVE',
    p_reason,
    NOW(),
    p_activated_by
  );
END;
$$ LANGUAGE plpgsql;