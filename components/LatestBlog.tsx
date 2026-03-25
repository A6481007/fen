import Container from "./Container";
import Title from "./Title";
import { getLatestBlogs } from "@/sanity/queries";
import Image from "next/image";
import { urlFor } from "@/sanity/lib/image";
import dayjs from "dayjs";
import { Calendar } from "lucide-react";
import Link from "next/link";

const LatestBlog = async () => {
  const blogs: any[] = (await getLatestBlogs()) ?? [];

  return (
    <Container className="mt-16 lg:mt-24">
      {/* Header Section */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="h-1 w-12 bg-gradient-to-r from-brand-text-main to-brand-black-strong rounded-full"></div>
          <Title className="text-3xl lg:text-4xl font-bold text-brand-black-strong">
            Latest Blog Posts
          </Title>
          <div className="h-1 w-12 bg-gradient-to-l from-brand-text-main to-brand-black-strong rounded-full"></div>
        </div>
        <p className="text-brand-text-muted text-lg max-w-2xl mx-auto">
          Stay updated with our latest insights, tips, and industry news
        </p>
        <Link
          href={"/blog"}
          className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-brand-border text-brand-black-strong font-semibold rounded-full hover:bg-brand-black-strong hover:text-white border-2 border-brand-black-strong hoverEffect"
        >
          View All Posts
          <svg
            className="w-4 h-4 hoverEffect group-hover:translate-x-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 8l4 4m0 0l-4 4m4-4H3"
            />
          </svg>
        </Link>
      </div>

      {/* Blog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {blogs?.map((blog, index) => (
          <div
            key={blog?._id}
            className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl border border-gray-100 hover:border-brand-text-main hoverEffect transform hover:-translate-y-2"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            {/* Image Container */}
            {blog?.mainImage && (
              <div className="relative overflow-hidden">
                <Link href={`/blog/${blog?.slug?.current}`}>
                  <Image
                    src={urlFor(blog?.mainImage).url()}
                    alt={blog?.title || "Blog image"}
                    width={500}
                    height={300}
                    className="w-full h-48 object-cover group-hover:scale-110 hoverEffect"
                  />
                </Link>
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 hoverEffect"></div>
              </div>
            )}

            {/* Content Container */}
            <div className="p-6">
              {/* Meta Information */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                {blog?.blogcategories?.map((item: any, index: number) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-brand-border text-brand-black-strong border border-brand-text-main/30"
                  >
                    {item?.title}
                  </span>
                ))}
              </div>

              {/* Date */}
              <div className="flex items-center gap-2 text-sm text-brand-text-muted mb-3">
                <Calendar size={16} className="text-brand-text-main" />
                <span>{dayjs(blog.publishedAt).format("MMM D, YYYY")}</span>
              </div>

              {/* Title */}
              <Link href={`/blog/${blog?.slug?.current}`} className="block">
                <h3 className="text-lg font-bold text-brand-black-strong line-clamp-2 group-hover:text-brand-black-strong hoverEffect leading-tight">
                  {blog?.title}
                </h3>
              </Link>

              {/* Read More Button */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <Link
                  href={`/blog/${blog?.slug?.current}`}
                  className="inline-flex items-center gap-2 text-sm font-medium text-brand-black-strong hover:text-brand-text-main hoverEffect"
                >
                  Read More
                  <svg
                    className="w-4 h-4 hoverEffect group-hover:translate-x-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom CTA */}
      {blogs && blogs.length > 0 && (
        <div className="text-center mt-12">
          <div className="inline-flex items-center gap-4 px-8 py-4 bg-gradient-to-r from-brand-border to-brand-background-subtle rounded-2xl border border-brand-text-main/20">
            <div className="w-2 h-2 bg-brand-text-main rounded-full animate-pulse"></div>
            <span className="text-brand-black-strong font-medium">
              Discover more insights and stories in our blog section
            </span>
            <div className="w-2 h-2 bg-brand-text-main rounded-full animate-pulse"></div>
          </div>
        </div>
      )}
    </Container>
  );
};

export default LatestBlog;
