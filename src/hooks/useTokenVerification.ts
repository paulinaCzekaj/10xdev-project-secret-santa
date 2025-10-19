import { useState, useEffect } from "react";
import { supabaseClient } from "@/db/supabase.client";

interface TokenVerificationResult {
  isValid: boolean;
  isLoading: boolean;
  error: string | null;
}

// Helper function to extract token from URL hash
const extractTokenFromHash = (): string | null => {
  const hash = window.location.hash;
  if (hash.startsWith("#access_token=")) {
    const params = new URLSearchParams(hash.substring(1));
    return params.get("access_token");
  }
  return null;
};

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

export function useTokenVerification(accessToken?: string): TokenVerificationResult {
  const [isValid, setIsValid] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyToken = async () => {
      setIsLoading(true);
      setError(null);

      // Get token from props or from URL hash
      const token = accessToken || extractTokenFromHash();

      if (!token) {
        setError("Brak tokenu resetowania hasła");
        setIsLoading(false);
        return;
      }

      try {
        // Supabase automatically handles token verification through the URL
        // The token in the URL hash will be processed by Supabase Auth
        // We just need to check if we're in a valid session

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
        } else {
          // Check URL hash for tokens (Supabase puts them there)
          const hash = window.location.hash;
          if (hash.includes("access_token")) {
            // Try to set session with tokens from URL
            const urlParams = new URLSearchParams(hash.substring(1));
            const urlAccessToken = urlParams.get("access_token");
            const refreshToken = urlParams.get("refresh_token") || "";

            if (urlAccessToken) {
              const { error: setSessionError } = await supabaseClient.auth.setSession({
                access_token: urlAccessToken,
                refresh_token: refreshToken,
              });

              if (setSessionError) {
                throw setSessionError;
              }

              setIsValid(true);
            } else {
              throw new Error("Token has expired or is invalid");
            }
          } else {
            throw new Error("Token has expired or is invalid");
          }
        }
      } catch (err) {
        const errorMessage = getAuthErrorMessage(err);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    verifyToken();
  }, [accessToken]);

  return { isValid, isLoading, error };
}
