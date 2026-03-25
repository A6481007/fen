"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import i18n from "i18next";
import { Employee, getRoleDisplayName } from "@/types/employee";
import { Badge } from "@/components/ui/badge";
import { LogOut, User, Store, Languages } from "lucide-react";
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
import { defaultFeatureFlags, filterNavSections, resolveNavHref } from "@/config/nav-config";
import { permissionsFromStaffRoles, type BackofficeRole } from "@/config/authz";
import {
  getActiveHref,
  normalizePath,
} from "@/lib/nav-active";

const languages = [
  { code: "en", label: "EN" },
  { code: "th", label: "TH" },
];

const normalizeLang = (value?: string | null) => (value || "en").split("-")[0] || "en";

interface EmployeeNavProps {
  employee: Employee;
}

export default function EmployeeNav({ employee }: EmployeeNavProps) {
  const pathname = usePathname();
  const [lang, setLang] = useState<string>(normalizeLang(i18n.resolvedLanguage || i18n.language));
  const [showLangMenu, setShowLangMenu] = useState(false);
  const staffRoles = employee.staffRoles ?? [];
  const roles: BackofficeRole[] = Array.from(
    new Set([employee.role as BackofficeRole, ...staffRoles])
  );
  const permissions = permissionsFromStaffRoles(staffRoles);
  const navSections = filterNavSections(
    roles,
    "employee",
    defaultFeatureFlags,
    permissions
  );
  const navItems = navSections.flatMap((section) => section.items);
  const navLinks = navItems
    .map((item) => ({
      item,
      href: normalizePath(resolveNavHref(item, "employee")),
    }))
    .filter(({ href }) => href && href !== "#");
  const activeHref = getActiveHref(pathname ?? "", navLinks.map((link) => link.href));

  useEffect(() => {
    const handler = (lng: string) => setLang(normalizeLang(lng));
    i18n.on("languageChanged", handler);
    return () => {
      i18n.off("languageChanged", handler);
    };
  }, []);

  const changeLanguage = (code: string) => {
    setShowLangMenu(false);
    i18n.changeLanguage(code);
    setLang(normalizeLang(code));
  };

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
          <div className="hidden md:flex items-center gap-1 overflow-x-auto whitespace-nowrap">
            {navLinks.map(({ href, item }) => {
              const Icon = item.icon ?? User;
              const isActive = activeHref === href;

              return (
                <Button
                  key={href}
                  asChild
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  className="gap-2 shrink-0"
                >
                  <Link href={href} aria-current={isActive ? "page" : undefined} className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                </Button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            {/* Language switcher */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowLangMenu((s) => !s)}
                className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-ink hover:border-ink/80 hover:bg-white transition"
                aria-haspopup="listbox"
                aria-expanded={showLangMenu}
              >
                <Languages className="h-4 w-4" />
                <span className="uppercase tracking-wide">{lang}</span>
              </button>
              {showLangMenu && (
                <div className="absolute right-0 mt-2 w-20 rounded-xl border border-border bg-white shadow-lg z-50">
                  {languages.map((lng) => (
                    <button
                      key={lng.code}
                      className={`flex w-full items-center justify-between px-3 py-2 text-xs hover:bg-surface-1 ${
                        lng.code === lang ? "text-ink font-semibold" : "text-ink-muted"
                      }`}
                      onClick={() => changeLanguage(lng.code)}
                      role="option"
                      aria-selected={lng.code === lang}
                    >
                      <span className="uppercase">{lng.code}</span>
                    </button>
                  ))}
                </div>
              )}
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
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center gap-1 pb-2 overflow-x-auto whitespace-nowrap">
          {navLinks.map(({ href, item }) => {
            const Icon = item.icon ?? User;
            const isActive = activeHref === href;

            return (
              <Button
                key={href}
                asChild
                variant={isActive ? "default" : "ghost"}
                size="sm"
                className="gap-2 whitespace-nowrap shrink-0"
              >
                <Link href={href} aria-current={isActive ? "page" : undefined} className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              </Button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
