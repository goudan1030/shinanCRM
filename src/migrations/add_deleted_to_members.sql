-- 为members表添加deleted字段
ALTER TABLE members
ADD COLUMN deleted BOOLEAN NOT NULL DEFAULT FALSE,
ADD INDEX idx_members_deleted (deleted);

-- 更新删除会员的存储过程
DELIMITER //

DROP PROCEDURE IF EXISTS delete_member //

CREATE PROCEDURE delete_member(
  IN p_member_id BIGINT UNSIGNED
)
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  -- 更新会员状态为已删除
  UPDATE members 
  SET 
    deleted = TRUE,
    updated_at = NOW()
  WHERE id = p_member_id;

  -- 记录删除操作
  INSERT INTO member_operation_logs (
    member_id,
    operation_type,
    old_values,
    new_values,
    created_at,
    operator_id
  ) VALUES (
    p_member_id,
    'DELETE',
    JSON_OBJECT(
      'deleted', FALSE
    ),
    JSON_OBJECT(
      'deleted', TRUE
    ),
    NOW(),
    @current_user_id
  );

  COMMIT;
END //

DELIMITER ;