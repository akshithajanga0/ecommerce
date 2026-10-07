-- Update admin email to miraclecollections581@gmail.com
-- This migration updates the admin user's email in both auth.users and profiles table

-- Step 1: Update email in auth.users (requires service role)
-- Note: This must be run with service role privileges
-- The actual email change in auth.users requires the Supabase Auth Admin API
-- This SQL updates the profiles table which is the application's source of truth

-- Update the admin profile email
UPDATE profiles
SET email = 'miraclecollections581@gmail.com',
    updated_at = NOW()
WHERE role = 'admin';

-- Note: To fully update the email in Supabase Auth, you need to:
-- 1. Use the Supabase Auth Admin API (requires service role key)
-- 2. Call the updateUser function with the new email
-- 
-- Example using the Admin API (run in a server context):
-- 
-- const { data, error } = await supabase.auth.admin.updateUserById(
--   'user-uuid',
--   { email: 'miraclecollections581@gmail.com' }
-- );
--
-- Alternatively, you can do this through the Supabase Dashboard:
-- 1. Go to Authentication → Users
-- 2. Find the admin user
-- 3. Click "Edit" and update the email
