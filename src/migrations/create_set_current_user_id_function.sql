-- Create a function to set the current user ID in a session variable
CREATE OR REPLACE FUNCTION set_current_user_id(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'user_id cannot be null';
  END IF;
  
  -- Set the user_id in a session variable with local scope
  -- Using true for the third parameter ensures the variable is set for the current transaction
  PERFORM set_config('app.current_user_id', user_id::text, false);
  
  -- Verify the session variable was set correctly
  IF current_setting('app.current_user_id', true) IS NULL OR current_setting('app.current_user_id', true) = '' THEN
    RAISE EXCEPTION 'Failed to set app.current_user_id session variable';
  END IF;
END;
$$;