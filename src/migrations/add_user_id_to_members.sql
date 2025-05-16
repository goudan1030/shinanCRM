-- 为members表添加user_id字段，并建立与users表的外键关系
ALTER TABLE members
ADD COLUMN user_id BIGINT DEFAULT NULL,
ADD CONSTRAINT fk_members_user_id FOREIGN KEY (user_id) REFERENCES users(id),
ADD INDEX idx_members_user_id (user_id);

-- 创建一个存储过程，用于更新会员与用户的关联关系
DELIMITER //

CREATE PROCEDURE update_member_user_relation(
  IN p_member_id BIGINT UNSIGNED,
  IN p_user_id BIGINT
)
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
  
  -- 更新会员表的user_id字段
  UPDATE members 
  SET 
    user_id = p_user_id,
    updated_at = NOW()
  WHERE id = p_member_id;

  -- 记录操作日志
  INSERT INTO member_operation_logs (
    member_id,
    operation_type,
    old_values,
    new_values,
    created_at,
    operator_id
  ) VALUES (
    p_member_id,
    'UPDATE_USER_RELATION',
    JSON_OBJECT(
      'user_id', (SELECT user_id FROM members WHERE id = p_member_id)
    ),
    JSON_OBJECT(
      'user_id', p_user_id
    ),
    NOW(),
    @current_user_id
  );

  COMMIT;
END //

DELIMITER ;

-- 创建一个视图，方便查询用户和会员的关联信息
CREATE OR REPLACE VIEW view_user_members AS
SELECT 
  u.id AS user_id,
  u.phone AS user_phone,
  u.username AS user_username,
  u.nickname AS user_nickname,
  u.status AS user_status,
  m.id AS member_id,
  m.member_no,
  m.type AS member_type,
  m.status AS member_status,
  m.nickname AS member_nickname,
  m.phone AS member_phone,
  m.wechat AS member_wechat,
  m.gender,
  m.province,
  m.city,
  m.district,
  m.target_area,
  m.birth_year,
  m.created_at AS member_created_at,
  m.updated_at AS member_updated_at
FROM 
  users u
LEFT JOIN 
  members m ON u.id = m.user_id
WHERE 
  (m.deleted IS NULL OR m.deleted = FALSE);

-- 创建索引以加速通过phone或wechat查找会员
CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone);
CREATE INDEX IF NOT EXISTS idx_members_wechat ON members(wechat); 