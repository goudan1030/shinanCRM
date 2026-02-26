DROP PROCEDURE IF EXISTS upgrade_member;

DELIMITER //

CREATE PROCEDURE upgrade_member(
  p_member_id BIGINT,
  p_type VARCHAR(50),
  p_payment_time DATETIME,
  p_expiry_time DATETIME,
  p_notes TEXT
)
BEGIN
  DECLARE v_old_type VARCHAR(50);
  DECLARE v_old_status VARCHAR(50);

  -- 获取当前会员类型和状态
  SELECT type, status INTO v_old_type, v_old_status
  FROM members
  WHERE id = p_member_id;

  -- 如果会员不存在，抛出异常
  IF v_old_type IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '会员不存在';
  END IF;

  -- 如果会员状态不是激活状态，抛出异常
  IF v_old_status != 'ACTIVE' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '只能升级激活状态的会员';
  END IF;

  -- 如果会员类型与目标类型相同，抛出异常
  IF v_old_type = p_type THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '会员已经是该类型';
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
  ELSEIF p_type = 'ANNUAL' THEN
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
    member_id,
    old_type,
    new_type,
    payment_time,
    expiry_time,
    notes,
    created_at
  ) VALUES (
    p_member_id,
    v_old_type,
    p_type,
    p_payment_time,
    p_expiry_time,
    p_notes,
    NOW()
  );

  -- 记录操作日志
  INSERT INTO member_operation_logs (
    member_id,
    operation_type,
    old_values,
    new_values,
    notes,
    created_at,
    operator_id
  ) VALUES (
    p_member_id,
    'UPGRADE',
    JSON_OBJECT(
      'type', v_old_type,
      'remaining_matches', (SELECT remaining_matches FROM members WHERE id = p_member_id)
    ),
    JSON_OBJECT(
      'type', p_type,
      'remaining_matches', CASE 
        WHEN p_type = 'ONE_TIME' THEN 3
        WHEN p_type = 'ANNUAL' THEN 1
        ELSE (SELECT remaining_matches FROM members WHERE id = p_member_id)
      END
    ),
    p_notes,
    NOW(),
    @current_user_id
  );
END //

DELIMITER ;
