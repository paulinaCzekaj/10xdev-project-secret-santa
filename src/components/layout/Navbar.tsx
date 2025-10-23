import { Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import LogoutButton from "@/components/auth/LogoutButton";

interface NavbarProps {
  isLoggedIn?: boolean;
  userEmail?: string;
}

export default function Navbar({ isLoggedIn = false, userEmail }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur-sm shadow-sm">
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
              {userEmail && <span className="hidden sm:inline text-sm text-gray-600 mr-2">{userEmail}</span>}
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
