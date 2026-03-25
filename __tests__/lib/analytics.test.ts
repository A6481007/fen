import { describe, it, expect, beforeEach, vi } from "vitest";
import * as analyticsModule from "@/lib/analytics";

describe("trackCartView throttling", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("fires view_cart only once per session by default", () => {
    const spy = vi.spyOn(analyticsModule, "trackEvent").mockImplementation(() => {});

    analyticsModule.trackCartView({ userId: "user-1", cartValue: 100, itemCount: 2 });
    analyticsModule.trackCartView({ userId: "user-1", cartValue: 200, itemCount: 3 });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("view_cart", {
      userId: "user-1",
      cartValue: 100,
      itemCount: 2,
    });
  });

  it("allows forced view_cart events even after throttle", () => {
    const spy = vi.spyOn(analyticsModule, "trackEvent").mockImplementation(() => {});

    analyticsModule.trackCartView({ userId: "user-1" });
    analyticsModule.trackCartView({ userId: "user-1", force: true, cartValue: 50 });

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenLastCalledWith("view_cart", {
      userId: "user-1",
      cartValue: 50,
    });
  });
});
