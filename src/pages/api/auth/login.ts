import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "../../../db/supabase.client";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return new Response(
        JSON.stringify({
          error: {
            code: "INVALID_INPUT",
            message: "Email and password are required",
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

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Map Supabase errors to user-friendly messages
      const errorMessages: Record<string, string> = {
        "Invalid login credentials": "Nieprawidłowy email lub hasło",
        "Email not confirmed": "Email nie został potwierdzony. Sprawdź swoją skrzynkę.",
        "User not found": "Użytkownik nie istnieje",
        "Too many requests": "Zbyt wiele prób logowania. Spróbuj ponownie później.",
      };

      return new Response(
        JSON.stringify({
          error: {
            code: "AUTH_ERROR",
            message: errorMessages[error.message] || "Wystąpił błąd podczas logowania",
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
        user: {
          id: data.user.id,
          email: data.user.email,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[POST /api/auth/login] Unexpected error:", error);

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
