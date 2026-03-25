import { getNewsDownloads } from "@/sanity/queries";
import DownloadsPageClient from "./DownloadsPageClient";

type NewsDownload = {
  _id?: string;
  title?: string;
  slug?: { current?: string };
  publishedAt?: string;
  summary?: string;
  downloadLabel?: string;
  downloadUrl?: string;
  assetUrl?: string;
  blogcategories?: { title?: string }[];
};

const DownloadsPage = async () => {
  const downloads: NewsDownload[] = (await getNewsDownloads()) ?? [];

  return <DownloadsPageClient downloads={downloads} />;
};

export default DownloadsPage;
