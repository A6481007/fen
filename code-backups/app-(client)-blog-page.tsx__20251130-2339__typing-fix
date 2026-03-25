import Container from "@/components/Container";
import DynamicBreadcrumb from "@/components/DynamicBreadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { GET_ALL_BLOGResult } from "@/sanity.types";
import { urlFor } from "@/sanity/lib/image";
import { getAllBlogs } from "@/sanity/queries";
import dayjs from "dayjs";
import { Calendar, Clock, ArrowRight, User, Eye, BookOpen } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const BlogPage = async () => {
  const blogs = await getAllBlogs(12);

  // Calculate reading time (mock calculation based on title length)
  const calculateReadingTime = (title: string) => {
    const wordsPerMinute = 200;
    const wordCount = title.split(" ").length * 20; // Estimate based on title
    return Math.ceil(wordCount / wordsPerMinute);
  };

  // Extract description from blog body
  const extractDescription = (
    body: GET_ALL_BLOGResult[0]["body"],
    maxLength: number = 150
  ) => {
    if (!body || !Array.isArray(body))
      return "Discover insights and stories that matter.";

    let description = "";
    for (const block of body) {
      if (block._type === "block" && block.children) {
        for (const child of block.children) {
          if (child.text && child._type === "span") {
            description += child.text + " ";
            if (description.length > maxLength) {
              return description.substring(0, maxLength).trim() + "...";
            }
          }
        }
      }
    }

    return (
      description.trim() ||
      "Read our latest insights and discover new perspectives."
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-shop_light_bg to-white">
      {/* Breadcrumb */}
      <Container className="pt-6">
        <DynamicBreadcrumb />
      </Container>

      {/* Hero Section */}
      <Container className="py-8 sm:py-12">
        <Card className="bg-gradient-to-r from-shop_dark_green to-shop_light_green text-white border-0 shadow-xl overflow-hidden">
          <CardContent className="p-6 sm:p-8 lg:p-12 text-center">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center justify-center gap-2 mb-4">
                <BookOpen className="w-6 h-6 sm:w-8 sm:h-8" />
                <Badge
                  variant="secondary"
                  className="bg-white/20 text-white hover:bg-white/30"
                >
                  Our Blog
                </Badge>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                Stories, Tips & Insights
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-white/90 mb-6 max-w-2xl mx-auto">
                Discover the latest trends, expert advice, and behind-the-scenes
                stories from our team. Stay informed with our curated collection
                of articles.
              </p>

              {/* Blog Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-md mx-auto">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-4">
                  <div className="flex items-center gap-2 text-white/80 mb-1">
                    <BookOpen className="w-4 h-4" />
                    <span className="text-xs sm:text-sm">Articles</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold">
                    {blogs?.length || 0}
                  </p>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-4">
                  <div className="flex items-center gap-2 text-white/80 mb-1">
                    <Eye className="w-4 h-4" />
                    <span className="text-xs sm:text-sm">Readers</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold">15K+</p>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-4 col-span-2 sm:col-span-1">
                  <div className="flex items-center gap-2 text-white/80 mb-1">
                    <User className="w-4 h-4" />
                    <span className="text-xs sm:text-sm">Authors</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold">5+</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Container>

      {/* Blog Grid */}
      <Container className="py-8 sm:py-12">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-shop_dark_green mb-2">
                Latest Articles
              </h2>
              <p className="text-gray-600">
                Stay updated with our latest posts and insights
              </p>
            </div>
          </div>
        </div>

        {blogs && blogs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {blogs.map((blog, index) => (
              <Card
                key={blog?._id}
                className={`group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden border-0 shadow-lg ${
                  index === 0 ? "md:col-span-2 lg:col-span-2" : ""
                }`}
              >
                {blog?.mainImage && (
                  <div className="relative overflow-hidden">
                    <Image
                      src={urlFor(blog.mainImage).url()}
                      alt={blog?.title || "Blog image"}
                      width={500}
                      height={300}
                      className={`w-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                        index === 0 ? "h-64 md:h-80" : "h-48 md:h-56"
                      }`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    <Link
                      href={`/blog/${blog?.slug?.current}`}
                      className="absolute inset-0"
                    />

                    {/* Category Badge */}
                    {blog?.blogcategories && blog.blogcategories.length > 0 && (
                      <Badge className="absolute top-4 left-4 bg-shop_dark_green hover:bg-shop_light_green">
                        {blog.blogcategories[0]?.title}
                      </Badge>
                    )}
                  </div>
                )}

                <CardContent className="p-4 sm:p-6">
                  {/* Meta Information */}
                  <div className="flex items-center gap-4 text-xs sm:text-sm text-gray-500 mb-3">
                    <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      {dayjs(blog.publishedAt).format("MMM D, YYYY")}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={14} />
                      {calculateReadingTime(blog?.title || "")} min read
                    </div>
                  </div>

                  {/* Title */}
                  <Link
                    href={`/blog/${blog?.slug?.current}`}
                    className="block group/title"
                  >
                    <h3
                      className={`font-bold text-shop_dark_green group-hover/title:text-shop_light_green transition-colors duration-200 line-clamp-2 leading-tight ${
                        index === 0
                          ? "text-lg sm:text-xl md:text-2xl mb-3"
                          : "text-base sm:text-lg mb-2"
                      }`}
                    >
                      {blog?.title}
                    </h3>
                  </Link>

                  {/* Description for all posts */}
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {extractDescription(blog?.body || [])}
                  </p>

                  <Separator className="my-3" />

                  {/* Read More Link */}
                  <Link
                    href={`/blog/${blog?.slug?.current}`}
                    className="inline-flex items-center gap-2 text-sm font-medium text-shop_light_green hover:text-shop_dark_green transition-colors duration-200 group/link"
                  >
                    Read More
                    <ArrowRight
                      size={14}
                      className="transition-transform duration-200 group-hover/link:translate-x-1"
                    />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 sm:p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center">
                <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                  No Blog Posts Yet
                </h3>
                <p className="text-sm sm:text-base text-gray-600 mb-4">
                  We&apos;re working on some amazing content. Check back soon!
                </p>
                <Button asChild>
                  <Link href="/">Back to Home</Link>
                </Button>
              </div>
            </div>
          </Card>
        )}
      </Container>

      {/* Newsletter Section */}
      <Container className="py-8 sm:py-12">
        <Card className="bg-gradient-to-r from-shop_light_pink to-light-orange/20 border-0">
          <CardContent className="p-6 sm:p-8 lg:p-12 text-center">
            <div className="max-w-2xl mx-auto">
              <BookOpen className="w-12 h-12 text-shop_dark_green mx-auto mb-4" />
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-shop_dark_green mb-4">
                Stay Updated
              </h2>
              <p className="text-sm sm:text-base text-gray-600 mb-6">
                Subscribe to our newsletter and never miss an update. Get the
                latest articles, tips, and insights delivered straight to your
                inbox.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-md mx-auto">
                <Button
                  size="lg"
                  className="bg-shop_dark_green hover:bg-shop_light_green w-full sm:w-auto"
                >
                  Subscribe Newsletter
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-shop_dark_green text-shop_dark_green hover:bg-shop_dark_green hover:text-white w-full sm:w-auto"
                >
                  Browse Categories
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </Container>
    </div>
  );
};

export default BlogPage;
