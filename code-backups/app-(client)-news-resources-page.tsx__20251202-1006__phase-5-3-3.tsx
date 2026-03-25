import ResourcesClient from "@/components/resources/ResourcesClient";
import Container from "@/components/Container";
import DynamicBreadcrumb from "@/components/DynamicBreadcrumb";
import { Badge } from "@/components/ui/badge";
import type { AggregatedResource } from "@/sanity/queries/resources";
import { getAllResources } from "@/sanity/queries";
import { auth } from "@clerk/nextjs/server";

const ResourcesPage = async () => {
  const { userId } = await auth();
  const fetchedResources = await getAllResources({ userId: userId ?? null });
  const resources: AggregatedResource[] = Array.isArray(fetchedResources) ? fetchedResources : [];

  return (
    <div className="min-h-screen bg-white">
      <Container className="pt-6">
        <DynamicBreadcrumb
          customItems={[
            { label: "News", href: "/news" },
            { label: "Resources" },
          ]}
        />
      </Container>

      <Container className="py-8 sm:py-12 space-y-8">
        <div className="space-y-3 text-center sm:text-left">
          <Badge className="bg-amber-500 text-white">Resources</Badge>
          <h1 className="text-3xl font-bold text-shop_dark_green">Knowledge base & enablement docs</h1>
          <p className="text-gray-600 max-w-2xl">
            All downloadable assets from news articles and events in one place. Filter by source, file type, or event
            status, and switch between grid or list views.
          </p>
        </div>

        <ResourcesClient resources={resources} />
      </Container>
    </div>
  );
};

export default ResourcesPage;
