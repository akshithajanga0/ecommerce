/**
 * Update Admin Email Script
 * 
 * This script updates the admin user's email in Supabase Auth and the profiles table.
 * Run this with: npx ts-node scripts/update-admin-email.ts
 * 
 * Prerequisites:
 * - Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 * - The admin user must already exist in auth.users
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function updateAdminEmail() {
  const newEmail = 'miraclecollections581@gmail.com';

  try {
    console.log('Fetching admin user from profiles table...');
    const { data: adminProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'admin')
      .single();

    if (profileError) {
      console.error('Error fetching admin profile:', profileError);
      process.exit(1);
    }

    if (!adminProfile) {
      console.error('No admin user found in profiles table');
      process.exit(1);
    }

    console.log(`Found admin user: ${adminProfile.email} (ID: ${adminProfile.id})`);

    // Update email in auth.users using Admin API
    console.log(`Updating email in auth.users to: ${newEmail}...`);
    const { data: authData, error: authError } = await supabase.auth.admin.updateUserById(
      adminProfile.id,
      { email: newEmail }
    );

    if (authError) {
      console.error('Error updating email in auth.users:', authError);
      console.error('Note: You may need to manually update this in the Supabase Dashboard');
      console.error('Go to: Authentication → Users → Find admin user → Edit → Update email');
    } else {
      console.log('✓ Successfully updated email in auth.users');
    }

    // Update email in profiles table
    console.log(`Updating email in profiles table to: ${newEmail}...`);
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        email: newEmail,
        updated_at: new Date().toISOString()
      })
      .eq('id', adminProfile.id);

    if (updateError) {
      console.error('Error updating email in profiles table:', updateError);
      process.exit(1);
    }

    console.log('✓ Successfully updated email in profiles table');
    console.log('\nAdmin email update complete!');
    console.log(`New email: ${newEmail}`);
    console.log('\nNote: The user will need to reset their password to log in with the new email.');

  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

updateAdminEmail();
