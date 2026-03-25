import ResourcesPageClient from "@/app/(client)/news/resources/ResourcesPageClient";
import HeroBanner from "@/components/HeroBanner";
import type { AggregatedResource } from "@/sanity/queries/resources";
import { getAllResources, getHeroBannerByPlacement } from "@/sanity/queries";
import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resources | Newsroom attachments and event downloads",
  description:
    "Explore downloadable resources from news articles and events, including PDFs, images, and enablement docs.",
  alternates: { canonical: "/news/resources" },
};

const ResourcesPage = async () => {
  const heroBanner = await getHeroBannerByPlacement("resourcespagehero", "sitewidepagehero");
  const { userId } = await auth();
  const fetchedResources = await getAllResources({ userId: userId ?? null });
  const resources: AggregatedResource[] = Array.isArray(fetchedResources) ? fetchedResources : [];

  return (
    <>
      {heroBanner ? <HeroBanner placement="resourcespagehero" banner={heroBanner} /> : null}
      <ResourcesPageClient resources={resources} showHeroCard={!heroBanner} />
    </>
  );
};

export default ResourcesPage;
