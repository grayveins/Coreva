import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!; // service role for server

if (!url) throw new Error("SUPABASE_URL missing");
if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY missing");

export const supabase = createClient(url, key, {
  auth: { persistSession: false },
});
