import { getAllBlogs } from "@/sanity/queries";
import BlogPageClient from "./BlogPageClient";

const BlogPage = async () => {
  const blogs = (await getAllBlogs(12)) ?? [];

  return <BlogPageClient blogs={blogs} />;
};

export default BlogPage;
