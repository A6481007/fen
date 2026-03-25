# Sanity Schema Connections (Task 7.1)

Snapshot of how each Studio document type links to others. Use this to trace cross-document dependencies and keep marketing/commerce/content flows aligned.

## Refresh the matrix

Rebuild the reference table directly from the schema files:

```bash
node - <<'NODE'
const fs = require("fs");
const path = require("path");
const dir = path.join("sanity", "schemaTypes");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"));

const typeInfo = {};
for (const file of files) {
  const text = fs.readFileSync(path.join(dir, file), "utf8");
  const constLookup = {};
  for (const m of text.matchAll(/const\s+([A-Z0-9_]+)\s*=\s*"([^"]+)"/g)) {
    constLookup[m[1]] = m[2];
  }
  const nameMatch = text.match(/defineType\(\s*{\s*name:\s*(?:"([^"]+)"|'([^']+)'|([A-Z0-9_]+))/);
  const typeName = nameMatch ? (nameMatch[1] || nameMatch[2] || constLookup[nameMatch[3]] || nameMatch[3]) : file;

  const refs = new Set();
  for (const m of text.matchAll(/to:\s*\[\s*{\s*type:\s*"([^"]+)"/g)) refs.add(m[1]);
  for (const m of text.matchAll(/to:\s*{\s*type:\s*"([^"]+)"/g)) refs.add(m[1]);

  typeInfo[typeName] = { file, refs: Array.from(refs) };
}

const inbound = {};
for (const [type, info] of Object.entries(typeInfo)) {
  for (const ref of info.refs) {
    inbound[ref] = inbound[ref] || new Set();
    inbound[ref].add(type);
  }
}

const rows = Object.keys(typeInfo).sort().map((type) => {
  const { file, refs } = typeInfo[type];
  const incoming = inbound[type] ? Array.from(inbound[type]).sort() : [];
  return `${type} | ${refs.sort().join(", ") || "—"} | ${incoming.join(", ") || "—"} | ${file}`;
});

console.log("type | references | referenced by | schema file");
console.log("---|---|---|---");
rows.forEach((r) => console.log(r));
NODE
```

## Visual map (high level)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SANITY STUDIO SCHEMA MAP                              │
│                         28 Document Types                                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              COMMERCE CORE                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                      │
│  │   Product   │───▶│  Category   │◀───│   Brand     │                      │
│  │             │    │             │    │             │                      │
│  │ • name      │    │ • title     │    │ • title     │                      │
│  │ • price     │    │ • parent*   │    │ • image     │                      │
│  │ • images[]  │    │ • depth     │    │             │                      │
│  │ • stock     │    │ • seo       │    └─────────────┘                      │
│  │ • variant*  │    └─────────────┘                                         │
│  └──────┬──────┘                                                            │
│         │                                                                    │
│         ▼                                                                    │
│  ┌─────────────┐         ┌─────────────┐                                    │
│  │ ProductType │         │    Order    │◀────┐                              │
│  │ Option      │         │             │     │                              │
│  │             │         │ • products* │     │                              │
│  │ • title     │         │ • user*     │     │                              │
│  │ • slug      │         │ • status    │     │                              │
│  └─────────────┘         │ • history[] │     │                              │
│                          └──────┬──────┘     │                              │
│                                 │            │                              │
│                                 ▼            │                              │
│                          ┌─────────────┐     │                              │
│                          │    User     │─────┤                              │
│                          │             │     │                              │
│                          │ • orders*[] │     │                              │
│                          │ • cart[]    │     │                              │
│                          │ • wishlist* │     │                              │
│                          │ • addresses*│     │                              │
│                          └──────┬──────┘     │                              │
│                                 │            │                              │
│                                 ▼            │                              │
│                          ┌─────────────┐     │                              │
│                          │   Address   │─────┘                              │
│                          │             │                                    │
│                          │ • user*     │                                    │
│                          │ • type      │                                    │
│                          └─────────────┘                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              CONTENT HUB                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                      │
│  │    Blog     │───▶│   Author    │◀───│    Post     │                      │
│  │             │    │             │    │ (Legacy)    │                      │
│  │ • author*   │    │ • name      │    │             │                      │
│  │ • category* │    │ • image     │    │ • author*   │                      │
│  │ • body      │    │ • bio       │    │ • body      │                      │
│  └─────────────┘    └─────────────┘    └─────────────┘                      │
│         │                                                                    │
│         ▼                                                                    │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐            │
│  │BlogCategory │         │    News     │────────▶│   Event     │            │
│  │             │         │             │         │             │            │
│  │ • title     │         │ • event*    │         │ • date      │            │
│  │ • slug      │         │ • attach[]  │         │ • attendees │            │
│  └─────────────┘         └─────────────┘         │ • resources │            │
│                                                   └──────┬──────┘            │
│                                                          │                   │
│                                                          ▼                   │
│                                                   ┌─────────────┐            │
│                                                   │ EventRsvp   │            │
│                                                   │             │            │
│                                                   │ • event*    │            │
│                                                   │ • guests    │            │
│                                                   └─────────────┘            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                             MARKETING                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                      │
│  │ Promotion   │───▶│  Product*   │◀───│    Deal     │                      │
│  │             │    │  Category*  │    │             │                      │
│  │ • type      │    │             │    │ • product*  │                      │
│  │ • discount  │    │             │    │ • dealPrice │                      │
│  │ • targeting │    │             │    │ • dates     │                      │
│  └─────────────┘    │             │    └─────────────┘                      │
│         │           │             │                                         │
│         ▼           │             │                                         │
│  ┌─────────────┐    │             │    ┌─────────────┐                      │
│  │   Banner    │───▶│             │◀───│   Review    │                      │
│  │             │    │             │    │             │                      │
│  │ • product*  │    └─────────────┘    │ • product*  │                      │
│  │ • promo*    │                       │ • user*     │                      │
│  │ • dates     │                       │ • rating    │                      │
│  └─────────────┘                       └─────────────┘                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                            COMMUNICATIONS                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                      │
│  │   Contact   │    │Subscription │    │   Sent      │                      │
│  │             │    │             │    │Notification │                      │
│  │ • user*     │    │ • user*     │    │             │                      │
│  │ • order*    │    │ • status    │    │ • recipients│                      │
│  │ • status    │    │ • source    │    │ • type      │                      │
│  └─────────────┘    └─────────────┘    └─────────────┘                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              RESOURCES                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                      │
│  │  Catalog    │───▶│  Download   │◀───│  Product*   │                      │
│  │             │    │             │    │             │                      │
│  │ • file      │    │ • product*[]│    │             │                      │
│  │ • downloads*│    │ • file      │    │             │                      │
│  │ • cover     │    │             │    │             │                      │
│  └─────────────┘    └─────────────┘    └─────────────┘                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              SETTINGS                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐    ┌─────────────┐                                         │
│  │  Pricing    │    │UserAccess   │                                         │
│  │  Settings   │    │  Request    │                                         │
│  │ (Singleton) │    │             │                                         │
│  │             │    │ • user*     │                                         │
│  │ • markup %  │    │ • status    │                                         │
│  │ • VAT %     │    │             │                                         │
│  └─────────────┘    └─────────────┘                                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

