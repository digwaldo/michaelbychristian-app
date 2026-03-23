// api/supabase-admin.js
// Server-side Supabase client using service role key
// Used by API routes — never exposed to client

const { createClient } = require("@supabase/supabase-js");

const supabaseAdmin = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

module.exports = { supabaseAdmin };
