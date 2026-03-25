import { describe, expect, it } from "vitest";

import { getReadingTime } from "@/lib/utils/readingTime";

describe("getReadingTime", () => {
  it("returns ceiling minutes based on 200 wpm", () => {
    expect(getReadingTime(800)).toBe("~4 min read");
  });
});
