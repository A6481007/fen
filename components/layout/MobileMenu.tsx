"use client";

import { AlignLeft } from "lucide-react";
import { useState } from "react";

import Sidebar from "./Sidebar";
import { Sheet, SheetContent, SheetTrigger } from "../ui/sheet";

const MobileMenu = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label={isSidebarOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isSidebarOpen}
          className="md:hidden rounded-md p-2 text-ink hover:bg-surface-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-ink-strong)]"
        >
          <AlignLeft className="w-6 h-6" />
        </button>
      </SheetTrigger>

      <SheetContent
        side="left"
        className="p-0 sm:max-w-md bg-surface-0 text-ink"
        aria-label="Mobile navigation"
      >
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      </SheetContent>
    </Sheet>
  );
};

export default MobileMenu;
