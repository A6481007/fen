import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ArticleGrid from "@/components/news/ArticleGrid";
import AttachmentsPanel from "@/components/news/AttachmentsPanel";
import GatedResources, { type EventResourceItem } from "@/components/events/GatedResources";
import ResourceGrid from "@/components/resources/ResourceGrid";
import EventGrid from "@/components/events/EventGrid";
import NewsFilters from "@/components/news/NewsFilters";
import ResourcesClient from "@/components/resources/ResourcesClient";
import CatalogGrid from "@/components/catalog/CatalogGrid";
import CatalogPageClient from "@/components/catalog/CatalogPageClient";
import type { AggregatedResource } from "@/sanity/queries/resources";
import type { CatalogItem } from "@/sanity/queries/catalog";
import { afterEach, describe, expect, it, vi } from "vitest";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => "/news",
  useSearchParams: () => new URLSearchParams(""),
}));

vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => {
    const { alt = "", ...rest } = props;
    return <img alt={alt} {...rest} />;
  },
}));

vi.mock("../../news/ArticleCard", () => ({
  __esModule: true,
  default: ({ article, featured }: any) => (
    <div data-testid="article-card" data-featured={featured ? "true" : "false"}>
      {article.title}
    </div>
  ),
  ArticleCardSkeleton: ({ featured }: any) => (
    <div data-testid="article-skeleton" data-featured={featured ? "true" : "false"} />
  ),
}));

vi.mock("../../events/EventCard", () => ({
  __esModule: true,
  default: ({ event }: any) => <div data-testid="event-card">{event.title}</div>,
}));

vi.mock("@/components/catalog/CatalogCard", () => ({
  __esModule: true,
  default: ({ item }: any) => <div data-testid="catalog-card">{item.title}</div>,
}));

afterEach(() => {
  pushMock.mockClear();
});

const baseResource: AggregatedResource = {
  id: "res-1",
  source: "event",
  parentId: "parent-1",
  parentSlug: "parent-slug",
  parentTitle: "Parent",
  parentType: "event",
  parentDate: "2025-12-01T00:00:00Z",
  title: "Locked resource",
  description: "Desc",
  fileType: "PDF",
  status: "event_locked",
  file: {
    asset: {
      _id: "asset",
      url: "https://example.com/file.pdf",
      originalFilename: "file.pdf",
      size: 1024,
      mimeType: "application/pdf",
      extension: "pdf",
      metadata: { size: 1024 },
    },
  },
  access: { isVisible: false, lockReason: "Register first", unlockDate: null },
};

describe("Shared integrations", () => {
  it("shows lock badge and alert messaging in ResourceGrid when clicking a locked resource", async () => {
    const unlocked: AggregatedResource = {
      ...baseResource,
      id: "res-2",
      title: "Unlocked resource",
      access: { isVisible: true, lockReason: null, unlockDate: null },
      status: "public",
    };

    render(<ResourceGrid resources={[baseResource, unlocked]} view="list" />);

    const lockedButton = screen.getByRole("button", { name: /Locked resource: Register first/i });
    fireEvent.click(lockedButton);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/Locked resource/i);
    expect(alert).toHaveTextContent(/Register first/i);
  });

  it("renders locked attachments and gated resources with disabled CTAs", () => {
    render(
      <>
        <AttachmentsPanel
          linkedEventSlug="event-1"
          linkedEventTitle="Event title"
          attachments={[
            {
              _key: "a1",
              title: "Attachment 1",
              status: "event_locked",
              fileType: "PDF",
              file: { asset: { originalFilename: "file.pdf" } },
              access: { isVisible: false, lockReason: "Wait for event" },
            },
          ]}
        />
        <GatedResources
          isAttendee={false}
          canAccess={false}
          status="upcoming"
          resources={[
            {
              _key: "g1",
              title: "Resource 1",
              status: "event_locked",
              fileType: "PDF",
              file: { asset: { url: "https://example.com/file.pdf" } },
              access: { isVisible: false, lockReason: "Register to unlock" },
            } as EventResourceItem,
          ]}
        />
      </>
    );

    const lockedButtons = screen.getAllByRole("button", { name: /Locked/i });
    lockedButtons.forEach((button) => expect(button).toBeDisabled());
  });

  it("renders ContentGrid adapters with featured spans and empty/error states", () => {
    render(
      <>
        <ArticleGrid
          highlightFirst
          articles={[
            { _id: "1", title: "First", slug: { current: "first" } },
            { _id: "2", title: "Second", slug: { current: "second" } },
            { _id: "3", title: "Third", slug: { current: "third" } },
          ]}
        />
        <EventGrid events={[]} />
        <CatalogGrid items={[]} errorMessage="Catalog failed" />
      </>
    );

    const articleCards = screen.getAllByTestId("article-card");
    expect(articleCards[0]).toHaveAttribute("data-featured", "true");
    expect(screen.getByText("No events found.")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("pushes query updates from NewsFilters interactions", () => {
    render(
      <NewsFilters
        categories={[
          { label: "All categories", value: "all" },
          { label: "General", value: "general" },
        ]}
        activeCategory="all"
        activeSort="newest"
        searchQuery=""
        totalCount={10}
      />
    );

    fireEvent.click(screen.getByText("General"));
    expect(pushMock).toHaveBeenCalledWith("/news?category=general&page=1");
  });

  it("updates ResourcesClient view via FilterPanel controls", async () => {
    const resources: AggregatedResource[] = [
      { ...baseResource, id: "res-3", access: { isVisible: true, lockReason: null, unlockDate: null } },
      { ...baseResource, id: "res-4", title: "Another", access: { isVisible: true, lockReason: null, unlockDate: null } },
    ];

    render(<ResourcesClient resources={resources} />);

    fireEvent.click(screen.getByText("List view"));

    await waitFor(() => {
      const card = screen.getByRole("article", { name: /Locked resource/i });
      expect(card.className).toContain("md:flex-row");
    });
  });

  it("paginates CatalogPageClient and calls router push", () => {
    const items: CatalogItem[] = [
      {
        _id: "cat-1",
        title: "Catalog item",
        slug: "catalog-item",
        metadata: {},
        file: { asset: { url: "https://example.com/file.pdf", originalFilename: "file.pdf", metadata: { size: 1024 } } } as any,
      },
    ];

    render(
      <CatalogPageClient
        items={items}
        totalCount={1}
        totalPages={2}
        currentPage={1}
        limit={10}
        filters={{ categories: [], fileTypes: [], tags: [] }}
        initialFilters={{ category: "", fileType: "", tags: [], search: "", sort: "date_desc", page: 1 }}
        sortOptions={[{ label: "Newest", value: "date_desc" }]}
        errorMessage={null}
      />
    );

    fireEvent.click(screen.getByRole("link", { name: /Go to next page/i }));
    expect(pushMock).toHaveBeenCalledWith(
      "/catalog?sort=date_desc&page=2",
      expect.objectContaining({ scroll: false })
    );
  });
});
