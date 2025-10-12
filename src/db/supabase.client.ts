import { createClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

// Use PUBLIC_ prefix for client-side access in Astro
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase credentials missing. Please check your .env file and ensure PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY are set."
  );
}

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);

/**
 * Type-safe Supabase client for this project
 * Use this type instead of importing from @supabase/supabase-js
 */
export type SupabaseClient = typeof supabaseClient;

export const DEFAULT_USER_ID = "9685e777-9356-4fa6-a870-cce9d18293d5";
