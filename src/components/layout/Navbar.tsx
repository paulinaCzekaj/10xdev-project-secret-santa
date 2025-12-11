import { Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import LogoutButton from "@/components/auth/LogoutButton";

interface NavbarProps {
  isLoggedIn?: boolean;
  userEmail?: string;
}

export default function Navbar({ isLoggedIn = false, userEmail }: NavbarProps) {
  // Get user initial (first letter of email or name)
  const getUserInitial = () => {
    if (!userEmail) return "U";
    return userEmail.charAt(0).toUpperCase();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b bg-white/95 backdrop-blur-sm shadow-sm">
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <a
            href={isLoggedIn ? "/dashboard" : "/"}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Gift className="h-6 w-6 text-primary" />
            <span className="hidden md:inline text-xl font-bold text-gray-900">Gift Exchange</span>
          </a>

          {/* Navigation - Logged In */}
          {isLoggedIn ? (
            <nav className="flex items-center gap-4">
              {userEmail && (
                <div
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm"
                  title={userEmail}
                >
                  {getUserInitial()}
                </div>
              )}
              <a href="/dashboard" className="text-sm font-medium text-gray-600 hover:text-primary transition-colors">
                Pulpit
              </a>
              <LogoutButton />
            </nav>
          ) : (
            <>
              {/* Desktop Navigation - Not Logged In */}
              <nav className="hidden md:flex items-center gap-6">
                <a href="/login" className="text-sm font-medium text-gray-600 hover:text-primary transition-colors">
                  Zaloguj się
                </a>
                <Button asChild size="sm">
                  <a href="/register">Zarejestruj się</a>
                </Button>
              </nav>

              {/* Mobile Navigation - Not Logged In */}
              <div className="md:hidden flex items-center gap-3">
                <a href="/login" className="text-sm font-medium text-gray-600 hover:text-primary transition-colors">
                  Zaloguj się
                </a>
                <Button asChild size="sm">
                  <a href="/register">Zarejestruj się</a>
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
