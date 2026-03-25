import { render, screen } from "@testing-library/react";
import ContentGrid from "../ContentGrid";
import { describe, expect, it } from "vitest";

describe("ContentGrid", () => {
  it("applies responsive classes with inline fallback for unsupported columns/gap", () => {
    const { container } = render(
      <ContentGrid
        items={[{ id: 1 }, { id: 2 }]}
        columns={{ sm: 2, md: 5 }}
        gap={7}
        renderItem={(item) => <div key={item.id}>Item {item.id}</div>}
      />
    );

    const wrapper = container.querySelector("div");
    expect(wrapper?.className).toContain("sm:grid-cols-2");
    expect(wrapper?.style.gridTemplateColumns).toBe("repeat(5, minmax(0, 1fr))");
    expect(wrapper?.style.gap).toBe("1.75rem");
  });

  it("renders skeletons via renderSkeleton while loading", () => {
    render(
      <ContentGrid
        items={[]}
        loading
        skeletonCount={3}
        renderSkeleton={(index) => <div key={`skel-${index}`} data-testid="custom-skeleton" />}
        renderItem={(item) => <div>{String(item)}</div>}
      />
    );

    expect(screen.getAllByTestId("custom-skeleton")).toHaveLength(3);
  });

  it("shows error card for string errors and empty state when items are missing", () => {
    const { rerender } = render(
      <ContentGrid
        items={[]}
        error="Something went wrong"
        renderItem={(item) => <div>{String(item)}</div>}
      />
    );

    expect(screen.getAllByText("Something went wrong").length).toBeGreaterThan(0);

    rerender(
      <ContentGrid
        items={[]}
        emptyState={<div data-testid="empty">No items</div>}
        renderItem={(item) => <div>{String(item)}</div>}
      />
    );

    expect(screen.getByTestId("empty")).toBeInTheDocument();
  });

  it("uses list semantics when layout is list", () => {
    render(
      <ContentGrid
        items={[1, 2]}
        layout="list"
        renderItem={(item) => <div>Item {item}</div>}
      />
    );

    const list = screen.getByRole("list");
    expect(list).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });
});
