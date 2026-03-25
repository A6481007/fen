"use client";

import { Category, Product } from "@/sanity.types";
import { urlFor } from "@/sanity/lib/image";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Tag,
  Grid3X3,
  Filter,
  TrendingUp,
} from "lucide-react";
import Title from "./Title";
import CategoryProducts from "./product/CategoryProducts";
import { buildCategoryUrl, CATEGORY_BASE_PATH } from "@/lib/paths";

interface Props {
  categories: Category[];
  slug: string;
  categoryTitle: string;
  currentCategory?: Category;
  relatedCategories: Category[];
  initialProducts: Product[];
}

const CategoryPageClient = ({
  categories,
  slug,
  categoryTitle,
  currentCategory,
  relatedCategories,
  initialProducts,
}: Props) => {
  return (
    <>
      {/* Category Header Section */}
      <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 lg:p-8 shadow-md border border-gray-100/50 mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Left Side - Category Info */}
          <div className="flex-1">
            <div className="flex items-start gap-4 mb-4">
              {/* Category Image */}
              {currentCategory?.image && (
                <div className="flex-shrink-0 w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-brand-border to-brand-background-subtle rounded-xl overflow-hidden">
                  <Image
                    src={urlFor(currentCategory.image).url()}
                    alt={categoryTitle}
                    width={80}
                    height={80}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}

              <div className="flex-1">
                <Title className="text-2xl lg:text-3xl font-bold text-brand-black-strong mb-2">
                  {categoryTitle}
                </Title>

                {/* Category Stats */}
                <div className="flex items-center gap-4 text-sm text-brand-black-strong mb-3">
                  {currentCategory?.featured && (
                    <div className="flex items-center gap-1 text-brand-red-accent">
                      <Tag className="w-4 h-4" />
                      <span>Featured Category</span>
                    </div>
                  )}
                  {currentCategory?.range && (
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" />
                      <span>Range: {currentCategory.range}</span>
                    </div>
                  )}
                </div>

                {/* Category Description */}
                {currentCategory?.description && (
                  <p className="text-brand-black-strong text-sm lg:text-base line-clamp-2">
                    {currentCategory.description}
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={CATEGORY_BASE_PATH}
                className="inline-flex items-center gap-2 text-brand-black-strong hover:text-brand-text-main transition-colors duration-300 text-sm font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Categories
              </Link>

              <div className="h-4 w-px bg-gray-300" />

              <Link
                href="/shop"
                className="inline-flex items-center gap-2 bg-brand-text-main hover:bg-brand-black-strong text-white px-4 py-2 rounded-full font-medium text-sm transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
              >
                <Grid3X3 className="w-4 h-4" />
                View All Products
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Right Side - Quick Actions */}
          <div className="flex flex-col gap-3 lg:items-end">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-xs text-brand-black-strong bg-white/60 px-3 py-1.5 rounded-full">
                <Grid3X3 className="w-3 h-3" />
                <span>Category View</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-brand-black-strong bg-white/60 px-3 py-1.5 rounded-full">
                <Filter className="w-3 h-3" />
                <span>Filtered Results</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <CategoryProducts
        categories={categories}
        slug={slug}
        initialProducts={initialProducts}
      />

      {/* Related Categories Section */}
      {relatedCategories.length > 0 && (
        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl lg:text-2xl font-bold text-brand-black-strong">
              Explore Other Categories
            </h3>
            <Link
              href={CATEGORY_BASE_PATH}
              className="text-brand-text-main hover:text-brand-black-strong font-medium text-sm flex items-center gap-1 transition-colors duration-300"
            >
              View All
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {relatedCategories.map((category) => (
              <Link
                key={category._id}
                href={buildCategoryUrl(category.slug?.current)}
                className="group bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-gray-100 hover:border-brand-text-main p-4 text-center"
              >
                {/* Category Image */}
                <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-brand-border to-brand-background-subtle rounded-lg flex items-center justify-center">
                  {category.image ? (
                    <Image
                      src={urlFor(category.image).url()}
                      alt={category.title || "Category"}
                      width={32}
                      height={32}
                      className="w-8 h-8 object-contain"
                    />
                  ) : (
                    <Grid3X3 className="w-6 h-6 text-brand-text-main opacity-60" />
                  )}
                </div>

                {/* Category Title */}
                <h4 className="text-sm font-medium text-brand-black-strong group-hover:text-brand-text-main transition-colors duration-300 line-clamp-1">
                  {category.title}
                </h4>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Call to Action Section */}
      <div className="mt-12 bg-gradient-to-r from-brand-text-main/10 via-brand-red-accent/5 to-brand-text-main/10 rounded-xl p-6 lg:p-8 border border-brand-text-main/20 text-center">
        <div className="max-w-2xl mx-auto">
          <h3 className="text-xl lg:text-2xl font-bold text-brand-black-strong mb-3">
            Discover More Amazing Products
          </h3>
          <p className="text-brand-black-strong mb-6 text-sm lg:text-base">
            Can&apos;t find what you&apos;re looking for in {categoryTitle}?
            Explore our complete collection of products across all categories.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/shop"
              className="inline-flex items-center justify-center gap-2 bg-brand-black-strong hover:bg-brand-text-main text-white px-6 py-3 rounded-full font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Grid3X3 className="w-5 h-5" />
              Browse All Products
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href={CATEGORY_BASE_PATH}
              className="inline-flex items-center justify-center gap-2 border-2 border-brand-text-main text-brand-text-main hover:bg-brand-text-main hover:text-white px-6 py-3 rounded-full font-semibold transition-all duration-300"
            >
              <Grid3X3 className="w-5 h-5" />
              All Categories
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default CategoryPageClient;
