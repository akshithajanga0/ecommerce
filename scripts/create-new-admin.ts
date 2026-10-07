/**
 * Create New Admin User Script
 * 
 * This script creates a new admin user in Supabase Auth and the profiles table.
 * Run this with: npx ts-node scripts/create-new-admin.ts
 * 
 * Prerequisites:
 * - Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
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

async function createNewAdmin() {
  const email = 'miraclecollections581@gmail.com';
  const password = '23456789Pp';
  const name = 'Admin User';

  try {
    console.log('Creating new admin user...');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log('');

    // Step 1: Create user in Supabase Auth
    console.log('Step 1: Creating user in Supabase Auth...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role: 'admin'
      }
    });

    if (authError) {
      console.error('Error creating user in auth:', authError);
      process.exit(1);
    }

    if (!authData.user) {
      console.error('No user returned from auth creation');
      process.exit(1);
    }

    console.log('✓ User created in Supabase Auth');
    console.log(`  User ID: ${authData.user.id}`);
    console.log('');

    // Step 2: Create profile entry
    console.log('Step 2: Creating profile entry...');
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: email,
        name: name,
        mobile: '',
        role: 'admin',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      console.log('Note: Profile might already exist. Attempting to update...');
      
      // Try updating instead
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          email: email,
          name: name,
          role: 'admin',
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', authData.user.id);

      if (updateError) {
        console.error('Error updating profile:', updateError);
        process.exit(1);
      }
      
      console.log('✓ Profile updated');
    } else {
      console.log('✓ Profile created');
    }

    console.log('');
    console.log('========================================');
    console.log('ADMIN USER CREATED SUCCESSFULLY');
    console.log('========================================');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`User ID: ${authData.user.id}`);
    console.log('');
    console.log('You can now log in to the admin dashboard with these credentials.');
    console.log('');
    console.log('IMPORTANT: Change the password after first login for security.');
    console.log('========================================');

  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

createNewAdmin();
