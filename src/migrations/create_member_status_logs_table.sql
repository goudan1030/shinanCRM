-- 创建会员状态表
CREATE TABLE IF NOT EXISTS member_status_logs (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  member_id BIGINT UNSIGNED NOT NULL,
  old_status VARCHAR(50) NOT NULL,
  new_status VARCHAR(50) NOT NULL,
  reason TEXT,
  notes TEXT,
  operator_id BIGINT UNSIGNED,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (operator_id) REFERENCES admin_users(id)
);

-- 创建会员状态变更触发器
DELIMITER //

DROP TRIGGER IF EXISTS member_status_change_trigger //

CREATE TRIGGER member_status_change_trigger
AFTER UPDATE ON members
FOR EACH ROW
DETERMINISTIC
BEGIN
  IF OLD.status != NEW.status THEN
    INSERT INTO member_status_logs (
      member_id,
      old_status,
      new_status,
      operator_id,
      created_at
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      @current_user_id,
      NOW()
    );
  END IF;
END //

DELIMITER ;