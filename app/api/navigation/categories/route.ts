import { NextResponse } from "next/server";
import { getRootCategoriesForNav } from "@/sanity/queries";
import { categoriesData } from "@/constants";

export const revalidate = 900;

export async function GET() {
  try {
    const categories = await getRootCategoriesForNav();
    return NextResponse.json({ categories });
  } catch (error) {
    console.warn("Failed to load navigation categories; using fallback", error);
    const fallback = Array.isArray(categoriesData)
      ? categoriesData.map((category) => ({
          title: category.title,
          slug: category.href ? { current: category.href } : undefined,
          href: category.href,
        }))
      : [];
    return NextResponse.json({ categories: fallback }, { status: 200 });
  }
}
