# News Hub + Catalog IA Restructure

## Goal and Scope
- Unify News, Resources, and Events into a single News Hub with gated resources tied to event attendance.
- Spin Downloads out into an independent Catalog with better metadata and cover-image handling.
- Add access control so event-locked resources remain restricted until registration or event end.

## Current State (repo snapshot)
- Sanity: `blog` document doubles as news/resource/event with `contentType`, `isEvent`, `isResource`; `download` document powers the Catalog (`/catalog`); `eventRsvp` captures RSVPs but no first-class event doc or attendee linkage.
- Queries: news/events/resources/downloads come from `sanity/queries/query.ts` and `sanity/queries/index.ts` (`getNewsArticles`, `getEvents`, `getResources`, `getDownloads`, `getSingleNews`); no catalog or resource access control queries.
- Frontend pages: `/news` (mixed grid), `/news/[slug]` (article only), `/news/events` (list + RSVP form, no detail page), `/news/resources`, `/catalog`; no `/news/events/[slug]` or `/catalog/[slug]`.
- Navigation: `headerData` and `components/layout/HeaderMenu.tsx` expose a News mega dropdown with News/Downloads/Events/Resources; mobile `components/layout/Sidebar.tsx` mirrors that grouping; no Catalog entry.

## Target IA (locked)
- Top-level nav (desktop + mobile): `News + Resources + Events | Catalog`.
- Desktop: one mega dropdown labeled “News + Resources + Events” showing News (`/news`), Resources (`/news/resources`), Events (`/news/events`).
- Mobile sidebar: expandable “News + Resources + Events” with nested News / Resources / Events links; Catalog is a direct link.

## Routes and Redirects
- `/news` → news hub (all article types).
- `/news/events` → events listing + registration hub.
- `/news/events/[slug]` → event detail + gated resources.
- `/news/resources` → unified resource list (news attachments + event resources with gating).
- `/catalog` → standalone catalog grid.
- `/catalog/[slug]` → catalog detail with inline PDF viewer.
- Redirects: legacy downloads routes should 301 to `/catalog`, including wildcard variants.

## Sanity Content Model Plan
- **News** (`news` document):
  - Fields: title, slug, publishDate, author, content (rich text), featuredImage, category enum (`announcement | partnership | event_announcement | general`).
  - `linkedEvent` (reference to `event`, optional) to power event CTA + gated attachment logic.
  - `attachments` array: {file, title, description, fileType enum `PDF | image | document | link`, status enum `public | event_locked`, _key}. `event_locked` implies linked event gate or unlock after event end.
- **Event** (`event` document):
  - Fields: title, slug, description, date (datetime), location, image, registrationOpen (bool), maxAttendees?, attendees array {name,email,phone,companyName,notes,registrationDate,_key}.
  - `resources` array: gated downloads/links with fileType metadata.
  - `promotionalArticles`: back-reference to news articles (filled via `linkedEvent`).
  - `status` enum (`upcoming | ongoing | ended`), ideally auto-computed from date with manual override option.
- **Catalog** (`catalog` document):
  - Fields: title, slug, description, publishDate, file (PDF/doc), metadata {category, tags[], version, fileSize, fileType}, relatedDownloads[].
  - `coverImage`: {customCover?, useAutoGeneration: bool, generatedFromFile: string metadata}. Auto-gen should pull first page thumbnail; fallback placeholder if generation fails or file too small.
- **Access control metadata**: retain `event_locked` status on attachments/resources; use `linkedEvent` to evaluate unlock state.

## Access Control Logic (apply in queries/resolvers + UI)
- `public` → always visible.
- `event_locked` → visible if user attended linked event **and** event status is `ongoing`/`ended`; visible to all once event status is `ended`; otherwise show lock badge “Available after [event date]”.
- Store attendance via `attendees` array on `event` (or map `eventRsvp` docs to it); expose helper `isUserEventAttendee(userId, eventId)`.

## Queries and Resolver Mapping (Sanity + Next data layer)
- News Hub:
  - `getNewsArticles(category?, search?, limit?, offset?)` → filter by category/type, search title/body, paginate.
  - `getNewsArticleBySlug(slug, userId?)` → single article plus attachments filtered through `checkResourceAccess`.
  - `getNewsResourcesByArticle(articleId, userId?)` → attachment array with access flags and parent event info.
- Events Hub:
  - `getEvents(status?, sort?)` → list with status badges and registrationOpen flag.
  - `getEventBySlug(slug, userId?)` → event details, attendee preview if registered, gated resources filtered.
  - `getUserEventRegistrations(userId)` / `isUserEventAttendee(userId, eventId)` → gate checks.
- Resources page:
  - `getAllResources(type?, fileType?, search?, userId?)` → aggregates news attachments + event resources with access control.
  - `getResourcesBySource(source: "news" | "event", sourceId, userId?)`.
