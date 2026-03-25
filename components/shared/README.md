# Shared UI stack

Consolidated primitives used across News, Events, Resources, and Catalog surfaces. These components ship with accessibility affordances (aria-labels, focus rings), loading/empty/error handling, and lock-state helpers used by gated content.

## Component catalog
- **AccessControl** – span wrapper that swaps children for a fallback when `accessible` is false, stamps `data-access-level`, and invokes `onAccessDenied`.
- **LockBadge** – status pill for lock reasons; variants: `event-locked`, `auth-required`, `coming-soon`, `capacity-full`, plus `unlocked` when `isLocked` is `false`.
- **ContentCard (+Skeleton)** – card shell with grid/list layouts, size variants, badges/metadata/actions, and optional lock badge that disables link-only actions when locked.
- **ContentGrid** – responsive list/grid wrapper that centralizes loading skeletons, error/empty rendering, gap/column fallbacks, and list roles.
- **FilterPanel** – unified filter controls (select, multiselect/checkbox, radio, search with debounce, sort) with horizontal/vertical/sidebar layouts and reset handling.
- **ResourceCard (+Skeleton)** – AggregatedResource adapter that formats file size/type, shows lock CTAs through AccessControl, and supports grid/list size presets.
- **ShareButton** – share/copy helper that opens the native share sheet when available and falls back to clipboard copy.
- **PDFViewer** – react-pdf wrapper with prefetch/download buttons, fullscreen/zoom controls, and fallback UI when previews fail or URLs are absent.

## Usage snippets from adapters
- **AccessControl + LockBadge (ResourceCard, AttachmentsPanel, GatedResources)**
  ```tsx
  <AccessControl
    accessible={!isLocked}
    accessLevel={resource.status === "event_locked" ? "event-locked" : "public"}
    fallback={
      <Button variant="outline" onClick={() => onLockedClick?.(resource, lockMessage)}>
        <LockBadge isLocked reason={lockMessage} className="bg-transparent p-0 text-xs" />
        <span className="ml-1 text-xs font-semibold">Locked</span>
      </Button>
    }
  >
    <Button asChild>
      <Link href={fileUrl} target="_blank" rel="noopener noreferrer">
        <Download className="mr-2 h-4 w-4" aria-hidden="true" />
        Download
      </Link>
    </Button>
  </AccessControl>
  ```

- **ContentGrid + ContentCard adapters (ArticleGrid/EventGrid/CatalogGrid)**
  ```tsx
  <ContentGrid
    items={articles}
    loading={isLoading}
    columns={{ sm: 1, md: 2, xl: 3 }}
    renderItem={(article, index) => {
      const featured = highlightFirst && index === 0 && articles.length > 2;
      return <ArticleCard key={article._id ?? index} article={article} featured={featured} />;
    }}
    renderSkeleton={(index) => (
      <ContentCard.Skeleton key={`article-skel-${index}`} layout="grid" size="default" />
    )}
  />
  ```

- **FilterPanel configs (NewsFilters, ResourcesClient, CatalogPageClient)**
  ```tsx
  const filterConfigs: FilterConfig[] = [
    { type: "search", label: "Search news", value: normalizedSearch, onChange: (value) => updateParams({ search: value as string }) },
    { type: "radio", label: "Category", options: categories, value: normalizedActiveCategory, onChange: (value) => updateParams({ category: value === "all" ? null : (value as string) }) },
    { type: "sort", label: "Sort by", options: SORT_OPTIONS, value: normalizedSort, onChange: (value) => updateParams({ sort: value as string }) },
  ];

  <FilterPanel filters={filterConfigs} resultCount={totalCount} onReset={handleReset} layout="sidebar" />
  ```

- **PDFViewer inside CatalogDetail**
  ```tsx
  <PDFViewer
    fileUrl={item.file?.asset?.url}
    title={item.title || "Catalog document"}
    fallback={<p className="text-xs text-slate-600">Try the download button if preview fails.</p>}
  />
  ```

## API reference (selected props)

### AccessControl
| Prop | Type | Notes |
| --- | --- | --- |
| `accessible` | `boolean` | Toggles children vs. `fallback`. |
| `fallback` | `ReactNode` | Rendered when access is denied. |
| `accessLevel` | `"public" \| LockBadgeVariant` | Defaults to `public`; forwarded to `data-access-level`. |
| `onAccessDenied` | `() => void` | Fired once when `accessible` is false. |

