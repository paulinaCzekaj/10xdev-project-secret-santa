import { defineMiddleware } from "astro:middleware";

import { supabaseClient, createSupabaseServerInstance } from "../db/supabase.client";

export const onRequest = defineMiddleware(async (context, next) => {
  // Add legacy supabaseClient to locals for backward compatibility
  context.locals.supabase = supabaseClient;

  // Create server-side Supabase instance for authentication
  const supabase = createSupabaseServerInstance({
    cookies: context.cookies,
    headers: context.request.headers,
  });

  // Always get user session first before any other operations
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Add session and user information to locals
  context.locals.user = user ?? null;

  return next();
});
