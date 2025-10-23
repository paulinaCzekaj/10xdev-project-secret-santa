import { createClient } from "@supabase/supabase-js";
import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import type { AstroCookies } from "astro";

import type { Database } from "./database.types";

// Use SUPABASE_URL for server-side, PUBLIC_SUPABASE_URL for client-side
// Server-side should prioritize SUPABASE_URL (can be local), client-side uses PUBLIC_ vars
const supabaseUrl = import.meta.env.SUPABASE_URL || import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY || import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase credentials missing. Please check your .env file and ensure PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY are set."
  );
}

// Cookie options for SSR
export const cookieOptions: CookieOptionsWithName = {
  path: "/",
  secure: false, // false for local development (HTTP), true for production (HTTPS)
  httpOnly: true,
  sameSite: "lax",
};

// Helper function to parse cookie header
function parseCookieHeader(cookieHeader: string): { name: string; value: string }[] {
  return cookieHeader.split(";").map((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    return { name, value: rest.join("=") };
  });
}

// Create server-side Supabase client instance
export const createSupabaseServerInstance = (context: { headers: Headers; cookies: AstroCookies }) => {
  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookieOptions,
    cookies: {
      getAll() {
        return parseCookieHeader(context.headers.get("Cookie") ?? "");
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => context.cookies.set(name, value, options));
      },
    },
  });

  return supabase;
};

// Legacy client-side client (temporary backward compatibility)
export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);

/**
 * Type-safe Supabase client for this project
 * Use this type instead of importing from @supabase/supabase-js
 */
export type SupabaseClient = typeof supabaseClient;
