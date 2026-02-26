-- 创建会员操作日志插入触发器

DELIMITER //

CREATE TRIGGER member_operation_log_insert_trigger
AFTER INSERT ON members
FOR EACH ROW
BEGIN
  DECLARE new_values JSON;
  
  SET new_values = JSON_OBJECT(
    'id', NEW.id,
    'status', NEW.status,
    'type', NEW.type,
    'remaining_matches', NEW.remaining_matches
  );

  INSERT INTO member_operation_logs (
    member_id,
    operation_type,
    old_values,
    new_values,
    created_at,
    operator_id
  ) VALUES (
    NEW.id,
    'INSERT',
    NULL,
    new_values,
    NOW(),
    @current_user_id
  );
END //

-- 创建会员操作日志更新触发器
CREATE TRIGGER member_operation_log_update_trigger
AFTER UPDATE ON members
FOR EACH ROW
BEGIN
  DECLARE old_values JSON;
  DECLARE new_values JSON;
  
  SET old_values = JSON_OBJECT(
    'id', OLD.id,
    'status', OLD.status,
    'type', OLD.type,
    'remaining_matches', OLD.remaining_matches
  );
  
  SET new_values = JSON_OBJECT(
    'id', NEW.id,
    'status', NEW.status,
    'type', NEW.type,
    'remaining_matches', NEW.remaining_matches
  );

  INSERT INTO member_operation_logs (
    member_id,
    operation_type,
    old_values,
    new_values,
    created_at,
    operator_id
  ) VALUES (
    NEW.id,
    'UPDATE',
    old_values,
    new_values,
    NOW(),
    @current_user_id
  );
END //

-- 创建会员操作日志删除触发器
CREATE TRIGGER member_operation_log_delete_trigger
AFTER DELETE ON members
FOR EACH ROW
BEGIN
  DECLARE old_values JSON;
  
  SET old_values = JSON_OBJECT(
    'id', OLD.id,
    'status', OLD.status,
    'type', OLD.type,
    'remaining_matches', OLD.remaining_matches
  );

  INSERT INTO member_operation_logs (
    member_id,
    operation_type,
    old_values,
    new_values,
    created_at,
    operator_id
  ) VALUES (
    OLD.id,
    'DELETE',
    old_values,
    NULL,
    NOW(),
    @current_user_id
  );
END //

DELIMITER ;
