import { useNavigate } from "@tanstack/react-router";
import { LoaderCircle } from "lucide-react";
import { useEffect } from "react";

interface RouteGuardProps {
  condition: boolean;
  isLoading?: boolean;
  fallbackRoute: string;
  children: React.ReactNode;
  replace?: boolean;
}

export function RouteGuard({
  condition,
  isLoading = false,
  fallbackRoute,
  children,
  replace = true,
}: RouteGuardProps) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !condition) {
      navigate({ to: fallbackRoute, replace });
    }
  }, [condition, isLoading, fallbackRoute, replace, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center">
        <LoaderCircle className="animate-spin" />
      </div>
    );
  }

  if (!condition) {
    return null;
  }

  return <>{children}</>;
}
