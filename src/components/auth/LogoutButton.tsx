import * as React from "react";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export default function LogoutButton() {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleLogout = async () => {
    setIsLoading(true);

    try {
      // TODO: Implement Supabase Auth signOut
      console.log("Logging out user");

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Placeholder: In the next phase, this will call Supabase Auth
      toast.success("Wylogowano pomyślnie");
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Błąd podczas wylogowania");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleLogout}
      disabled={isLoading}
      variant="ghost"
      className="text-sm text-gray-700 hover:text-red-600 hover:bg-red-50 font-medium transition-colors"
    >
      <LogOut className="mr-2 h-4 w-4" />
      {isLoading ? "Wylogowywanie..." : "Wyloguj"}
    </Button>
  );
}
