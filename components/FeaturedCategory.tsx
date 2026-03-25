import Container from "./Container";
import Image from "next/image";
import { urlFor } from "@/sanity/lib/image";
import Link from "next/link";
import { Category } from "@/sanity.types";
import { getFeaturedCategory } from "@/sanity/queries";
import { buildCategoryUrl } from "@/lib/paths";

const FeaturedCategory = async () => {
  const featuredCategories = await getFeaturedCategory(4);

  return (
    <Container className="py-10 lg:py-20">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {featuredCategories?.map((category: Category) => (
          <div
            key={category?._id}
            className="bg-[#F5F5F5] px-5 py-3 flex items-center justify-between gap-4 rounded-md relative group overflow-hidden"
          >
            <div>
              {category?.image && (
                <Image
                  src={urlFor(category?.image).url()}
                  alt="categoryImage"
                  width={100}
                  height={100}
                  className="w-24 h-24 object-cover group-hover:scale-110 hoverEffect"
                />
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold uppercase">
                {category?.title}
              </h3>
              <Link
                href={buildCategoryUrl(category?.slug?.current)}
                className="absolute inset-0"
              />
              <p className="text-xs font-bold mt-2">
                Starting at{" "}
                <span className="text-brand-black-strong">${category?.range}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </Container>
  );
};

export default FeaturedCategory;
