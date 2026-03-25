import { CATEGORY_BASE_PATH } from "@/lib/paths";

export type NavKind = "primary" | "download" | "event" | "resource";

type NavMetadata = {
  badge?: string;
  external?: boolean;
  icon?: string;
};

export type NavChild = NavMetadata & {
  label: string;
  path: string;
  description?: string;
  kind?: NavKind;
};

export type NavItem = NavMetadata & {
  label: string;
  path: string;
  children?: NavChild[];
};

export type HeaderNavChild = {
  title: string;
  href: string;
  description?: string;
  kind?: NavKind;
  badge?: string;
  external?: boolean;
};

export type InsightNavChild = {
  title: string;
  href: string;
  description?: string;
  badge?: string;
};

export type HeaderNavItem = {
  title: string;
  href: string;
  children?: HeaderNavChild[];
  badge?: string;
  external?: boolean;
};

export const NAV_STRUCTURE: Record<"newsHub" | "catalog", NavItem> = {
  newsHub: {
    label: "News & Events",
    path: "/news",
    icon: "megaphone",
    children: [
      {
        label: "News",
        path: "/news",
        description:
          "Latest announcements, product updates, and press coverage.",
        kind: "primary",
      },
      {
        label: "Events",
        path: "/news/events",
        description: "Launches, webinars, and live sessions.",
        kind: "event",
      },
      {
        label: "Resources",
        path: "/news/resources",
        description: "Guides, FAQs, and help articles.",
        kind: "resource",
      },
    ],
  },
  catalog: {
    label: "Catalog",
    path: "/catalog",
    icon: "book-open",
  },
};

export const NAV_STRUCTURE_INSIGHT = {
  insight: {
    label: "Insight",
    path: "/insights",
    icon: "lightbulb",
    children: [
      {
        label: "Knowledge",
        path: "/insights/knowledge",
        description: "Product expertise, industry insights, and comparisons",
      },
      {
        label: "Solutions",
        path: "/insights/solutions",
        description: "Case studies and implementation-ready solutions",
      },
    ],
  },
} as const;

const mapNavChildToHeader = (child: NavChild): HeaderNavChild => ({
  title: child.label,
  href: child.path,
  description: child.description,
  kind: child.kind,
  badge: child.badge,
  external: child.external,
});

export const newsNavChildren: HeaderNavChild[] =
  NAV_STRUCTURE.newsHub.children?.map(mapNavChildToHeader) ?? [];

export const insightNavChildren: HeaderNavChild[] = [
  {
    title: "Knowledge",
    href: "/insights/knowledge",
    description: "Product expertise, industry insights, and comparisons",
  },
  {
    title: "Solutions",
    href: "/insights/solutions",
    description: "Case studies and implementation-ready solutions",
  },
];

export const headerData: HeaderNavItem[] = [
  {
    title: "Shop",
    href: "/shop",
  },
  {
    title: "Catalog",
    href: "/catalog",
    children: [
      {
        title: "Catalog",
        href: "/catalog",
        description: "Curated catalogs, specs, and downloadable collections",
      },
      {
        title: "Product Categories",
        href: CATEGORY_BASE_PATH,
        description: "Browse by category",
      },
    ],
  },
  {
    title: "Deals & Promotions",
    href: "/promotions",
    children: [
      {
        title: "Today's Deals",
        href: "/deal",
        description: "Featured, time-limited discounts",
      },
      {
        title: "All Promotions",
        href: "/promotions",
        description: "Campaigns, bundles, and seasonal offers",
      },
    ],
  },
  {
    title: "News & Events",
    href: "/news",
    children: [
      {
        title: "News",
        href: "/news",
        description: "Latest announcements, product updates, and press coverage",
      },
      {
        title: "Events",
        href: "/news/events",
        description: "Launches, webinars, and live sessions",
      },
      {
        title: "Resources",
        href: "/news/resources",
        description: "Guides, docs, downloads, and FAQs",
      },
    ],
  },
  {
    title: "Insight",
    href: "/insights",
    children: insightNavChildren,
  },
  {
    title: "Support",
    href: "/contact",
    children: [
      {
        title: "Contact",
        href: "/contact",
        description: "Talk to sales or customer support",
      },
      {
        title: "Help Center",
        href: "/help",
        description: "Self-service guides and troubleshooting",
      },
      {
        title: "FAQs",
        href: "/faq",
        description: "Answers to common questions",
      },
    ],
  },
];

export const productType = [
  { title: "Gadget", value: "gadget" },
  { title: "Appliances", value: "appliances" },
  { title: "Refrigerators", value: "refrigerators" },
  { title: "Others", value: "others" },
];

