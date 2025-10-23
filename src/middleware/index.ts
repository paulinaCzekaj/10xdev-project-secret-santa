import { defineMiddleware } from "astro:middleware";

import { createSupabaseServerInstance } from "../db/supabase.client";

export const onRequest = defineMiddleware(async (context, next) => {
  // Create server-side Supabase instance for authentication
  const supabase = createSupabaseServerInstance({
    cookies: context.cookies,
    headers: context.request.headers,
  });

  // Use server-side client for all operations (not legacy client-side client)
  context.locals.supabase = supabase;

  // Always get user session first before any other operations
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Add session and user information to locals
  context.locals.user = user ?? null;

  return next();
});
