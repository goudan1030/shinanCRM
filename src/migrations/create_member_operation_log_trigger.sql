-- 创建会员操作日志触发器函数
CREATE OR REPLACE FUNCTION log_member_operation()
RETURNS TRIGGER AS $$
DECLARE
  old_values jsonb;
  new_values jsonb;
BEGIN
  -- 对于UPDATE操作，只记录发生变化的字段
  IF TG_OP = 'UPDATE' THEN
    -- 将OLD和NEW记录转换为jsonb，并排除updated_at字段
    old_values := to_jsonb(OLD) - 'updated_at';
    new_values := to_jsonb(NEW) - 'updated_at';
    
    -- 只保留发生变化的字段
    SELECT jsonb_object_agg(key, value)
    INTO old_values
    FROM jsonb_each(old_values) 
    WHERE value IS DISTINCT FROM (new_values->key);
    
    SELECT jsonb_object_agg(key, value)
    INTO new_values
    FROM jsonb_each(new_values)
    WHERE key IN (SELECT key FROM jsonb_each(old_values));
  
  -- 对于INSERT操作，记录所有新值（排除updated_at字段）
  ELSIF TG_OP = 'INSERT' THEN
    old_values := NULL;
    new_values := to_jsonb(NEW) - 'updated_at';
  -- 对于DELETE操作，记录所有旧值（排除updated_at字段）
  ELSE
    old_values := to_jsonb(OLD) - 'updated_at';
    new_values := NULL;
  END IF;

  -- 插入操作日志
  INSERT INTO member_operation_logs (
    id,
    member_id,
    operation_type,
    old_values,
    new_values,
    created_at,
    operator_id
  ) VALUES (
    uuid_generate_v4(),
    CASE
      WHEN TG_OP = 'DELETE' THEN OLD.id
      ELSE NEW.id
    END,
    TG_OP,
    old_values,
    new_values,
    NOW(),
    (SELECT
      CASE
        WHEN current_setting('app.current_user_id', TRUE) IS NULL OR current_setting('app.current_user_id', TRUE) = '' THEN
          NULL
        ELSE
          current_setting('app.current_user_id', TRUE)::UUID
      END
    )
  );

  -- 检查操作人ID
  IF current_setting('app.current_user_id', TRUE) IS NULL OR current_setting('app.current_user_id', TRUE) = '' THEN
    RAISE EXCEPTION 'operator_id is required for member operations';
  END IF;

  -- 返回触发器结果
  CASE TG_OP
    WHEN 'DELETE' THEN RETURN OLD;
    ELSE RETURN NEW;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- 为members表创建触发器
DROP TRIGGER IF EXISTS member_operation_log_trigger ON members;
CREATE TRIGGER member_operation_log_trigger
  AFTER INSERT OR UPDATE OR DELETE ON members
  FOR EACH ROW
  EXECUTE FUNCTION log_member_operation();