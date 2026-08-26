import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// This client is safe to use in the browser (uses the public anon key).
// Row Level Security policies in Supabase control what each user can see/do.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
