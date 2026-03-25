export type DerivedMetrics = {
  impressions: number;
  clicks: number;
  addToCarts: number;
  conversions: number;
  revenue: number;
  discountSpent: number;
  ctr: number;
  cvr: number;
  cartRate: number;
  purchaseRate: number;
  aov: number;
  baselineAov: number;
  aovLift: number;
  roi: number;
  impressionsChange: number;
  conversionsChange: number;
  revenueChange: number;
  roiChange: number;
};

export type FunnelStage = {
  stage: string;
  value: number;
};

export type TimeSeriesPoint = {
  date: string;
  label: string;
  impressions: number;
  clicks: number;
  addToCarts: number;
  conversions: number;
  revenue: number;
};

export type ChannelPerformance = {
  channel: string;
  impressions: number;
  clicks: number;
  addToCarts: number;
  conversions: number;
  revenue: number;
};

export type DevicePerformance = {
  device: string;
  conversions: number;
  revenue: number;
  share: number;
};

export type FilterState = {
  dateFrom?: string;
  dateTo?: string;
  channel?: string;
  segment?: string;
  device?: string;
};
