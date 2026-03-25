import type { DealStatus } from "@/actions/backoffice/dealsActions";

export type DealFormState = {
  _id?: string;
  dealId: string;
  title: string;
  locale: string;
  status: DealStatus;
  dealType: string;
  productId?: string;
  productLabel?: string;
  originalPrice?: number;
  dealPrice?: number;
  badge?: string;
  badgeColor?: string;
  showOnHomepage?: boolean;
  priority?: number;
  startDate?: string;
  endDate?: string;
  quantityLimit?: number;
  perCustomerLimit?: number;
  soldCount?: number;
  allowSoldCountOverride?: boolean;
};
