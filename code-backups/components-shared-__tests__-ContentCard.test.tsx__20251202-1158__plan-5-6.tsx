import { fireEvent, render, screen } from "@testing-library/react";
import ContentCard from "../ContentCard";
import { describe, expect, it, vi } from "vitest";

describe("ContentCard", () => {
  it("renders badges, metadata, and actions", () => {
    render(
      <ContentCard
        title="Sample title"
        description="Sample description"
        badges={[{ label: "News" }]}
        metadata={[{ label: "Date", value: "Today" }]}
        primaryAction={{ label: "Read more", href: "#read" }}
        secondaryAction={{ label: "Save", onClick: vi.fn() }}
      />
    );

    expect(screen.getByRole("article", { name: /Sample title/i })).toBeInTheDocument();
    expect(screen.getByText("News")).toBeInTheDocument();
    expect(screen.getByText("Date")).toBeInTheDocument();
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Read more/i })).toBeInTheDocument();
  });

  it("shows locked state and disables primary action when no handler is provided", () => {
    render(
      <ContentCard
        title="Locked item"
        locked
        lockMessage="Register to view"
        primaryAction={{ label: "Register", href: "#register" }}
      />
    );

    expect(screen.getByLabelText("Locked: Register to view")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Register/i })).toBeDisabled();
  });

  it("keeps primary action enabled when locked but onClick is supplied", () => {
    const handleClick = vi.fn();
    render(
      <ContentCard
        title="Interactive"
        locked
        lockMessage="Override lock"
        primaryAction={{ label: "Open", onClick: handleClick }}
      />
    );

    const button = screen.getByRole("button", { name: /Open/i });
    expect(button).not.toBeDisabled();
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalled();
  });

  it("renders the skeleton variant for list layout", () => {
    render(<ContentCard.Skeleton layout="list" size="compact" featured />);

    const skeleton = screen.getByRole("status", { name: /Loading content/i });
    expect(skeleton).toBeInTheDocument();
    expect(skeleton.getAttribute("data-layout")).toBe("list");
    expect(skeleton.className).toContain("md:flex-row");
  });
});
