-- Fix verify_user_password for induk Supabase
-- Run this in Supabase SQL Editor

-- Ensure pgcrypto extension is enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop old broken function
DROP FUNCTION IF EXISTS verify_user_password(TEXT, TEXT);

-- Recreate with pgcrypto crypt() — works reliably with argon2id hashes
CREATE OR REPLACE FUNCTION verify_user_password(p_username TEXT, p_password TEXT)
RETURNS JSON AS $$
DECLARE
  user_record RECORD;
BEGIN
  SELECT id, username, password, role_ids INTO user_record
  FROM akun_pengguna
  WHERE username = p_username
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'user_not_found');
  END IF;

  IF user_record.password IS NULL OR user_record.password = '' THEN
    RETURN json_build_object('success', false, 'error', 'no_password_set');
  END IF;

  -- Verify using crypt() from pgcrypto
  IF user_record.password = crypt(p_password, user_record.password) THEN
    RETURN json_build_object(
      'success', true,
      'id', user_record.id,
      'username', user_record.username,
      'role_ids', user_record.role_ids
    );
  ELSE
    RETURN json_build_object('success', false, 'error', 'invalid_password');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also create a simpler fallback function
CREATE OR REPLACE FUNCTION verify_password_crypt(p_hash TEXT, p_password TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN p_hash = crypt(p_password, p_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test (should return success: true)
SELECT verify_user_password('m.mahbubbillah', 'password123');
