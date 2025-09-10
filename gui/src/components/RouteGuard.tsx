import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

interface RouteGuardProps {
  condition: boolean;
  fallbackRoute: string;
  children: React.ReactNode;
  replace?: boolean;
  loadingComponent?: React.ComponentType;
}

export function RouteGuard({
  condition,
  fallbackRoute,
  children,
  replace = true,
  loadingComponent: LoadingComponent,
}: RouteGuardProps) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!condition) {
      navigate({ to: fallbackRoute, replace });
    }
  }, [condition, fallbackRoute, replace, navigate]);

  if (!condition) {
    return LoadingComponent ? <LoadingComponent /> : null;
  }

  return <>{children}</>;
}
