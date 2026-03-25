"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";

type CachedDealerStatus = {
  userId: string;
  value: boolean;
};

let cachedDealerStatus: CachedDealerStatus | null = null;
let pendingDealerRequest: Promise<boolean> | null = null;

const fetchDealerStatus = async () => {
  const response = await fetch("/api/user/status", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    return false;
  }

  const data = await response.json();
  const profile = data?.userProfile;

  return Boolean(
    profile?.isBusiness === true ||
      profile?.businessStatus === "active" ||
      profile?.membershipType === "business"
  );
};

export const useDealerPricing = () => {
  const { isSignedIn, user } = useUser();
  const [useDealerPrice, setUseDealerPrice] = useState(false);

  useEffect(() => {
    let active = true;
    const userId = user?.id;

    if (!isSignedIn || !userId) {
      setUseDealerPrice(false);
      cachedDealerStatus = null;
      pendingDealerRequest = null;
      return () => {
        active = false;
      };
    }

    if (cachedDealerStatus?.userId === userId) {
      setUseDealerPrice(cachedDealerStatus.value);
      return () => {
        active = false;
      };
    }

    const resolve = async () => {
      if (!pendingDealerRequest) {
        pendingDealerRequest = fetchDealerStatus()
          .then((value) => {
            cachedDealerStatus = { userId, value };
            pendingDealerRequest = null;
            return value;
          })
          .catch((error) => {
            console.error("Unable to resolve dealer pricing:", error);
            pendingDealerRequest = null;
            return false;
          });
      }

      const value = await pendingDealerRequest;
      if (active) {
        setUseDealerPrice(value);
      }
    };

    void resolve();

    return () => {
      active = false;
    };
  }, [isSignedIn, user?.id]);

  return useDealerPrice;
};
