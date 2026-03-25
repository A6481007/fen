"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  User,
  Settings,
  Package,
  Heart,
  LogOut,
  UserCircle,
  FileText,
  Shield,
  Briefcase,
  Wallet,
} from "lucide-react";
import { useUser, useClerk } from "@clerk/nextjs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useIsAdmin } from "@/lib/adminUtils";
import { useUserData } from "@/contexts/UserDataContext";

const UserDropdown = () => {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const {
    ordersCount,
    isEmployee,
    walletBalance,
    isLoading: isLoadingOrders,
  } = useUserData();

  // Check if user is admin
  const isAdmin = useIsAdmin(user?.primaryEmailAddress?.emailAddress);

  // Avoid hydration mismatches: wait until Clerk has loaded user data
  if (!isLoaded || !user) return null;

  const handleSignOut = () => {
    signOut();
    setOpen(false);
  };

  const handleLinkClick = () => {
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="group flex max-w-[200px] items-center gap-2 rounded-full border border-brand-black-strong/20 px-2 py-1 hover:bg-brand-background-subtle hover:border-brand-black-strong">
          <span className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-full">
            {user.imageUrl ? (
              <img
                src={user.imageUrl}
                alt={user.fullName || "User"}
                className="h-full w-full object-cover border-2 border-brand-text-main/20 transition-colors group-hover:border-brand-text-main/40"
              />
            ) : (
              <UserCircle className="h-8 w-8 text-gray-500 transition-colors group-hover:text-brand-text-main" />
            )}
          </span>
          <div className="hidden min-w-0 lg:flex flex-col items-start">
            <span className="truncate text-sm font-medium text-gray-800 transition-colors group-hover:text-brand-text-main">
              {user.firstName || "User"}
            </span>
          </div>
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-72 p-0" align="end" sideOffset={5}>
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {user.imageUrl ? (
              <img
                src={user.imageUrl}
                alt={user.fullName || "User"}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <UserCircle className="w-12 h-12 text-gray-500" />
            )}
            <div>
              <h3 className="font-semibold text-gray-800">
                {user.fullName || user.firstName || "User"}
              </h3>
              <p className="text-sm text-gray-500">
                {user.primaryEmailAddress?.emailAddress}
              </p>
            </div>
          </div>
        </div>

        <div className="p-2">
          {walletBalance > 0 && (
            <div className="mb-2 mx-2 p-3 rounded-lg bg-linear-to-r from-brand-text-main/10 to-brand-black-strong/10 border border-brand-text-main/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-brand-black-strong" />
                  <span className="text-sm font-medium text-gray-700">
                    Wallet Balance
                  </span>
                </div>
                <span className="text-lg font-bold text-brand-black-strong">
                  ${walletBalance.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <Link
            href="/user/profile"
            onClick={handleLinkClick}
            className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-brand-background-subtle transition-colors duration-200 group"
          >
            <User className="w-4 h-4 text-gray-500 group-hover:text-brand-text-main transition-colors" />
            <span className="text-gray-800 group-hover:text-brand-text-main transition-colors">
              My Profile
            </span>
          </Link>

          <Link
            href="/user/orders"
            onClick={handleLinkClick}
            className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-brand-background-subtle transition-colors duration-200 group"
          >
            <Package className="w-4 h-4 text-gray-500 group-hover:text-brand-text-main transition-colors" />
            <div className="flex items-center justify-between w-full">
              <span className="text-gray-800 group-hover:text-brand-text-main transition-colors">
                My Orders
              </span>
              {isLoadingOrders ? (
                <div className="w-4 h-4 border-2 border-brand-red-accent border-t-transparent rounded-full animate-spin"></div>
              ) : (
                ordersCount > 0 && (
                  <span className="bg-brand-red-accent text-white text-xs px-2 py-0.5 rounded-full font-medium">
                    {ordersCount}
                  </span>
                )
              )}
            </div>
          </Link>

          <Link
            href="/wishlist"
            onClick={handleLinkClick}
            className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-brand-background-subtle transition-colors duration-200 group"
          >
            <Heart className="w-4 h-4 text-gray-500 group-hover:text-brand-text-main transition-colors" />
            <span className="text-gray-800 group-hover:text-brand-text-main transition-colors">
              Wishlist
            </span>
          </Link>

          <Link
          href="/user"
          onClick={handleLinkClick}
          className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-brand-background-subtle transition-colors duration-200 group"
        >
          <FileText className="w-4 h-4 text-gray-500 group-hover:text-brand-text-main transition-colors" />
          <span className="text-gray-800 group-hover:text-brand-text-main transition-colors">
            Dashboard
          </span>
        </Link>

          <Link
            href="/user/settings"
            onClick={handleLinkClick}
            className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-brand-background-subtle transition-colors duration-200 group"
          >
            <Settings className="w-4 h-4 text-gray-500 group-hover:text-brand-text-main transition-colors" />
            <span className="text-gray-800 group-hover:text-brand-text-main transition-colors">
              Settings
            </span>
          </Link>

          <div className="my-1 border-t border-gray-100"></div>

          {isEmployee && !isAdmin && (
            <Link
              href="/employee"
              onClick={handleLinkClick}
              className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-blue-50 transition-colors duration-200 group"
            >
              <Briefcase className="w-4 h-4 text-blue-500 group-hover:text-blue-600 transition-colors" />
              <span className="text-blue-600 group-hover:text-blue-700 transition-colors font-medium">
                Employee Dashboard
              </span>
            </Link>
          )}

          <Link
            href="/help"
            onClick={handleLinkClick}
            className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-brand-background-subtle transition-colors duration-200 group"
          >
            <svg
              className="w-4 h-4 text-gray-500 group-hover:text-brand-text-main transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-gray-800 group-hover:text-brand-text-main transition-colors">
              Help & Support
            </span>
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              onClick={handleLinkClick}
              className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-brand-background-subtle transition-colors duration-200 group"
            >
              <Shield className="w-4 h-4 text-brand-red-accent group-hover:text-brand-red-accent transition-colors" />
              <span className="text-brand-red-accent group-hover:text-brand-red-accent transition-colors font-medium">
                Admin Panel
              </span>
            </Link>
          )}
        </div>

        <div className="p-2 border-t border-gray-100">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-red-50 transition-colors duration-200 w-full text-left"
          >
            <LogOut className="w-4 h-4 text-red-500" />
            <span className="text-red-600">Sign Out</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default UserDropdown;
