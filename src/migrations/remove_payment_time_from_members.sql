-- 创建会员一次性付费信息表
CREATE TABLE IF NOT EXISTS member_one_time_info (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID REFERENCES members(id) NOT NULL,
  UNIQUE(id),
  payment_time TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建会员年费信息表
CREATE TABLE IF NOT EXISTS member_annual_info (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID REFERENCES members(id) NOT NULL,
  UNIQUE(id),
  payment_time TIMESTAMP WITH TIME ZONE NOT NULL,
  expiry_time TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 移除 members 表中的 payment_time 和 expiry_time 字段
ALTER TABLE members
DROP COLUMN IF EXISTS payment_time,
DROP COLUMN IF EXISTS expiry_time;