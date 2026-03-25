import BlogArticlePageClient from "./BlogArticlePageClient";
import { getBlogCategories, getCategories, getOthersBlog, getSingleBlog } from "@/sanity/queries";
import { notFound } from "next/navigation";

const SingleBlogPage = async ({
  params,
}: {
  params: Promise<{ slug: string }>;
}) => {
  const { slug } = await params;
  const blog = await getSingleBlog(slug);

  if (!blog) return notFound();

  type BlogCategoryEntry = {
    _id?: string | null;
    title?: string | null;
    slug?: { current?: string | null } | null;
    blogcategories?: { _key?: string; title?: string | null }[];
  };
  type RelatedBlog = {
    _id?: string | null;
    title?: string | null;
    slug?: { current?: string | null } | null;
    mainImage?: any;
    publishedAt?: string | null;
  };

  const productCategories = ((await getCategories(6)) || []).filter(
    (category: { isParentCategory?: boolean } | null | undefined) => category?.isParentCategory,
  );
  const blogCategories = ((await getBlogCategories()) ?? []) as BlogCategoryEntry[];
  const latestBlogs = ((await getOthersBlog(slug, 5)) ?? []) as RelatedBlog[];

  return (
    <BlogArticlePageClient
      article={blog}
      productCategories={productCategories}
      blogCategories={blogCategories}
      latestBlogs={latestBlogs}
    />
  );
};

export default SingleBlogPage;
