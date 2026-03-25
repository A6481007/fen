import { render, screen } from "@testing-library/react";
import { describe, expect, it, beforeEach, vi, type Mock } from "vitest";
import { CartDrawer } from "@/components/cart/CartDrawer";
import type { Cart, CartPromotionGroup } from "@/lib/cart/types";
import { useCart } from "@/hooks/useCart";

vi.mock("@/hooks/useCart", () => ({
  __esModule: true,
  useCart: vi.fn(),
}));

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => <img {...props} alt={props.alt || "image"} />,
}));

const useCartMock = useCart as unknown as Mock;

const baseCart: Cart = {
  id: "cart-1",
  userId: "user-1",
  items: [
    {
      id: "line-1",
      productId: "prod-1",
      productSlug: "prod-1",
      productName: "Promo Item",
      quantity: 1,
      unitPrice: 100,
      lineTotal: 80,
      appliedPromotion: {
        type: "promotion",
        id: "promo-1",
        name: "Holiday Sale",
        discountType: "percentage",
        discountValue: 20,
        discountAmount: 20,
      },
    },
  ],
  appliedPromotions: [],
  subtotal: 100,
  totalDiscount: 20,
  total: 80,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const makeGroups = (): CartPromotionGroup[] => [
  {
    groupId: "promotion:promo-1",
    groupType: "promotion",
    displayName: "Holiday Sale",
    badge: "20% OFF",
    badgeColor: "#059669",
    items: baseCart.items,
    originalTotal: 100,
    discountAmount: 20,
    finalTotal: 80,
    isCollapsible: true,
    isEditable: true,
  },
];

const renderDrawer = () =>
  render(<CartDrawer open onOpenChange={() => {}} />);

describe("CartDrawer grouped view", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders grouped promotions with badges and savings", () => {
    useCartMock.mockReturnValue({
      cart: baseCart,
      view: {
        id: "cart-1",
        groups: makeGroups(),
        summary: {
          subtotal: 100,
          totalDiscount: 20,
          total: 80,
          itemCount: 1,
          promotionCount: 1,
        },
      },
      itemCount: 1,
      removeItem: vi.fn(),
      updateItem: vi.fn(),
      clearCart: vi.fn(),
      isLoading: false,
      isMutating: false,
      error: null,
      refresh: vi.fn(),
    });

    renderDrawer();

    expect(screen.getByText("Holiday Sale")).toBeInTheDocument();
    expect(screen.getByText("20% OFF")).toBeInTheDocument();
    expect(screen.getByText("Promo Item")).toBeInTheDocument();
    expect(screen.getByText(/Saved\s+\$20/)).toBeInTheDocument();
  });

  it("falls back to ungrouped items when no view model is available", () => {
    useCartMock.mockReturnValue({
      cart: baseCart,
      view: null,
      itemCount: 1,
      removeItem: vi.fn(),
      updateItem: vi.fn(),
      clearCart: vi.fn(),
      isLoading: false,
      isMutating: false,
      error: null,
      refresh: vi.fn(),
    });

    renderDrawer();

    expect(screen.getByText("Cart items")).toBeInTheDocument();
    expect(screen.getByText("Promo Item")).toBeInTheDocument();
  });
});
