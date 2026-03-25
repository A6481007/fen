export type DownloadStatus = "draft" | "published";

export type DownloadFormState = {
  _id?: string;
  title: string;
  slug: string;
  summary: string;
  status: DownloadStatus;
  fileAssetId?: string | null;
  relatedProductIds?: string[];
};

export type DownloadListParams = {
  search?: string;
  status?: DownloadStatus;
  page?: number;
  pageSize?: number;
};

export type DownloadListRow = {
  id: string;
  title: string;
  slug?: string;
  status?: string;
  fileRef?: string;
  relatedProductsCount?: number;
  updatedAt?: string;
};
