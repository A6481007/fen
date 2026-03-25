import Container from "@/components/Container";
import DynamicBreadcrumb from "@/components/DynamicBreadcrumb";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getAllResources } from "@/sanity/queries";
import { ArrowRight, BookOpenCheck, Lock } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";

const ResourcesPage = async () => {
  const { userId } = await auth();
  const fetchedResources = await getAllResources({ userId: userId ?? null });
  const resources = Array.isArray(fetchedResources) ? fetchedResources : [];
  const grouped = resources.reduce<Record<string, typeof resources>>((acc, item) => {
    const key = item?.source === "event" ? "Events" : "News";
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {} as Record<string, typeof resources>);

  const orderedCategories = ["News", "Events"].filter((category) => grouped[category]?.length);

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
        <div className="space-y-2 text-center sm:text-left">
          <Badge className="bg-amber-500 text-white">Resources</Badge>
          <h1 className="text-3xl font-bold text-shop_dark_green">
            Knowledge base & enablement docs
          </h1>
          <p className="text-gray-600 max-w-2xl">
            Make onboarding easier with curated guides, FAQs, and policy notes.
          </p>
        </div>

        {resources?.length ? (
          <div className="space-y-8">
            {orderedCategories.map((category) => {
              const categoryResources = grouped[category] ?? [];

              return (
                <Card key={category} className="border border-gray-100 shadow-sm">
                  <CardContent className="space-y-4 py-6">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.25em] text-gray-400">
                          {category === "Events" ? "Event Resources" : "News Attachments"}
                        </p>
                        <h2 className="text-2xl font-semibold text-shop_dark_green">
                          {category}
                        </h2>
                      </div>
                      <BookOpenCheck className="h-6 w-6 text-shop_light_green" />
                    </div>
                    <Separator />
                    <div className="space-y-4">
                      {categoryResources.map((resource) => {
                        const parentHref =
                          resource?.parentSlug && resource?.source === "event"
                            ? `/news/events/${resource.parentSlug}`
                            : resource?.parentSlug
                              ? `/news/${resource.parentSlug}`
                              : null;
                        const fileUrl =
                          resource?.access?.isVisible && resource?.file?.asset?.url
                            ? resource.file.asset.url
                            : null;

                        return (
                          <div
                            key={resource?.id}
                            className="rounded-lg bg-shop_light_bg/60 p-4 transition hover:bg-shop_light_bg"
                          >
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant="outline" className="bg-white text-gray-700">
                                    {resource?.fileType || "resource"}
                                  </Badge>
                                  {resource?.access?.isVisible ? (
                                    <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                                      Available
                                    </Badge>
                                  ) : (
                                    <Badge className="flex items-center gap-1 bg-amber-50 text-amber-700 hover:bg-amber-50">
                                      <Lock className="h-3 w-3" />
                                      Locked
                                    </Badge>
                                  )}
                                </div>
                                <h3 className="text-xl font-semibold text-shop_dark_green">
                                  {resource?.title || "Untitled resource"}
                                </h3>
                                <p className="text-sm text-gray-600">
                                  {resource?.description ||
                                    "Actionable insight from the product enablement team."}
                                </p>
                                <div className="text-sm text-gray-500">
                                  <span className="font-semibold text-shop_dark_green">
                                    {resource?.source === "event" ? "Event" : "Article"}:
                                  </span>{" "}
                                  {parentHref ? (
                                    <Link
                                      href={parentHref}
                                      className="text-shop_dark_green hover:text-shop_light_green"
                                    >
                                      {resource?.parentTitle || "View parent"}
                                    </Link>
                                  ) : (
                                    resource?.parentTitle || "View parent"
                                  )}
                                </div>
                                {!resource?.access?.isVisible && resource?.access?.lockReason ? (
                                  <p className="text-xs text-amber-700 flex items-center gap-1">
                                    <Lock className="h-3 w-3" />
                                    {resource.access.lockReason}
                                  </p>
                                ) : null}
                              </div>
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                {fileUrl ? (
                                  <Link
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm font-semibold text-shop_light_green hover:text-shop_dark_green"
                                  >
                                    Open File
                                    <ArrowRight className="ml-1 inline h-4 w-4" />
                                  </Link>
                                ) : (
                                  <div className="text-sm font-semibold text-gray-400">
                                    {resource?.access?.isVisible ? "No file attached" : "Locked item"}
                                  </div>
                                )}
                                {parentHref && (
                                  <Link
                                    href={parentHref}
                                    className="text-sm font-semibold text-shop_dark_green hover:text-shop_light_green"
                                  >
                                    View {resource?.source === "event" ? "event" : "article"}
                                    <ArrowRight className="ml-1 inline h-4 w-4" />
                                  </Link>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-10 text-center">
            <CardContent>
              <p className="text-gray-600">
                We&apos;re drafting our first knowledge pack. Come back soon.
              </p>
            </CardContent>
          </Card>
        )}
      </Container>
    </div>
  );
};

export default ResourcesPage;
