-- Re-hash passwords from argon2id to bcrypt for CF Workers compatibility
-- Run this in Supabase SQL Editor (induk project)

-- Enable pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Re-hash all user passwords to bcrypt
-- WARNING: This resets all passwords to 'password123' temporarily
-- Users should change their passwords after this
UPDATE akun_pengguna SET password = crypt('password123', gen_salt('bf', 10));

-- Verify
SELECT id, username, substring(password, 1, 7) as hash_type FROM akun_pengguna;
-- All should show '$2b$10$' (bcrypt)

-- Test verify function
DROP FUNCTION IF EXISTS verify_user_password(TEXT, TEXT);
CREATE OR REPLACE FUNCTION verify_user_password(p_username TEXT, p_password TEXT)
RETURNS JSON AS $$
DECLARE
  user_record RECORD;
BEGIN
  SELECT id, username, password, role_ids INTO user_record
  FROM akun_pengguna WHERE username = p_username LIMIT 1;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'user_not_found');
  END IF;
  IF user_record.password = crypt(p_password, user_record.password) THEN
    RETURN json_build_object('success', true, 'id', user_record.id, 'username', user_record.username, 'role_ids', user_record.role_ids);
  ELSE
    RETURN json_build_object('success', false, 'error', 'invalid_password');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test
SELECT verify_user_password('m.mahbubbillah', 'password123');
