"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

interface BreadcrumbLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  setBreadcrumbParent?: boolean; // Set to true for dashboard links
}

const BreadcrumbLink = ({
  href,
  children,
  className = "",
  setBreadcrumbParent = false,
}: BreadcrumbLinkProps) => {
  const pathname = usePathname();

  const handleClick = () => {
    if (setBreadcrumbParent && pathname === "/dashboard") {
      // Set dashboard as parent in session storage for breadcrumb context
      sessionStorage.setItem("breadcrumb-parent", "/dashboard");
    } else if (!setBreadcrumbParent) {
      // Clear parent context for direct navigation
      sessionStorage.removeItem("breadcrumb-parent");
    }
  };

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
};

export default BreadcrumbLink;
