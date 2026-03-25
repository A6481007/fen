import { redirect } from "next/navigation";

type SearchParams = Record<string, string | string[] | undefined>;

type InsightsSolutionsPageProps = {
  searchParams?: SearchParams | Promise<SearchParams>;
};

const appendSearchParams = (params: URLSearchParams, entries?: SearchParams) => {
  if (!entries) return;
  Object.entries(entries).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item) params.append(key, item);
      });
    } else if (value) {
      params.set(key, value);
    }
  });
};

const InsightsSolutionsPage = async ({ searchParams }: InsightsSolutionsPageProps) => {
  const resolvedSearchParams = await searchParams;
  const params = new URLSearchParams();
  appendSearchParams(params, resolvedSearchParams);

  const query = params.toString();
  const href = query ? `/insight/solutions?${query}` : "/insight/solutions";
  redirect(href);
};

export default InsightsSolutionsPage;
