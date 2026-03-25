export type CatalogStatus = "draft" | "published";

export type CatalogFormState = {
  _id?: string;
  title: string;
  slug: string;
  description: string;
  publishDate?: string;
  status: CatalogStatus;
  category?: string;
  tags: string[];
  version?: string;
  fileAssetId?: string | null;
  useAutoGeneration?: boolean;
  customCoverAssetId?: string | null;
  relatedDownloadIds?: string[];
};

export type CatalogListParams = {
  search?: string;
  status?: CatalogStatus;
  category?: string;
  page?: number;
  pageSize?: number;
};

export type CatalogListRow = {
  id: string;
  title: string;
  slug?: string;
  status?: CatalogStatus;
  category?: string;
  fileType?: string;
  updatedAt?: string;
  publishDate?: string;
};