Legend:
  ───▶  References (one-to-one or many-to-one)
  *     Reference field
  []    Array of references
```

## Reference table (from schema files)

type | references | referenced by | schema file
---|---|---|---
address | user | user | sanity/schemaTypes/addressType.ts
author | — | blog, news | sanity/schemaTypes/authType.ts
banner | category, product, promotion | — | sanity/schemaTypes/bannerType.ts
blog | author, blogcategory | — | sanity/schemaTypes/blogType.ts
blogcategory | — | blog | sanity/schemaTypes/blogCategoryType.ts
brand | — | product | sanity/schemaTypes/brandTypes.ts
catalog | download | — | sanity/schemaTypes/catalogType.ts
category | category | banner, category, product, promotion | sanity/schemaTypes/categoryType.tsx
contact | order, user | — | sanity/schemaTypes/contactType.ts
deal | product | order | sanity/schemaTypes/dealType.ts
download | product | catalog | sanity/schemaTypes/downloadType.ts
event | — | eventRsvp, news | sanity/schemaTypes/eventType.ts
eventRsvp | event | — | sanity/schemaTypes/eventRsvpType.ts
news | author, event | — | sanity/schemaTypes/newsType.ts
order | deal, product, promotion, user | contact, review, user | sanity/schemaTypes/orderType.ts
pricingSettings | — | — | sanity/schemaTypes/pricingSettingsType.ts
product | brand, category, product, productTypeOption | banner, deal, download, order, product, promotion, review, user | sanity/schemaTypes/productType.ts
productTypeOption | — | product | sanity/schemaTypes/productTypeOption.ts
promotion | category, product | banner, order | sanity/schemaTypes/promotionType.tsx
review | order, product, user | — | sanity/schemaTypes/reviewType.ts
sentNotification | — | — | sanity/schemaTypes/sentNotificationType.ts
subscription | user | — | sanity/schemaTypes/subscriptionType.ts
user | address, order, product | address, contact, order, review, subscription, userAccessRequest | sanity/schemaTypes/userType.ts
userAccessRequest | user | — | sanity/schemaTypes/userAccessRequestType.ts

- Legacy `post` remains in `sanity/schemaTypes/postType.ts` but is not registered in `sanity/schemaTypes/index.ts`.
- Helper types (e.g., `blockContentType`, `seoMetadataType`) are omitted from the table because they do not hold cross-document references.
