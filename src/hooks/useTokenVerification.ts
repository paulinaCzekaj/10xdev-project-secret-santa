import { useState, useEffect } from "react";
import { supabaseClient } from "@/db/supabase.client";

interface TokenVerificationResult {
  isValid: boolean;
  isLoading: boolean;
  error: string | null;
}

// Function to get auth error message
const getAuthErrorMessage = (error: unknown): string => {
  const errorMessages: Record<string, string> = {
    "Token has expired or is invalid": "Token jest nieprawidłowy lub wygasł",
    "User not found": "Użytkownik nie istnieje",
    "Invalid password": "Hasło nie spełnia wymagań",
    "Password should be at least 6 characters": "Hasło musi mieć co najmniej 6 znaków",
  };

  const message = error instanceof Error ? error.message : String(error);
  return errorMessages[message] || "Wystąpił błąd podczas weryfikacji tokenu. Spróbuj ponownie.";
};

export function useTokenVerification(code?: string, accessToken?: string): TokenVerificationResult {
  const [isValid, setIsValid] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyToken = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // First, check if there's already a valid session
        const {
          data: { session },
          error: sessionError,
        } = await supabaseClient.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        // If we have a session, the token was valid
        if (session) {
          setIsValid(true);
          setIsLoading(false);
          return;
        }

        // No session yet - try to get token from URL
        const hash = window.location.hash;
        const urlParams = new URLSearchParams(window.location.search);
        let urlAccessToken: string | null = null;
        let refreshToken = "";
        let pkceCode: string | null = null;

        // Priority 1: Check for PKCE code parameter (most common in newer Supabase)
        if (code) {
          pkceCode = code;
        } else if (urlParams.get("code")) {
          pkceCode = urlParams.get("code");
        }

        // Priority 2: Check URL hash for tokens (older Supabase behavior)
        if (!pkceCode && hash.includes("access_token")) {
          const hashParams = new URLSearchParams(hash.substring(1));
          urlAccessToken = hashParams.get("access_token");
          refreshToken = hashParams.get("refresh_token") || "";
        }

        // Priority 3: Check query params for access_token
        if (!pkceCode && !urlAccessToken && accessToken) {
          urlAccessToken = accessToken;
        }

        // Handle PKCE flow (exchange code for session)
        if (pkceCode) {
          const { error: exchangeError } = await supabaseClient.auth.exchangeCodeForSession(pkceCode);

          if (exchangeError) {
            throw exchangeError;
          }

          setIsValid(true);
          setIsLoading(false);
          return;
        }

        // Handle implicit flow (set session with access token)
        if (urlAccessToken) {
          const { error: setSessionError } = await supabaseClient.auth.setSession({
            access_token: urlAccessToken,
            refresh_token: refreshToken,
          });

          if (setSessionError) {
            throw setSessionError;
          }

          setIsValid(true);
          setIsLoading(false);
          return;
        }

        // No token found
        setError("Brak tokenu resetowania hasła");
        setIsLoading(false);
      } catch (err) {
        const errorMessage = getAuthErrorMessage(err);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    verifyToken();
  }, [code, accessToken]);

  return { isValid, isLoading, error };
}
