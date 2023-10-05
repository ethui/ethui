import React, { ReactNode } from "react";
import { Router, useLocation, useRouter } from "wouter";

export function NestedRoutes({
  children,
  base,
}: {
  children: ReactNode;
  base: string;
}) {
  const router = useRouter();
  const [parentLocation] = useLocation();

  const nestedBase = `${router.base}${base}`;

  if (!parentLocation.startsWith(nestedBase)) return null;

  return (
    <Router base={nestedBase} key={nestedBase}>
      {children}
    </Router>
  );
}
