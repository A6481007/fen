export const mockPromotion = (overrides = {}) => ({
  campaignId: "test-promo-001",
  name: "Test Promotion",
  type: "seasonal",
  status: "active",
  startDate: new Date(Date.now() - 86400000).toISOString(), // Yesterday
  endDate: new Date(Date.now() + 86400000 * 7).toISOString(), // Week from now
  discountType: "percentage",
  discountValue: 20,
  minimumOrderValue: 50,
  maximumDiscount: 100,
  targetAudience: {
    segmentType: "allCustomers",
    categories: [],
    products: [],
    excludedProducts: [],
  },
  priority: 50,
  budgetCap: 10000,
  usageLimit: 1000,
  perCustomerLimit: 1,
  variantMode: "control",
  ...overrides,
});

export const mockUser = (overrides = {}) => ({
  id: "user-123",
  email: "test@example.com",
  ordersCount: 3,
  ltv: 250,
  lastPurchaseAt: new Date(Date.now() - 86400000 * 30).toISOString(), // 30 days ago
  segment: "returning",
  ...overrides,
});

export const mockContext = (overrides = {}) => ({
  page: "cart" as const,
  cartValue: 100,
  cartItems: [],
  isFirstVisit: false,
  ...overrides,
});
