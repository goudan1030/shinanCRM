-- 为已存在的user_id字段创建索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_members_user_id ON members(user_id);

-- 创建视图，方便查询用户和会员的关联信息
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

-- 创建通过手机号匹配用户和会员的视图
CREATE OR REPLACE VIEW view_user_members_by_phone AS
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
  m.phone AS member_phone
FROM 
  users u
LEFT JOIN 
  members m ON u.phone = m.phone
WHERE 
  (m.deleted IS NULL OR m.deleted = FALSE);

-- 确保索引存在以提高视图性能
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone);
CREATE INDEX IF NOT EXISTS idx_members_wechat ON members(wechat); 