- Catalog:
  - `getCatalogItems(category?, search?, sort?, limit?, offset?)`.
  - `getCatalogItemBySlug(slug)` → includes version history + related downloads.
  - `getCatalogCoverImage(catalogId)` → resolves custom vs generated cover metadata.
- Implementation notes: keep caching via `unstable_cache` with new tags (`news`, `events`, `resources`, `catalog`); reuse `sanityFetch` and centralize access control helper in `sanity/helpers`.

## Frontend Work Map (by path)
- Navigation: update `components/layout/HeaderMenu.tsx`, `components/layout/Sidebar.tsx`, and `constants/index.ts` to use the locked IA labels and URLs; desktop mega menu merges News/Resources/Events, Catalog is standalone.
- News: `app/(client)/news/page.tsx` (list with filters/search), `app/(client)/news/[slug]/page.tsx` (attachments/resources panel, event CTA when `linkedEvent`), replace old downloads reference.
- Events: `app/(client)/news/events/page.tsx` (listing filters + registration entry), add `app/(client)/news/events/[slug]/page.tsx` (detail, registration state, gated resources, related articles).
- Resources: `app/(client)/news/resources/page.tsx` → aggregated view with source grouping, filters (source, type, fileType), search, lock badges.
- Catalog: add `app/(client)/catalog/page.tsx` (grid with filters/search/sort) and `app/(client)/catalog/[slug]/page.tsx` (inline PDF viewer + downloads).
- Shared components to build: `ResourceCard`, `PDFViewer`, `LockBadge`, `RegistrationForm`, `AccessControl` wrapper for attachments/resources.

## Data Flow Highlights
- News article → optional `linkedEvent` → Access control computes attachment visibility.
- Event → attendees + resources → detail page gates downloads and informs resources page.
- Resources page aggregates news attachments + event resources; respects unlock rules and deep-links back to parent article/event.
- Catalog is isolated; only cross-links are optional “related downloads”.

## Migration Plan (content + routing)
1. Create new Sanity schemas (`news`, `event`, `catalog`); keep `blog` only for legacy if needed.
2. Migrate existing `blog` entries:
   - Articles/news → `news` with category mapping.
   - Event-type blogs → `event` docs; copy event fields and wire `linkedEvent` from promotional articles.
   - Resource-type blogs → news attachments or event resources depending on parent; decide per entry.
3. Migrate `download` docs → `catalog` items, carry over file/summary/category; add cover toggles and metadata.
4. Map `eventRsvp` docs into `event.attendees` (or keep as submissions and reference from events).
5. Replace the legacy downloads route with `/catalog` and add redirects in `next.config.ts` (or Vercel config).
6. Update queries + pages to read from new document types; deprecate `contentType` flags.

## QA Checklist (to run after build)
- Nav: desktop mega + mobile accordion follow the locked IA.
- Access control: locked vs unlocked resources across event statuses and attendee states.
- Registration: RSVP form writes attendee data and reflects confirmation state on event detail.
- Resources page: filters, search, source grouping, lock badges.
- Catalog: cover image generation fallback, inline PDF viewer, download metadata.
- SEO: structured data for news and events still emitted; breadcrumbs updated for new routes.
- Accessibility: focus management for mega menu, form labels, lock badges announced.

## UI Integration Smoke Tests (3.2.11)
- `/news`: load as signed-in and anon; verify hero renders, count badge reflects list length, grid hydrates from `getAllNews(12)`; URL param `type=` toggles filter chips; empty list shows the “No News Yet” card.
- `/news/[slug]`: open a valid slug; detail loads via `getNewsArticleBySlug(slug, userId)` with JSON-LD scripts; attachments respect lock status for anon vs attendee; invalid slug returns 404.
- `/news/resources`: load while signed-in and anon; aggregated list uses `getAllResources({ userId })` and groups into News/Events cards; locked items show amber badge/reason; empty state shows “drafting” message.
- `/catalog`: list pulls from `getCatalogItems()`; Download button targets `downloadUrl`/`assetUrl` with fallback to article slug; empty list renders “Assets coming soon” card.
- `/news/events`: timeline hydrates from `getNewsEvents()`; date range and RSVP CTA render; “View details” deep links to `/news/[slug]`; empty state shows dashed placeholder.

## Open Questions / Decisions
- Event status: auto-calc from `date` vs manual override (or hybrid with `statusOverride`).
- Attendee auth: rely on Clerk user IDs or allow email-only submissions? Needed for `isUserEventAttendee`.
- Unlock timing: auto-unlock at event end vs manual toggle for `event_locked` resources.
- Cover auto-gen: preferred library/service and storage; category-based placeholder if generation fails?
- Versioning for catalog: store an array of versions vs single current version with `version` string.
- Analytics: track downloads, PDF views, registrations; where to persist (Sanity vs external).
