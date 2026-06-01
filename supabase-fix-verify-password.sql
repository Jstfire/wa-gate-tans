-- Fix password verification for induk Supabase
-- Run this in Supabase SQL Editor
--
-- PROBLEM: verify_user_password uses argon2id which pgcrypto crypt() cannot verify
-- SOLUTION: Re-hash passwords to bcrypt, recreate function with crypt()
--
-- STEP 1: Enable pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- STEP 2: Re-hash m.mahbubbillah password to bcrypt
-- (Only for users who need to login via wa-gate)
UPDATE akun_pengguna
SET password = crypt('password123', gen_salt('bf', 10))
WHERE username = 'm.mahbubbillah';

-- STEP 3: Verify the update worked
SELECT id, username, substring(password, 1, 7) as hash_type FROM akun_pengguna WHERE username = 'm.mahbubbillah';
-- Should show hash_type = '$2b$10$' (bcrypt)

-- STEP 4: Drop and recreate verify function
DROP FUNCTION IF EXISTS verify_user_password(TEXT, TEXT);

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

-- STEP 5: Test - should return success: true
SELECT verify_user_password('m.mahbubbillah', 'password123');
