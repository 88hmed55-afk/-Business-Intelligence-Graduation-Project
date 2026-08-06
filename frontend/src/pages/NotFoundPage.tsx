import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/Logo";
import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-4 text-center">
      <Logo />
      <div className="space-y-2">
        <p className="gradient-text text-7xl font-extrabold tracking-tight">404</p>
        <h1 className="text-2xl font-bold">Page not found</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          The page you are looking for doesn't exist or has been moved.
        </p>
      </div>
      <Button asChild>
        <Link to="/">Back to overview</Link>
      </Button>
    </div>
  );
}
