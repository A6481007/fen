import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import AccessControl, { type AccessLevel } from "../AccessControl";

describe("AccessControl", () => {
  it("renders children when accessible", () => {
    render(
      <AccessControl accessible fallback={<div>Fallback content</div>}>
        <div>Allowed content</div>
      </AccessControl>
    );

    expect(screen.getByText("Allowed content")).toBeInTheDocument();
    expect(screen.queryByText("Fallback content")).not.toBeInTheDocument();
  });

  it("renders fallback when access is denied", () => {
    render(
      <AccessControl accessible={false} fallback={<div>Locked content</div>}>
        <div>Hidden content</div>
      </AccessControl>
    );

    expect(screen.getByText("Locked content")).toBeInTheDocument();
    expect(screen.queryByText("Hidden content")).not.toBeInTheDocument();
  });

  it("invokes onAccessDenied once when blocked", async () => {
    const onAccessDenied = vi.fn();

    render(
      <AccessControl
        accessible={false}
        fallback={<div>Locked content</div>}
        onAccessDenied={onAccessDenied}
      >
        <div>Hidden content</div>
      </AccessControl>
    );

    await waitFor(() => {
      expect(onAccessDenied).toHaveBeenCalledTimes(1);
    });
  });

  it("defaults accessLevel to public while allowing explicit levels", () => {
    const { container: defaultContainer } = render(
      <AccessControl accessible fallback={<div>Fallback content</div>}>
        <div>Allowed content</div>
      </AccessControl>
    );

    const defaultBoundary = defaultContainer.querySelector("[data-access-level]");
    expect(defaultBoundary).toHaveAttribute("data-access-level", "public");

    const explicitLevel: AccessLevel = "event-locked";
    const { container: explicitContainer } = render(
      <AccessControl
        accessible={false}
        accessLevel={explicitLevel}
        fallback={<div>Locked content</div>}
      >
        <div>Hidden content</div>
      </AccessControl>
    );

    const explicitBoundary = explicitContainer.querySelector("[data-access-level]");
    expect(explicitBoundary).toHaveAttribute("data-access-level", explicitLevel);

    const capacityLevel: AccessLevel = "capacity-full";
    const { container: capacityContainer } = render(
      <AccessControl
        accessible={false}
        accessLevel={capacityLevel}
        fallback={<div>Locked content</div>}
      >
        <div>Hidden content</div>
      </AccessControl>
    );

    const capacityBoundary = capacityContainer.querySelector("[data-access-level]");
    expect(capacityBoundary).toHaveAttribute("data-access-level", capacityLevel);
  });

  it("sets data-access-level for every lock badge variant", () => {
    const variants: AccessLevel[] = ["event-locked", "auth-required", "coming-soon", "capacity-full"];

    variants.forEach((variant) => {
      const { container } = render(
        <AccessControl
          accessible={false}
          accessLevel={variant}
          fallback={<div>Locked content</div>}
        >
          <div>Hidden content</div>
        </AccessControl>
      );

      const boundary = container.querySelector("[data-access-level]");
      expect(boundary).toHaveAttribute("data-access-level", variant);
    });
  });

  it("invokes onAccessDenied only once even when rerendered with the same locked state", async () => {
    const onAccessDenied = vi.fn();
    const { rerender } = render(
      <AccessControl accessible={false} fallback={<div>Locked</div>} onAccessDenied={onAccessDenied}>
        <div>Hidden</div>
      </AccessControl>
    );

    rerender(
      <AccessControl accessible={false} fallback={<div>Locked</div>} onAccessDenied={onAccessDenied}>
        <div>Hidden</div>
      </AccessControl>
    );

    await waitFor(() => {
      expect(onAccessDenied).toHaveBeenCalledTimes(1);
    });
  });

  it("passes axe accessibility checks for unlocked render", async () => {
    const { container } = render(
      <AccessControl accessible fallback={<div>Fallback content</div>}>
        <button type="button">Allowed</button>
      </AccessControl>
    );

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
