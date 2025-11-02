import * as React from "react";
import { LogOut } from "lucide-react";
import { notify } from "@/lib/notifications";

import { Button } from "@/components/ui/button";

export default function LogoutButton() {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleLogout = async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Logout failed");
      }

      notify.success("AUTH.LOGOUT_SUCCESS");
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
      notify.error("AUTH.LOGOUT_ERROR");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleLogout}
      disabled={isLoading}
      variant="ghost"
      className="text-sm text-gray-700 hover:text-red-500 hover:bg-red-50 font-medium transition-colors"
    >
      <LogOut className="mr-2 h-4 w-4" />
      {isLoading ? "Wylogowywanie..." : "Wyloguj"}
    </Button>
  );
}
