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

  -- 删除会员匹配记录（包括作为目标会员和匹配者的记录）
  DELETE FROM member_matches 
  WHERE member_id = p_member_id 
     OR target_member_id = p_member_id 
     OR matched_by = p_member_id;

  -- 删除会员状态日志
  DELETE FROM member_status_logs 
  WHERE member_id = p_member_id;

  -- 删除会员操作日志
  DELETE FROM member_operation_logs 
  WHERE member_id = p_member_id;

  -- 删除一次性会员支付信息
  DELETE FROM member_one_time_info 
  WHERE member_id = p_member_id;

  -- 删除年费会员支付信息
  DELETE FROM member_annual_info 
  WHERE member_id = p_member_id;

  -- 删除会员类型变更日志
  DELETE FROM member_type_logs 
  WHERE member_id = p_member_id;

  -- 最后删除会员记录
  DELETE FROM members 
  WHERE id = p_member_id;

  COMMIT;
END //

DELIMITER ;