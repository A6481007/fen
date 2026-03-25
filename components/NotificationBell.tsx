"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useUserData } from "@/contexts/UserDataContext";

export default function NotificationBell() {
  const { isLoaded, isSignedIn } = useUser();
  const { unreadNotifications } = useUserData();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || !isLoaded || !isSignedIn) {
    return null;
  }

  const displayCount = unreadNotifications > 9 ? "9+" : unreadNotifications;

  return (
    <Link href="/user/notifications" className="relative">
      <Bell className="text-brand-black-strong/80 group-hover:text-brand-black-strong hoverEffect" />
      {unreadNotifications > 0 ? (
        <span
          className={`absolute -top-1 -right-1 bg-brand-red-accent text-white rounded-full text-xs font-semibold flex items-center justify-center min-w-[14px] h-[14px] ${
            unreadNotifications > 9 ? "px-1" : ""
          }`}
        >
          {displayCount}
        </span>
      ) : (
        <span
          className={`absolute -top-1 -right-1 bg-brand-red-accent text-white rounded-full text-xs font-semibold flex items-center justify-center min-w-[14px] h-[14px]`}
        >
          0
        </span>
      )}
    </Link>
  );
}
