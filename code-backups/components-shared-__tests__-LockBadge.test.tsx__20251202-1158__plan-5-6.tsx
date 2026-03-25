import { render, screen } from "@testing-library/react";
import type { SVGProps } from "react";
import LockBadge from "../LockBadge";

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
});
