import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "../../../db/supabase.client";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { email } = await request.json();

    // Validate input
    if (!email) {
      return new Response(
        JSON.stringify({
          error: {
            code: "INVALID_INPUT",
            message: "Email is required",
          },
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    const siteUrl = import.meta.env.PUBLIC_SITE_URL || new URL(request.url).origin;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/reset-password`,
    });

    if (error) {
      // Map Supabase errors to user-friendly messages
      const errorMessages: Record<string, string> = {
        "Email rate limit exceeded": "Zbyt wiele prób. Spróbuj ponownie później.",
        "Unable to validate email address: invalid format": "Nieprawidłowy format adresu email",
        "User not found": "Jeśli konto z tym adresem istnieje, otrzymasz email z linkiem resetującym",
      };

      return new Response(
        JSON.stringify({
          error: {
            code: "AUTH_ERROR",
            message: errorMessages[error.message] || "Wystąpił błąd podczas wysyłania emaila",
          },
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        message: "Email wysłany pomyślnie",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[POST /api/auth/reset-password] Unexpected error:", error);

    return new Response(
      JSON.stringify({
        error: {
          code: "SERVER_ERROR",
          message: "Wystąpił błąd serwera. Spróbuj ponownie później.",
        },
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
