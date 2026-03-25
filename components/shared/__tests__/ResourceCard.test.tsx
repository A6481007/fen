import { fireEvent, render, screen } from "@testing-library/react";
import type { AggregatedResource } from "@/sanity/queries/resources";
import ResourceCard from "../ResourceCard";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

const baseResource: AggregatedResource = {
  id: "resource-1",
  source: "news",
  parentId: "parent-1",
  parentSlug: "parent-slug",
  parentTitle: "Parent Title",
  parentType: "news",
  parentDate: "2025-12-01T00:00:00Z",
  title: "Resource Title",
  description: "Resource description",
  fileType: "PDF",
  status: "public",
  file: {
    asset: {
      _id: "asset-id",
      url: "https://example.com/file.pdf",
      originalFilename: "file.pdf",
      size: 2048,
      mimeType: "application/pdf",
      extension: "pdf",
      metadata: { size: 2048 },
    },
  },
  access: { isVisible: true, lockReason: null, unlockDate: null },
};

const buildResource = (overrides: Partial<AggregatedResource> = {}): AggregatedResource => {
  const fileOverride = overrides.file;
  const resolvedFile =
    fileOverride === null
      ? null
      : {
          asset: {
            ...(baseResource.file?.asset || {}),
            ...(fileOverride?.asset || {}),
            metadata: {
              ...(baseResource.file?.asset?.metadata || {}),
              ...(fileOverride?.asset?.metadata || {}),
            },
          },
        };

  return {
    ...baseResource,
    ...overrides,
    access: { ...baseResource.access, ...(overrides.access || {}) },
    file: resolvedFile,
  };
};

describe("ResourceCard", () => {
  it("shows a fallback size label when size metadata is missing", () => {
    const resource = buildResource({
      file: {
        asset: {
          url: "https://example.com/file.pdf",
          originalFilename: "file.pdf",
          size: null,
          metadata: { size: null },
        },
      },
    });

    render(<ResourceCard resource={resource} />);

    expect(screen.getByText("Size not available")).toBeInTheDocument();
  });

  it("falls back to the generic file icon if rendering fails", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const resource = buildResource({
      // @ts-expect-error intentionally pass a bad fileType to trigger the guard
      fileType: {},
    });

    render(<ResourceCard resource={resource} />);

    expect(screen.getByTestId("resource-icon-fallback")).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it("exposes article role and lock state labels for accessibility", () => {
    const lockReason = "Register to access this resource";
    const resource = buildResource({
      access: { isVisible: false, lockReason },
      status: "event_locked",
    });

    render(<ResourceCard resource={resource} />);

    expect(screen.getByRole("article", { name: /Resource Title/i })).toBeInTheDocument();
    expect(screen.getByLabelText(`Locked resource: ${lockReason}`)).toBeInTheDocument();
  });

  it("renders the loading skeleton variant for list view", () => {
    render(<ResourceCard.Skeleton view="list" size="compact" />);

    const skeleton = screen.getByTestId("resource-card-skeleton");
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveAttribute("aria-label", "Loading resource");
    expect(skeleton.className).toContain("md:flex-row");
  });

  it("applies size variants to the card layout", () => {
    const { getByRole, unmount } = render(<ResourceCard resource={buildResource()} />);
    expect(getByRole("article").className).toContain("p-5");
    unmount();

    const { getByRole: getCompact, unmount: unmountCompact } = render(
      <ResourceCard resource={buildResource()} size="compact" />
    );
    expect(getCompact("article").className).toContain("p-4");
    unmountCompact();

    const { getByRole: getExpanded } = render(
      <ResourceCard resource={buildResource()} size="expanded" />
    );
    expect(getExpanded("article").className).toContain("p-6");
  });

  it("renders locked CTA with aria label and handles onLockedClick", () => {
    const lockReason = "Register for the event";
    const resource = buildResource({
      access: { isVisible: false, lockReason },
      status: "event_locked",
    });
    const onLockedClick = vi.fn();

    render(<ResourceCard resource={resource} onLockedClick={onLockedClick} />);

    const lockedCta = screen.getByRole("button", { name: `Locked resource: ${lockReason}` });
    expect(lockedCta).toBeInTheDocument();
    fireEvent.click(lockedCta);
    expect(onLockedClick).toHaveBeenCalledWith(resource, lockReason);
  });

  it("applies list view layout classes and data labels", () => {
    render(<ResourceCard resource={buildResource()} view="list" size="expanded" />);

    const card = screen.getByRole("article", { name: /Resource Title/i });
    expect(card.className).toContain("md:flex-row");
    expect(card.className).toContain("p-6");
  });

  it("passes axe accessibility checks for unlocked resources", async () => {
    const { container } = render(<ResourceCard resource={buildResource()} />);
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
