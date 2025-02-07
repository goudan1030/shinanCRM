-- 添加 target_member_id 和 matched_by 字段到 member_matches 表
ALTER TABLE member_matches
ADD COLUMN IF NOT EXISTS target_member_id UUID REFERENCES members(id);

-- 添加 matched_by 字段
ALTER TABLE member_matches
ADD COLUMN IF NOT EXISTS matched_by UUID REFERENCES auth.users(id);

-- 更新会员匹配存储过程
CREATE OR REPLACE FUNCTION match_members(
  p_member_id UUID,
  p_target_member_no VARCHAR,
  p_matched_by UUID
) RETURNS void AS $$
DECLARE
  v_target_member_id UUID;
  v_member_type VARCHAR;
  v_member_status VARCHAR;
  v_target_member_status VARCHAR;
  v_remaining_matches INTEGER;
BEGIN
  -- 获取目标会员ID
  SELECT id, status
  INTO v_target_member_id, v_target_member_status
  FROM members
  WHERE member_no = p_target_member_no;

  -- 如果目标会员不存在，抛出异常
  IF v_target_member_id IS NULL THEN
    RAISE EXCEPTION '目标会员不存在';
  END IF;

  -- 获取当前会员信息
  SELECT type, status, remaining_matches
  INTO v_member_type, v_member_status, v_remaining_matches
  FROM members
  WHERE id = p_member_id;

  -- 如果当前会员不存在，抛出异常
  IF v_member_type IS NULL THEN
    RAISE EXCEPTION '会员不存在';
  END IF;

  -- 检查会员状态
  IF v_member_status != 'ACTIVE' THEN
    RAISE EXCEPTION '只能匹配激活状态的会员';
  END IF;

  IF v_target_member_status != 'ACTIVE' THEN
    RAISE EXCEPTION '目标会员未激活';
  END IF;

  -- 检查是否为自己
  IF p_member_id = v_target_member_id THEN
    RAISE EXCEPTION '不能与自己匹配';
  END IF;

  -- 检查剩余匹配次数
  IF v_remaining_matches <= 0 THEN
    RAISE EXCEPTION '剩余匹配次数不足';
  END IF;

  -- 检查是否已经匹配过
  IF EXISTS (
    SELECT 1 FROM member_matches
    WHERE (member_id = p_member_id AND target_member_id = v_target_member_id)
    OR (member_id = v_target_member_id AND target_member_id = p_member_id)
  ) THEN
    RAISE EXCEPTION '已经与该会员匹配过';
  END IF;

  -- 创建匹配记录
  INSERT INTO member_matches (
    id,
    member_id,
    target_member_id,
    matched_by,
    operator_id,
    match_no,
    match_time,
    created_at
  ) VALUES (
    uuid_generate_v4(),
    p_member_id,
    v_target_member_id,
    p_matched_by,
    p_matched_by,
    'M' || to_char(NOW(), 'YYYYMMDD') || lpad(nextval('match_no_seq')::text, 4, '0'),
    NOW(),
    NOW()
  );

  -- 更新当前会员剩余匹配次数
  UPDATE members
  SET 
    remaining_matches = remaining_matches - 1,
    updated_at = NOW()
  WHERE id = p_member_id;

END;
$$ LANGUAGE plpgsql;