### LockBadge
| Prop | Type | Notes |
| --- | --- | --- |
| `variant` | `"event-locked" \| "auth-required" \| "coming-soon" \| "capacity-full"` | Default `event-locked`. |
| `isLocked` | `boolean` | When `false`, shows the unlocked pill. |
| `message` / `reason` | `string` | Custom label; falls back to variant label. |
| `animated` | `boolean` | Adds pulse for `coming-soon`. |
| `icon` | `ComponentType` | Override the icon; aria-label auto-derived unless provided. |

### ContentCard
| Prop | Type | Notes |
| --- | --- | --- |
| `layout` | `"grid" \| "list"` | Adjusts wrapper flex/grid and media sizing. |
| `size` | `"compact" \| "default" \| "large"` | Controls padding, text sizes, and media height. |
| `featured` | `boolean` | Spans two columns in grid layouts. |
| `locked` | `boolean` | Shows LockBadge; disables link-only primary actions. |
| `primaryAction` / `secondaryAction` | `ContentCardAction` | Buttons/links; disabled when locked without `onClick`. |
| `mediaHref` | `string` | Adds overlay link over the image. |
| `share` | `ContentCardShare` | Optional share payload; falls back to `mediaHref`/action hrefs. |

### ContentGrid
| Prop | Type | Notes |
| --- | --- | --- |
| `items` | `T[]` | Required content list. |
| `layout` | `"grid" \| "list"` | Uses CSS grid vs. list roles. |
| `columns` | `ColumnConfig` | Responsive counts; falls back to inline `gridTemplateColumns` for non-mapped values. |
| `gap` | `number` | Gap tokens 0–12 with inline fallback when unsupported. |
| `loading` / `skeletonCount` / `renderSkeleton` | `boolean` / `number` / `(index) => ReactNode` | Controls loading state. |
| `error` | `Error \| string \| ReactNode` | Renders Card with message unless already a ReactNode. |
| `emptyState` | `ReactNode` | Rendered when `items` is empty. |

### FilterPanel
| Prop | Type | Notes |
| --- | --- | --- |
| `filters` | `FilterConfig[]` | Each entry renders select/radio/checkbox/search/sort. |
| `layout` | `"horizontal" \| "vertical" \| "sidebar"` | Controls grouping and scroll area for checkbox lists. |
| `onReset` | `() => void` | Clears filters; button disabled while `isLoading`. |
| `isLoading` | `boolean` | Disables controls and debounce timers use `filter.debounceMs ?? 350ms`. |

### ResourceCard
| Prop | Type | Notes |
| --- | --- | --- |
| `resource` | `AggregatedResource` | Determines file labels, parent links, and access state. |
| `view` | `"grid" \| "list"` | Controls layout classes. |
| `size` | `"compact" \| "default" \| "expanded"` | Adjusts spacing/icon sizes. |
| `onLockedClick` | `(resource, message) => void` | Called from locked fallback CTA. |

### PDFViewer
| Prop | Type | Notes |
| --- | --- | --- |
| `fileUrl` | `string \| null` | Required for previews/downloads; missing URL shows fallback card. |
| `title` | `string` | Heading + ARIA labels. |
| `fallback` | `ReactNode` | Extra content inside fallback alert. |
| Behavior | — | Prefetches blob with CORS, exposes zoom/slider/fullscreen, announces loading via `aria-live`, and surfaces download errors inline. |

## Migration notes
- Legacy per-page filter panels (news/resources/catalog) were replaced by `components/shared/FilterPanel.tsx`; see backups logged on 2025-12-02 for the removed wrappers.
- Resource attachments/download tiles now flow through `ResourceCard` + `AccessControl` instead of bespoke cards in News/Events.
- Catalog detail uses the shared `PDFViewer` in place of ad-hoc iframe previews.

## Best practices
- Wrap any gated CTA with `AccessControl` and include a `LockBadge` so aria-labels announce lock reasons.
- Always pass `ariaLabel`/`title` strings for primary actions when the label is non-descriptive (e.g., icon-only buttons).
- Provide `emptyState`/`error` props to `ContentGrid` instead of handling empties in callers.
- For `FilterPanel`, default search debounce to 350ms and reset pagination/query params when filters change.
- Ensure lock states still render descriptive metadata (e.g., file size/type) so users know what they are unlocking.