export const quickLinksData = [
  { title: "News & Updates", href: "/news" },
  { title: "Events", href: "/news/events" },
  { title: "Resources", href: "/news/resources" },
  { title: "Knowledge Base", href: "/insights/knowledge" },
  { title: "Solutions", href: "/insights/solutions" },
  { title: "Catalog", href: "/catalog" },
  { title: "About us", href: "/about" },
  { title: "Contact us", href: "/contact" },
  { title: "Terms & Conditions", href: "/terms" },
  { title: "Privacy Policy", href: "/privacy" },
  { title: "FAQs", href: "/faqs" },
  { title: "Help", href: "/help" },
];

export const categoriesData = [
  { title: "Mobiles", href: "mobiles" },
  { title: "Appliances", href: "appliances" },
  { title: "Smartphones", href: "smartphones" },
  { title: "Air Conditioners", href: "air-conditioners" },
  { title: "Washing Machine", href: "washing-machine" },
  { title: "Kitchen Appliances", href: "kitchen-appliances" },
  { title: "Gadget Accessories", href: "gadget-accessories" },
  // { title: "Electronics", href: "electronics" },
  // { title: "Home & Garden", href: "home-garden" },
  // { title: "Sports & Fitness", href: "sports-fitness" },
];

// Enhanced user account menu items
export const userAccountData = [
  { title: "My Profile", href: "/account/profile" },
  { title: "My Orders", href: "/user/orders" },
  { title: "My Wishlist", href: "/wishlist" },
  { title: "Shopping Cart", href: "/cart" },
  { title: "Address Book", href: "/account/addresses" },
  { title: "Payment Methods", href: "/account/payments" },
  { title: "Order History", href: "/user/orders" },
];

// Support and help menu items
export const supportData = [
  { title: "Help Center", href: "/help" },
  { title: "Customer Service", href: "/support" },
  { title: "Track Your Order", href: "/track-order" },
  { title: "Return Policy", href: "/returns" },
  { title: "Shipping Info", href: "/shipping" },
  { title: "Size Guide", href: "/size-guide" },
];

export const INSIGHT_TYPES = {
  productKnowledge: {
    label: "Product Knowledge",
    icon: "📦",
    color: "#2563EB", // blue-600
    description: "Deep dives on specific products",
    section: "knowledge",
  },
  generalKnowledge: {
    label: "General Knowledge",
    icon: "📚",
    color: "#16A34A", // green-600
    description: "Industry expertise and fundamentals",
    section: "knowledge",
  },
  problemKnowledge: {
    label: "Problem Knowledge",
    icon: "❓",
    color: "#EA580C", // orange-600
    description: "Understanding common challenges",
    section: "knowledge",
  },
  comparison: {
    label: "Comparison",
    icon: "⚖️",
    color: "#9333EA", // purple-600
    description: "Head-to-head product analysis",
    section: "knowledge",
  },
  caseStudy: {
    label: "Case Study",
    icon: "✅",
    color: "#059669", // emerald-600
    description: "Proven implementations with real metrics",
    section: "solutions",
  },
  validatedSolution: {
    label: "Validated Solution",
    icon: "🧪",
    color: "#0284C7", // sky-600
    description: "Tested approaches from pilot deployments",
    section: "solutions",
  },
  theoreticalSolution: {
    label: "Theoretical Solution",
    icon: "💡",
    color: "#D97706", // amber-600
    description: "Expert-designed approaches for consideration",
    section: "solutions",
  },
} as const;

export const SOLUTION_COMPLEXITY = {
  quickWin: {
    label: "Quick Win",
    icon: "⚡",
    timeline: "1-2 months",
    description: "1-3 products, rapid implementation",
  },
  standard: {
    label: "Standard",
    icon: "⚙️",
    timeline: "2-4 months",
    description: "3-5 products, moderate complexity",
  },
  enterprise: {
    label: "Enterprise",
    icon: "🏢",
    timeline: "4+ months",
    description: "5+ products, comprehensive transformation",
  },
} as const;

export type InsightType = keyof typeof INSIGHT_TYPES;
export type SolutionComplexity = keyof typeof SOLUTION_COMPLEXITY;

// Promotion Navigation
export const PROMOTION_NAV_ITEMS = [
  { label: "All Deals", href: "/deal", icon: "🏷️" },
  { label: "Promotions", href: "/promotions", icon: "🎁" },
  { label: "Flash Sales", href: "/promotions?type=flashSale", icon: "⚡" },
] as const;

