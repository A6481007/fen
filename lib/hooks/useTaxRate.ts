"use client";

import { useEffect, useState } from "react";

let cachedTaxRate: number | null = null;
let pendingTaxRateRequest: Promise<number> | null = null;

const normalizeTaxRate = (value: number) => {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value > 1 ? value / 100 : value;
};

const fetchTaxRate = async () => {
  const response = await fetch("/api/tax-rate", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    return 0;
  }

  const data = await response.json();
  return normalizeTaxRate(Number(data?.taxRate ?? 0));
};

export const useTaxRate = (fallbackRate = 0) => {
  const [taxRate, setTaxRate] = useState(() =>
    cachedTaxRate ?? normalizeTaxRate(fallbackRate)
  );

  useEffect(() => {
    let active = true;

    if (cachedTaxRate !== null) {
      setTaxRate(cachedTaxRate);
      return () => {
        active = false;
      };
    }

    const resolve = async () => {
      if (!pendingTaxRateRequest) {
        pendingTaxRateRequest = fetchTaxRate()
          .then((value) => {
            cachedTaxRate = value;
            pendingTaxRateRequest = null;
            return value;
          })
          .catch((error) => {
            console.error("Unable to resolve tax rate:", error);
            pendingTaxRateRequest = null;
            return normalizeTaxRate(fallbackRate);
          });
      }

      const value = await pendingTaxRateRequest;
      if (active) {
        setTaxRate(value);
      }
    };

    void resolve();

    return () => {
      active = false;
    };
  }, [fallbackRate]);

  return taxRate;
};
