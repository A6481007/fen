import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import dayjs from "dayjs";
import Container from "@/components/Container";
import DynamicBreadcrumb from "@/components/DynamicBreadcrumb";
import InsightCard from "@/components/insight/InsightCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { urlFor } from "@/sanity/lib/image";
import {
  getFeaturedInsights,
  getInsightCategories,
  getLatestKnowledge,
  getLatestSolutions,
} from "@/sanity/queries";
import {
  ArrowRight,
  BookOpen,
  Layers,
  Lightbulb,
  Mail,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Wrench,
} from "lucide-react";

const siteName = "ShopCart";

export const metadata: Metadata = {
  title: `Insight | Expert Knowledge & Solutions | ${siteName}`,
  description:
    "Explore our comprehensive knowledge base and proven solutions across industries. Discover expert insights, actionable guidance, and success stories tailored to your needs.",
};

const formatInsightType = (type?: string | null) => {
  if (!type) return "Insight";

  const map: Record<string, string> = {
    productKnowledge: "Product Knowledge",
    generalKnowledge: "General Knowledge",
    problemKnowledge: "Problem Knowledge",
    comparison: "Comparison",
    caseStudy: "Case Study",
    validatedSolution: "Validated Solution",
    theoreticalSolution: "Theoretical Solution",
  };

  return map[type] || "Insight";
};

const formatDate = (value?: string | null) =>
  value ? dayjs(value).format("MMM D, YYYY") : "Coming soon";

const SOLUTION_TYPES = new Set([
  "caseStudy",
  "validatedSolution",
  "theoreticalSolution",
]);

const buildInsightHref = (slug?: string | null, type?: string | null) => {
  const isSolutionType = SOLUTION_TYPES.has(type ?? "");
  if (!slug) return isSolutionType ? "/insight/solutions" : "/insight/knowledge";
  return isSolutionType ? `/insight/solutions/${slug}` : `/insight/knowledge/${slug}`;
};

