"use client";

import React, { Suspense, useEffect, useState } from "react";
import ClientHeader from "./ClientHeader";

const Header = () => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const skeleton = (
    <div
      className="h-20 bg-white border-b border-gray-100 animate-pulse"
      aria-hidden
    />
  );

  if (!isMounted) {
    return skeleton;
  }

  return (
    <Suspense fallback={skeleton}>
      <ClientHeader />
    </Suspense>
  );
};

export default Header;