// Promotion Types Configuration
export const PROMOTION_TYPES = {
  flashSale: {
    label: "Flash Sale",
    icon: "⚡",
    color: "#FF5733",
    description: "Limited time, high urgency deals",
  },
  seasonal: {
    label: "Seasonal",
    icon: "🎄",
    color: "#2E7D32",
    description: "Holiday and event-based promotions",
  },
  bundle: {
    label: "Bundle Deal",
    icon: "📦",
    color: "#1565C0",
    description: "Multi-product savings",
  },
  loyalty: {
    label: "VIP Rewards",
    icon: "⭐",
    color: "#FFD700",
    description: "Exclusive member benefits",
  },
  clearance: {
    label: "Clearance",
    icon: "🏷️",
    color: "#9C27B0",
    description: "Final sale items",
  },
  winBack: {
    label: "Welcome Back",
    icon: "👋",
    color: "#00BCD4",
    description: "We miss you offers",
  },
  earlyAccess: {
    label: "Early Access",
    icon: "🔓",
    color: "#FF9800",
    description: "Subscriber exclusives",
  },
} as const;

// Discount Types
export const DISCOUNT_TYPES = {
  percentage: { label: "Percentage Off", format: (v: number) => `${v}% OFF` },
  fixed: { label: "Fixed Amount", format: (v: number) => `$${v} OFF` },
  bxgy: { label: "Buy X Get Y", format: () => "BOGO" },
  freeShipping: { label: "Free Shipping", format: () => "FREE SHIPPING" },
  points: { label: "Bonus Points", format: (v: number) => `${v}x POINTS` },
} as const;

// Segment Types
export const SEGMENT_TYPES = {
  firstTime: {
    label: "First-Time Buyers",
    description: "Never purchased before",
  },
  returning: {
    label: "Returning Customers",
    description: "1-4 previous orders",
  },
  vip: { label: "VIP Members", description: "5+ orders or high LTV" },
  cartAbandoner: {
    label: "Cart Abandoners",
    description: "Left items in cart",
  },
  inactive: {
    label: "Inactive Users",
    description: "No purchase in 30+ days",
  },
  allCustomers: { label: "Everyone", description: "No restrictions" },
} as const;

// Analytics Event Names
export const PROMO_EVENTS = {
  VIEW: "promo_view",
  CLICK: "promo_click",
  ADD_TO_CART: "promo_add_to_cart",
  CHECKOUT: "promo_checkout",
  REDEEM: "promo_redeem",
  VARIANT_ASSIGNED: "promo_variant_assigned",
} as const;

// Configuration Defaults
export const PROMO_CONFIG = {
  defaultCacheTime: 60, // seconds
  maxPromotionsPerPage: 12,
  countdownWarningThreshold: 3600, // 1 hour in seconds - show urgent styling
  budgetWarningThreshold: 0.8, // 80% - warn admins
  abandonmentThresholdMinutes: 30,
  inactivityThresholdDays: 30,
  vipLtvThreshold: 500,
  vipOrderThreshold: 5,
} as const;

// Type exports
export type PromotionType = keyof typeof PROMOTION_TYPES;
export type DiscountType = keyof typeof DISCOUNT_TYPES;
export type SegmentType = keyof typeof SEGMENT_TYPES;

export const faqsData = [
  {
    question: "NCSSHOP ให้บริการอะไรบ้าง?",
    answer:
      "NCSSHOP ให้บริการโซลูชันเทคโนโลยีหลากหลาย เช่น พัฒนาซอฟต์แวร์ตามสั่ง บริการคลาวด์ และที่ปรึกษาการทรานส์ฟอร์มดิจิทัล",
  },
  {
    question: "ฉันจะรับการสนับสนุนสำหรับผลิตภัณฑ์ของ NCSSHOP ได้อย่างไร?",
    answer:
      "คุณสามารถติดต่อทีมซัพพอร์ตผ่านหน้าติดต่อ หรือส่งอีเมลไปที่ support@NCSSHOP.com",
  },
  {
    question: "NCSSHOP มีการฝึกอบรมสำหรับผลิตภัณฑ์หรือไม่?",
    answer:
      "มี เรามีโปรแกรมฝึกอบรมอย่างครอบคลุมสำหรับผลิตภัณฑ์และบริการทั้งหมด โปรดติดต่อทีมขายเพื่อข้อมูลเพิ่มเติม",
  },
  {
    question: "NCSSHOP ให้บริการกับอุตสาหกรรมใดบ้าง?",
    answer:
      "NCSSHOP ให้บริการครอบคลุมหลายอุตสาหกรรม เช่น การเงิน การดูแลสุขภาพ ค้าปลีก และการผลิต",
  },
  {
    question: "NCSSHOP รับประกันความปลอดภัยของข้อมูลอย่างไร?",
    answer:
      "เราใช้มาตรการความปลอดภัยตามมาตรฐานอุตสาหกรรม และปฏิบัติตามกฎระเบียบคุ้มครองข้อมูลที่เกี่ยวข้องทั้งหมด เพื่อให้ข้อมูลของลูกค้าปลอดภัย",
  },
];
