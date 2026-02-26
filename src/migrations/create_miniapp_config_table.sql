-- Create miniapp_config table
CREATE TABLE IF NOT EXISTS miniapp_config (
  id BIGINT PRIMARY KEY,
  appid TEXT NOT NULL,
  appsecret TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_miniapp_config_updated_at
  BEFORE UPDATE ON miniapp_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
