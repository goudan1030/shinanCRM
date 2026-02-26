-- Create wecom_config table
CREATE TABLE IF NOT EXISTS wecom_config (
  id BIGINT PRIMARY KEY,
  corp_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  secret TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_wecom_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_wecom_config_updated_at
  BEFORE UPDATE ON wecom_config
  FOR EACH ROW
  EXECUTE FUNCTION update_wecom_updated_at_column();
