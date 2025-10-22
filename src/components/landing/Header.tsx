import { Gift } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur-sm shadow-sm">
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Gift className="h-6 w-6 text-primary" />
            <span className="hidden md:inline text-xl font-bold text-gray-900">Gift Exchange</span>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <a href="/" className="text-sm font-medium text-gray-600 hover:text-primary transition-colors">
              Strona Główna
            </a>
            <a href="/login" className="text-sm font-medium text-gray-600 hover:text-primary transition-colors">
              Zaloguj się
            </a>
            <Button asChild size="sm" className="ml-2">
              <a href="/register">Zarejestruj się</a>
            </Button>
          </nav>

          {/* Mobile Navigation */}
          <div className="md:hidden flex items-center gap-3">
            <a href="/login" className="text-sm font-medium text-gray-600 hover:text-primary transition-colors">
              Zaloguj się
            </a>
            <Button asChild size="sm">
              <a href="/register">Zarejestruj się</a>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
