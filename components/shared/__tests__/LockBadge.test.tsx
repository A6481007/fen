import { render, screen } from "@testing-library/react";
import type { SVGProps } from "react";
import { axe } from "vitest-axe";
import LockBadge, { type LockBadgeVariant } from "../LockBadge";

describe("LockBadge", () => {
  it("renders the default event-locked variant with contextual label", () => {
    render(<LockBadge reason="Register to unlock" />);

    const badge = screen.getByRole("status", { name: "Event locked: Register to unlock" });
    expect(badge).toHaveAttribute("data-variant", "event-locked");
    expect(screen.getByText("Register to unlock")).toBeInTheDocument();

    const icon = badge.querySelector("svg");
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });

  it("respects custom icon and aria label for auth-required", () => {
    const CustomIcon = (props: SVGProps<SVGSVGElement>) => <svg data-testid="custom-lock-icon" {...props} />;

    render(
      <LockBadge
        variant="auth-required"
        message="Sign in to continue"
        icon={CustomIcon}
        ariaLabel="Sign-in required: Sign in to continue"
      />
    );

    const badge = screen.getByRole("status", { name: "Sign-in required: Sign in to continue" });
    expect(badge).toHaveAttribute("data-variant", "auth-required");
    expect(screen.getByTestId("custom-lock-icon")).toBeInTheDocument();
  });

  it("applies pulse animation for coming-soon when animated", () => {
    render(<LockBadge variant="coming-soon" message="Publishing soon" animated />);

    const badge = screen.getByRole("status", { name: "Coming soon: Publishing soon" });
    expect(badge).toHaveAttribute("data-variant", "coming-soon");
    expect(badge).toHaveAttribute("data-animated", "true");
    expect(badge.className).toContain("animate-pulse");
  });

  it("shows fallback label when capacity is full without message", () => {
    render(<LockBadge variant="capacity-full" />);

    const badge = screen.getByRole("status", { name: "Capacity full" });
    expect(screen.getByText("Capacity full")).toBeInTheDocument();
    expect(badge).toHaveAttribute("data-variant", "capacity-full");
  });

  it("keeps unlocked styling when isLocked is false", () => {
    render(<LockBadge isLocked={false} reason="Open access" />);

    const badge = screen.getByRole("status", { name: "Unlocked: Open access" });
    expect(badge).toHaveAttribute("data-variant", "unlocked");
    expect(badge.className).toContain("emerald");
  });

  it("renders all variants with their default labels", () => {
    const variants: Array<{ variant: LockBadgeVariant; label: string }> = [
      { variant: "event-locked", label: "Event locked" },
      { variant: "auth-required", label: "Sign-in required" },
      { variant: "coming-soon", label: "Coming soon" },
      { variant: "capacity-full", label: "Capacity full" },
    ];

    render(
      <>
        {variants.map((item) => (
          <LockBadge key={item.variant} variant={item.variant} />
        ))}
      </>
    );

    variants.forEach((item) => {
      const badge = screen.getByRole("status", { name: item.label });
      expect(badge).toHaveAttribute("data-variant", item.variant);
      expect(screen.getByText(item.label)).toBeInTheDocument();
    });
  });

  it("passes axe accessibility checks", async () => {
    const { container } = render(<LockBadge variant="auth-required" message="Sign in" />);
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
