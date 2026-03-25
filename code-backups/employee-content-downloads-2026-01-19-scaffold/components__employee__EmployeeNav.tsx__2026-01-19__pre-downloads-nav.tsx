"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Employee, getRoleDisplayName } from "@/types/employee";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  ShoppingCart,
  Truck,
  DollarSign,
  LayoutDashboard,
  LogOut,
  User,
  Users,
  Menu,
  Store,
  BookOpen,
  Newspaper,
  CalendarDays,
  FileText,
  Layers,
  Tags,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SignOutButton } from "@clerk/nextjs";
import { useState } from "react";

interface EmployeeNavProps {
  employee: Employee;
}

export default function EmployeeNav({ employee }: EmployeeNavProps) {
  const pathname = usePathname();

  const getNavItems = () => {
    const baseItems = [
      {
        href: "/employee/orders",
        label: "Sales",
        icon: ShoppingCart,
        roles: ["callcenter", "incharge"],
      },
      {
        href: "/employee/packing",
        label: "Packing",
        icon: Package,
        roles: ["packer", "incharge"],
      },
      {
        href: "/employee/deliveries",
        label: "Deliveries",
        icon: Truck,
        roles: ["deliveryman", "incharge"],
      },
      {
        href: "/employee/accounts",
        label: "Accounts",
        icon: DollarSign,
        roles: ["accounts", "incharge"],
      },
      {
        href: "/employee/content/insights",
        label: "Insights",
        icon: BookOpen,
        roles: ["incharge"],
      },
      {
        href: "/employee/content/news",
        label: "News",
        icon: Newspaper,
        roles: ["incharge"],
      },
      {
        href: "/employee/content/catalogs",
        label: "Catalogs",
        icon: FileText,
        roles: ["incharge"],
      },
      {
        href: "/employee/content/events",
        label: "Events",
        icon: CalendarDays,
        roles: ["incharge"],
      },
      {
        href: "/employee/content/insight-series",
        label: "Insight Series",
        icon: Layers,
        roles: ["incharge"],
      },
      {
        href: "/employee/content/insight-categories",
        label: "Insight Categories",
        icon: Tags,
        roles: ["incharge"],
      },
      {
        href: "/employee/content/insight-authors",
        label: "Insight Authors",
        icon: Users,
        roles: ["incharge"],
      },
      {
        href: "/employee/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        roles: ["incharge"],
      },
    ];

    return baseItems.filter((item) => item.roles.includes(employee.role));
  };

  const navItems = getNavItems();

  return (
    <nav className="bg-white border-b sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-4">
            <Link href="/employee" className="text-xl font-bold text-primary">
              NCSShop <span className="text-sm font-normal">Employee</span>
            </Link>
            <Badge variant="outline" className="hidden md:flex">
              {getRoleDisplayName(employee.role)}
            </Badge>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);

              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    className="gap-2"
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </div>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <User className="w-4 h-4" />
                <span className="hidden md:inline">
                  {employee.firstName} {employee.lastName}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {employee.firstName} {employee.lastName}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {employee.email}
                  </p>
                  <Badge variant="outline" className="mt-2 w-fit">
                    {getRoleDisplayName(employee.role)}
                  </Badge>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/" className="cursor-pointer">
                  <Store className="w-4 h-4 mr-2" />
                  Back to Store
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <SignOutButton>
                <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </SignOutButton>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center gap-1 pb-2 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);

            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  className="gap-2 whitespace-nowrap"
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
