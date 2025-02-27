-- 创建member_matches表
CREATE TABLE IF NOT EXISTS member_matches (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  member_id BIGINT UNSIGNED NOT NULL,
  target_member_id BIGINT UNSIGNED NOT NULL,
  matched_by BIGINT UNSIGNED,
  match_no VARCHAR(50) NOT NULL,
  match_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (target_member_id) REFERENCES members(id),
  FOREIGN KEY (matched_by) REFERENCES members(id)
);

-- 添加索引以提高查询性能
CREATE INDEX idx_member_matches_member_id ON member_matches(member_id);
CREATE INDEX idx_member_matches_target_member_id ON member_matches(target_member_id);
CREATE INDEX idx_member_matches_match_no ON member_matches(match_no);
CREATE INDEX idx_member_matches_match_time ON member_matches(match_time);