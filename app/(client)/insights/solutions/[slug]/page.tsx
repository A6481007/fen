import { redirect } from "next/navigation";

type InsightsSolutionsDetailPageProps = {
  params: { slug: string };
};

const InsightsSolutionsDetailPage = ({ params }: InsightsSolutionsDetailPageProps) => {
  redirect(`/insight/solutions/${params.slug}`);
};

export default InsightsSolutionsDetailPage;
