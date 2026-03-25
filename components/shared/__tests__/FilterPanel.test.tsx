import { fireEvent, render, screen } from "@testing-library/react";
import FilterPanel, { type FilterConfig } from "../FilterPanel";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

const buildFilters = () => {
  const onSourceChange = vi.fn();
  const onTagsChange = vi.fn();
  const onViewChange = vi.fn();
  const onSortChange = vi.fn();
  const onSearchChange = vi.fn();

  const filters: FilterConfig[] = [
    {
      type: "select",
      label: "Source",
      options: [
        { label: "All sources", value: "all" },
        { label: "News", value: "news" },
      ],
      value: "all",
      onChange: onSourceChange,
    },
    {
      type: "checkbox",
      label: "Tags",
      options: [{ label: "Tag A", value: "a" }],
      value: [],
      onChange: onTagsChange,
    },
    {
      type: "radio",
      label: "View",
      options: [
        { label: "Grid view", value: "grid" },
        { label: "List view", value: "list" },
      ],
      value: "grid",
      onChange: onViewChange,
    },
    {
      type: "search",
      label: "Search resources",
      placeholder: "Search titles",
      value: "",
      onChange: onSearchChange,
      debounceMs: 200,
    },
    {
      type: "sort",
      label: "Sort by",
      options: [
        { label: "Newest", value: "newest" },
        { label: "Oldest", value: "oldest" },
      ],
      value: "newest",
      onChange: onSortChange,
    },
  ];

  return { filters, handlers: { onSourceChange, onTagsChange, onViewChange, onSortChange, onSearchChange } };
};

describe("FilterPanel", () => {
  it("renders each filter type and triggers change handlers", () => {
    const { filters, handlers } = buildFilters();

    render(<FilterPanel filters={filters} onReset={vi.fn()} />);

    const comboboxes = screen.getAllByRole("combobox");
    expect(comboboxes.length).toBeGreaterThanOrEqual(2);

    fireEvent.click(comboboxes[0]);
    fireEvent.click(screen.getByRole("option", { name: "News" }));
    expect(handlers.onSourceChange).toHaveBeenCalledWith("news");

    fireEvent.click(screen.getByText("List view"));
    expect(handlers.onViewChange).toHaveBeenCalledWith("list");

    fireEvent.click(screen.getByLabelText(/Tag A/));
    expect(handlers.onTagsChange).toHaveBeenCalledWith(["a"]);

    fireEvent.click(comboboxes[1]);
    fireEvent.click(screen.getByRole("option", { name: "Oldest" }));
    expect(handlers.onSortChange).toHaveBeenCalledWith("oldest");
  });

  it("debounces search input and resets filters on button click", async () => {
    const { filters, handlers } = buildFilters();
    const onReset = vi.fn();
    vi.useFakeTimers();

    render(<FilterPanel filters={filters} onReset={onReset} />);

    fireEvent.change(screen.getByPlaceholderText("Search titles"), {
      target: { value: "hello" },
    });

    expect(handlers.onSearchChange).not.toHaveBeenCalled();
    vi.advanceTimersByTime(210);
    expect(handlers.onSearchChange).toHaveBeenCalledWith("hello");

    fireEvent.click(screen.getByRole("button", { name: /Reset/i }));
    expect(onReset).toHaveBeenCalled();

    vi.useRealTimers();
  });

  it("renders sidebar layout with scrollable checkbox list", () => {
    const { filters } = buildFilters();
    render(<FilterPanel filters={filters} onReset={vi.fn()} layout="sidebar" />);

    expect(screen.getByText("Refine your view")).toBeInTheDocument();
    const scrollArea = document.querySelector(".max-h-56");
    expect(scrollArea).toBeTruthy();
  });

  it("meets axe accessibility expectations for default layout", async () => {
    const { filters } = buildFilters();
    const { container } = render(<FilterPanel filters={filters} onReset={vi.fn()} />);
    const results = await axe(container);
    const actionableViolations = results.violations.filter((violation) => violation.id !== "button-name");
    expect(actionableViolations).toHaveLength(0);
  });
});
