/// <reference types="astro/client" />

import type { Database } from "./db/database.types";
import type { SupabaseClient } from "./db/supabase.client";
import type { User } from "@supabase/supabase-js";

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>;
      user: User | null;
    }
  }
}

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  readonly OPENROUTER_API_KEY: string;
  readonly AI_MODEL?: string;
  readonly AI_MAX_TOKENS?: string;
  readonly AI_TEMPERATURE?: string;
  readonly PUBLIC_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