const InsightPage = async () => {
  const [featuredInsights, latestKnowledge, latestSolutions, categories] = await Promise.all([
    getFeaturedInsights(),
    getLatestKnowledge(),
    getLatestSolutions(),
    getInsightCategories(),
  ]);

  const knowledgeCategories = (categories || []).filter(
    (category) => category.categoryType === "knowledge"
  );
  const solutionCategories = (categories || []).filter(
    (category) => category.categoryType === "solution"
  );

  const stats = [
    {
      label: "Featured Insights",
      value: featuredInsights?.length ?? 0,
      icon: Sparkles,
    },
    {
      label: "Knowledge Library",
      value: latestKnowledge?.length ?? 0,
      icon: BookOpen,
    },
    {
      label: "Solution Playbooks",
      value: latestSolutions?.length ?? 0,
      icon: Wrench,
    },
    {
      label: "Insight Categories",
      value: categories?.length ?? 0,
      icon: Layers,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-shop_light_bg to-white">
      <Container className="pt-6">
        <DynamicBreadcrumb />
      </Container>

      <section className="py-8 sm:py-12">
        <Container>
          <Card className="border-0 overflow-hidden shadow-xl bg-gradient-to-r from-shop_dark_green via-shop_dark_green to-shop_light_green text-white">
            <CardContent className="p-6 sm:p-8 lg:p-12">
              <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] items-center">
                <div className="space-y-4 sm:space-y-6">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm">
                    <Lightbulb className="h-4 w-4" />
                    <span className="font-medium">Insight Hub</span>
                  </div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
                    Insight Hub
                  </h1>
                  <p className="text-sm sm:text-base md:text-lg text-white/90 max-w-2xl">
                    Expert knowledge, proven solutions, and industry expertise. Dive into curated
                    research, actionable guidance, and real-world results from our specialists.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      asChild
                      size="lg"
                      className="bg-white text-shop_dark_green hover:bg-white/90"
                    >
                      <Link href="/insight/knowledge">Explore Knowledge</Link>
                    </Button>
                    <Button
                      asChild
                      size="lg"
                      variant="outline"
                      className="bg-transparent text-white border-white hover:bg-white/10"
                    >
                      <Link href="/insight/solutions">Browse Solutions</Link>
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-4 pt-2 text-sm text-white/80">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" />
                      Verified expertise
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Data-backed insights
                    </div>
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Actionable guidance
                    </div>
                  </div>
                </div>
                <Card className="border-0 bg-white/10 backdrop-blur-sm text-white">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      <p className="text-sm uppercase tracking-wide text-white/80">
                        Insight highlights
                      </p>
                    </div>
                    <Separator className="bg-white/20" />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg bg-white/10 p-4">
                        <p className="text-xs uppercase text-white/70">Knowledge articles</p>
                        <p className="text-2xl font-bold">
                          {latestKnowledge?.length ?? 0}
                        </p>
                      </div>
                      <div className="rounded-lg bg-white/10 p-4">
                        <p className="text-xs uppercase text-white/70">Solution stories</p>
                        <p className="text-2xl font-bold">
                          {latestSolutions?.length ?? 0}
                        </p>
                      </div>
                      <div className="rounded-lg bg-white/10 p-4">
                        <p className="text-xs uppercase text-white/70">Featured picks</p>
                        <p className="text-2xl font-bold">
                          {featuredInsights?.length ?? 0}
                        </p>
                      </div>
                      <div className="rounded-lg bg-white/10 p-4">
                        <p className="text-xs uppercase text-white/70">Categories</p>
                        <p className="text-2xl font-bold">{categories?.length ?? 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </Container>
      </section>

      <Container className="pb-8 sm:pb-12">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6 sm:p-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-shop_dark_green/80">Insight Metrics</p>
                <h2 className="text-xl sm:text-2xl font-bold text-shop_dark_green">
                  Trusted by teams looking for answers
                </h2>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border bg-white px-4 py-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-shop_light_green/20 p-2 text-shop_dark_green">
                      <stat.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{stat.label}</p>
                      <p className="text-xl sm:text-2xl font-bold text-shop_dark_green">
                        {stat.value}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </Container>

      <Container className="py-8 sm:py-12">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-shop_dark_green mb-2">
              Featured Insights
            </h2>
            <p className="text-gray-600">
              Top picks from our editors featuring the latest research and stories.
            </p>
          </div>
          <Button
            asChild
            variant="outline"
            className="hidden sm:inline-flex border-shop_dark_green text-shop_dark_green hover:bg-shop_dark_green hover:text-white"
          >
            <Link href="/insight/knowledge">View Knowledge Library</Link>
          </Button>
        </div>

        {featuredInsights && featuredInsights.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredInsights.map((insight, index) => (
              <InsightCard
                key={insight?._id || index}
                insight={insight}
                variant="featured"
              />
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-gray-600">Featured insights are on the way. Check back soon.</p>
          </Card>
        )}
      </Container>

      <Container className="py-8 sm:py-12">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-shop_dark_green/70">Knowledge</p>
                  <h3 className="text-xl font-bold text-shop_dark_green">Latest Knowledge</h3>
                </div>
                <Button variant="ghost" asChild className="text-shop_dark_green hover:text-shop_light_green">
                  <Link href="/insight/knowledge">
                    View All
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="space-y-4">
                {latestKnowledge && latestKnowledge.length > 0 ? (
                  latestKnowledge.map((item) => (
                    <div
                      key={item?._id}
                      className="flex gap-4 rounded-lg border bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="relative h-20 w-24 flex-shrink-0 overflow-hidden rounded-md">
                        {item?.mainImage ? (
                          <Image
                            src={urlFor(item.mainImage).url()}
                            alt={item?.title || "Knowledge cover"}
                            fill
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full bg-shop_light_green/20" />
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-shop_light_green/20 text-shop_dark_green">
                            {formatInsightType(item?.insightType)}
                          </Badge>
                          <span className="text-xs text-gray-500">{formatDate(item?.publishedAt)}</span>
                        </div>
                        <Link
                          href={buildInsightHref(
                            item?.slug?.current,
                            item?.insightType
                          )}
                          className="group/title block"
                        >
                          <p className="font-semibold text-shop_dark_green group-hover/title:text-shop_light_green line-clamp-2">
                            {item?.title}
                          </p>
                        </Link>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {item?.summary ||
                            "Explore product knowledge, comparisons, and expert breakdowns."}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-600">No knowledge articles yet.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-shop_dark_green/70">Solutions</p>
                  <h3 className="text-xl font-bold text-shop_dark_green">Latest Solutions</h3>
                </div>
                <Button variant="ghost" asChild className="text-shop_dark_green hover:text-shop_light_green">
                  <Link href="/insight/solutions">
                    View All
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="space-y-4">
                {latestSolutions && latestSolutions.length > 0 ? (
                  latestSolutions.map((item) => (
                    <div
                      key={item?._id}
                      className="flex gap-4 rounded-lg border bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="relative h-20 w-24 flex-shrink-0 overflow-hidden rounded-md">
                        {item?.mainImage ? (
                          <Image
                            src={urlFor(item.mainImage).url()}
                            alt={item?.title || "Solution cover"}
                            fill
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full bg-shop_dark_green/15" />
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-shop_dark_green text-white">
                            {formatInsightType(item?.insightType)}
                          </Badge>
                          <span className="text-xs text-gray-500">{formatDate(item?.publishedAt)}</span>
                        </div>
                        <Link
                          href={buildInsightHref(
                            item?.slug?.current,
                            item?.insightType
                          )}
                          className="group/title block"
                        >
                          <p className="font-semibold text-shop_dark_green group-hover/title:text-shop_light_green line-clamp-2">
                            {item?.title}
                          </p>
                        </Link>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {item?.summary ||
                            "Discover validated solutions, case studies, and proven playbooks."}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-600">No solution stories yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </Container>

      <Container className="py-8 sm:py-12">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6 sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-shop_dark_green/70">Categories</p>
                <h3 className="text-2xl font-bold text-shop_dark_green">Explore by category</h3>
                <p className="text-gray-600">
                  Browse knowledge and solution categories to zero in on what matters most.
                </p>
              </div>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className="bg-shop_light_green/20 text-shop_dark_green">Knowledge</Badge>
                  <span className="text-sm text-gray-600">Research, comparisons, and guides</span>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {knowledgeCategories.length > 0 ? (
                    knowledgeCategories.map((category) => (
                      <Link
                        key={category._id}
                        href={`/insight/category/${category.slug?.current ?? ""}`}
                        className="block rounded-lg border bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="font-semibold text-shop_dark_green line-clamp-1">
                            {category.title}
                          </p>
                          <Badge variant="secondary" className="bg-shop_light_bg text-shop_dark_green">
                            {category.insightCount ?? 0}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {category.description || "Practical know-how to build your expertise."}
                        </p>
                      </Link>
                    ))
                  ) : (
                    <p className="text-sm text-gray-600">Knowledge categories coming soon.</p>
                  )}
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className="bg-shop_dark_green text-white">Solutions</Badge>
                  <span className="text-sm text-gray-600">Case studies and playbooks</span>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {solutionCategories.length > 0 ? (
                    solutionCategories.map((category) => (
                      <Link
                        key={category._id}
                        href={`/insight/category/${category.slug?.current ?? ""}`}
                        className="block rounded-lg border bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="font-semibold text-shop_dark_green line-clamp-1">
                            {category.title}
                          </p>
                          <Badge variant="secondary" className="bg-shop_light_bg text-shop_dark_green">
                            {category.insightCount ?? 0}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {category.description || "Validated solutions and proven approaches."}
                        </p>
                      </Link>
                    ))
                  ) : (
                    <p className="text-sm text-gray-600">Solution categories coming soon.</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Container>

      <Container className="pb-12 sm:pb-16">
        <Card className="border-0 bg-gradient-to-r from-shop_light_green/20 to-shop_dark_green/15">
          <CardContent className="p-6 sm:p-10 lg:p-12 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-md">
              <Mail className="h-6 w-6 text-shop_dark_green" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-shop_dark_green">
              Get the latest insights in your inbox
            </h3>
            <p className="text-sm sm:text-base text-gray-700 max-w-2xl mx-auto">
              Subscribe for expert knowledge, new solution playbooks, and curated research. Stay
              ahead with our freshest releases each week.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                className="bg-shop_dark_green text-white hover:bg-shop_light_green"
              >
                Subscribe Now
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-shop_dark_green text-shop_dark_green hover:bg-shop_dark_green hover:text-white"
                asChild
              >
                <Link href="/insight/knowledge">Start Exploring</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </Container>
    </div>
  );
};

export default InsightPage;
