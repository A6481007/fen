"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface DynamicBreadcrumbItem {
  label: string;
  href?: string;
  isActive?: boolean;
  isComplete?: boolean;
}

interface DynamicBreadcrumbProps {
  items?: DynamicBreadcrumbItem[];
  customItems?: DynamicBreadcrumbItem[];
  className?: string;
  // For dynamic routes - pass the actual data
  productData?: {
    name: string;
    slug: string;
  };
  categoryData?: {
    name: string;
    slug: string;
  };
  brandData?: {
    name: string;
    slug: string;
  };
  // For nested routes - specify parent context
  parentPath?: string; // e.g., "/dashboard" for dashboard/cart
}

type ResolvedBreadcrumbItem = DynamicBreadcrumbItem & {
  isLast: boolean;
  isActive: boolean;
};

const DynamicBreadcrumb = ({
  items,
  customItems,
  className = "",
  productData,
  categoryData,
  brandData,
  parentPath,
}: DynamicBreadcrumbProps) => {
  const pathname = usePathname();
  const [detectedParentPath, setDetectedParentPath] = useState<string | null>(
    null
  );

  // Detect parent path from referrer or session storage
  useEffect(() => {
    if (parentPath) {
      setDetectedParentPath(parentPath);
      return;
    }

    // Clear parent context if we're on dashboard itself
    if (pathname === "/dashboard") {
      sessionStorage.removeItem("breadcrumb-parent");
      setDetectedParentPath(null);
      return;
    }

    // Check if we came from dashboard based on document referrer
    const referrer = document.referrer;
    if (referrer) {
      const referrerUrl = new URL(referrer);
      const referrerPath = referrerUrl.pathname;

      // If we came from dashboard, include it in breadcrumb
      if (
        referrerPath === "/dashboard" ||
        referrerPath.startsWith("/dashboard/")
      ) {
        setDetectedParentPath("/dashboard");
      }
    }

    // Also check session storage for navigation context
    const storedParent = sessionStorage.getItem("breadcrumb-parent");
    if (storedParent === "/dashboard") {
      setDetectedParentPath("/dashboard");
    }
  }, [parentPath, pathname]);

  const formatSegmentLabel = (segment: string): string => {
    // Handle special cases
    const specialCases: Record<string, string> = {
      "sign-in": "Sign In",
      "sign-up": "Sign Up",
      "my-account": "My Account",
      "order-history": "Order History",
    };

    if (specialCases[segment]) {
      return specialCases[segment];
    }

    return segment
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Generate breadcrumb items from pathname with parent context support
  const normalizeItems = (
    list: DynamicBreadcrumbItem[]
  ): ResolvedBreadcrumbItem[] => {
    const hasActive = list.some((item) => item.isActive);
    return list.map((item, index) => ({
      ...item,
      isLast: index === list.length - 1,
      isActive: item.isActive ?? (!hasActive && index === list.length - 1),
    }));
  };

  const generateBreadcrumbs = (): ResolvedBreadcrumbItem[] => {
    if (items && items.length > 0) {
      return normalizeItems(items);
    }

    const pathSegments = pathname
      .split("/")
      .filter((segment) => segment !== "");

    const breadcrumbs: ResolvedBreadcrumbItem[] = [];

    // Always start with Home
    breadcrumbs.push({
      label: "Home",
      href: "/",
      isLast: pathSegments.length === 0,
      isActive: pathSegments.length === 0,
    });

    // If we're on home page, return just Home
    if (pathSegments.length === 0) {
      return breadcrumbs;
    }

    // For nested routes with parent context (e.g., dashboard/cart)
    const activeParentPath = parentPath || detectedParentPath;
    if (
      activeParentPath &&
      !pathSegments.includes(activeParentPath.replace("/", ""))
    ) {
      // Add the parent to the breadcrumbs
      const parentSegment = activeParentPath.replace("/", "");
      breadcrumbs.push({
        label: formatSegmentLabel(parentSegment),
        href: activeParentPath,
        isLast: false,
        isActive: false,
      });
    }

    // Build breadcrumbs for each segment
    let currentPath = "";
    pathSegments.forEach((segment, index) => {
      const isLast = index === pathSegments.length - 1;
      const parentSegment = pathSegments[index - 1];

      // Skip route groups like (client), (user), (public)
      if (segment.startsWith("(") && segment.endsWith(")")) {
        return;
      }

      // Build the current path
      currentPath += `/${segment}`;

      // Handle dynamic routes with provided data
      if (parentSegment === "product" && productData && isLast) {
        breadcrumbs.push({
          label: productData.name,
          href: undefined,
          isLast: true,
          isActive: true,
        });
        return;
      }

      if (parentSegment === "category" && categoryData && isLast) {
        breadcrumbs.push({
          label: categoryData.name,
          href: undefined,
          isLast: true,
          isActive: true,
        });
        return;
      }

      if (parentSegment === "brands" && brandData && isLast) {
        breadcrumbs.push({
          label: brandData.name,
          href: undefined,
          isLast: true,
          isActive: true,
        });
        return;
      }

      // Format the segment label
      const label = formatSegmentLabel(segment);

      // Add breadcrumb item
      if (label) {
        breadcrumbs.push({
          label,
          href: isLast ? undefined : currentPath,
          isLast,
          isActive: isLast,
        });
      }
    });

    // Replace with custom items if provided
    if (customItems && customItems.length > 0) {
      // Keep Home, add custom items
      const homeBreadcrumb = {
        ...breadcrumbs[0],
        isActive: false,
        isLast: false,
      };
      const customBreadcrumbs = normalizeItems(customItems);

      return [homeBreadcrumb, ...customBreadcrumbs];
    }

    return breadcrumbs.map((crumb) => ({
      ...crumb,
      isActive: crumb.isActive ?? crumb.isLast,
    }));
  };

  const breadcrumbs = generateBreadcrumbs();

  return (
    <div className={`my-3 ${className}`}>
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center">
              <BreadcrumbItem>
                {crumb.isActive ? (
                  <BreadcrumbPage className="text-brand-black-strong font-medium truncate max-w-xs">
                    {crumb.label}
                  </BreadcrumbPage>
                ) : crumb.href ? (
                  <BreadcrumbLink asChild>
                    <Link
                      href={crumb.href}
                      className={`flex items-center transition-colors ${
                        crumb.isComplete
                          ? "text-brand-text-main font-medium hover:text-brand-text-main"
                          : "text-muted-foreground hover:text-brand-text-main"
                      }`}
                    >
                      {index === 0 && crumb.label === "Home" && (
                        <Home size={16} />
                      )}
                      <span
                        className={
                          index === 0 && crumb.label === "Home" ? "ml-1" : ""
                        }
                      >
                        {crumb.label}
                      </span>
                    </Link>
                  </BreadcrumbLink>
                ) : (
                  <span
                    className={`truncate max-w-xs ${
                      crumb.isComplete
                        ? "text-brand-text-main font-medium"
                        : "text-muted-foreground"
                    }`}
                  >
                    {crumb.label}
                  </span>
                )}
              </BreadcrumbItem>

              {!crumb.isLast && <BreadcrumbSeparator />}
            </div>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
};

export default DynamicBreadcrumb;
