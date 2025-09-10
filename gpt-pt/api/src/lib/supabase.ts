import { config } from "dotenv";
config();

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) throw new Error("SUPABASE_URL missing in /api/.env");
if (!key) throw new Error("SUPABASE_SERVICE_ROLE missing in /api/.env");

export const supabaseAdmin = createClient(url, key, {
  auth: { persistSession: false },
});

