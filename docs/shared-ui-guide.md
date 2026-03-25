# Shared UI visual guide

Storybook is not enabled in this repo; this markdown captures the key states and how to render them with existing components.

## Access / lock states
- **Locked download CTA** (ResourceCard, AttachmentsPanel, GatedResources): show `LockBadge` plus dashed outline button inside `AccessControl` fallback.
  ```tsx
  <AccessControl accessible={false} accessLevel="event-locked" fallback={<LockedCta />}>
    <Button>Download</Button>
  </AccessControl>
  ```
- **Unlocked**: set `isLocked={false}` on `LockBadge` for green styling.
- **Coming soon pulse**: `variant="coming-soon"` + `animated`.

## Grid + card layouts
- **ContentCard grid/list**: `layout="grid"` for column cards (default badges over media), `layout="list"` to stack media left with content/action bar on the right.
- **Featured grid tiles**: pass `featured` to span 2 columns when used with `ContentGrid` columns `md>=2`.
- **Skeletons**: use `ContentCard.Skeleton` and `ResourceCard.Skeleton` with matching `layout/view` values; `ContentGrid` will also call `renderSkeleton`.
- **Empty vs. error**: provide `emptyState` and `error` ReactNodes to `ContentGrid`; when `error` is a string/Error, it renders the red card shell.

## Filter layouts
- **Horizontal (default)**: search + sort on the right, other fields in a responsive grid.
- **Vertical**: `layout="vertical"` renders filters in a single column stack.
- **Sidebar**: `layout="sidebar"` enables sticky card with scrollable checkbox lists and active badge counts.
- **Search debounce**: defaults to 350ms; override per filter with `debounceMs`.

## PDFViewer states
- **No file URL**: renders a card with Alert icon and a short note.
- **Loading/prefetch**: shows overlay spinner; `aria-live="polite"` announces progress.
- **Download failure**: try/catch surfaces inline red text and keeps the fallback download CTA enabled.
- **Fullscreen**: toggled via "Full screen" button; body scrolling is disabled while active.
