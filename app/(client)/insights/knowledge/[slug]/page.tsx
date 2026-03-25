import { redirect } from "next/navigation";

type InsightsKnowledgeDetailPageProps = {
  params: { slug: string };
};

const InsightsKnowledgeDetailPage = ({ params }: InsightsKnowledgeDetailPageProps) => {
  redirect(`/insight/knowledge/${params.slug}`);
};

export default InsightsKnowledgeDetailPage;
