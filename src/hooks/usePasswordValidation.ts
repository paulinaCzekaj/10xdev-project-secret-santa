import { useMemo } from "react";

export interface PasswordRequirement {
  met: boolean;
  text: string;
  icon: string;
}

export function usePasswordValidation(password: string) {
  return useMemo(() => {
    const requirements: PasswordRequirement[] = [
      {
        met: password.length >= 8,
        text: "Co najmniej 8 znaków",
        icon: password.length >= 8 ? "✓" : "○",
      },
      {
        met: /(?=.*[a-z])/.test(password),
        text: "Jedną małą literę (a-z)",
        icon: /(?=.*[a-z])/.test(password) ? "✓" : "○",
      },
      {
        met: /(?=.*[A-Z])/.test(password),
        text: "Jedną dużą literę (A-Z)",
        icon: /(?=.*[A-Z])/.test(password) ? "✓" : "○",
      },
      {
        met: /(?=.*\d)/.test(password),
        text: "Jedną cyfrę (0-9)",
        icon: /(?=.*\d)/.test(password) ? "✓" : "○",
      },
    ];

    const allMet = requirements.every((req) => req.met);

    return { requirements, allMet };
  }, [password]);
}
