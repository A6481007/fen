"use client";

import { useEffect, useState } from "react";

type AdminHydrationBoundaryProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

const AdminHydrationBoundary = ({
  children,
  fallback = null,
}: AdminHydrationBoundaryProps) => {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default AdminHydrationBoundary;
