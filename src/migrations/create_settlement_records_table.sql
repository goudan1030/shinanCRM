-- Create settlement_records table
CREATE TABLE IF NOT EXISTS settlement_records (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  member_no VARCHAR(255) NOT NULL,
  settlement_date DATE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  notes TEXT,
  operator_id BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_member_no (member_no),
  INDEX idx_settlement_date (settlement_date)
);