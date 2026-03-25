import { Dispatch, SetStateAction } from "react";
import Title from "../Title";
import { BRANDS_QUERYResult } from "@/sanity.types";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";
interface Props {
  brands: BRANDS_QUERYResult;
  selectedBrand?: string | null;
  setSelectedBrand: Dispatch<SetStateAction<string | null>>;
}

const BrandList = ({ brands, selectedBrand, setSelectedBrand }: Props) => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <Title className="text-base font-semibold text-gray-900">Brands</Title>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
          {brands?.length || 0}
        </span>
      </div>

      <RadioGroup value={selectedBrand || ""} className="space-y-1">
        {brands?.map((brand) => (
          <div
            key={brand?._id}
            onClick={() => setSelectedBrand(brand?.slug?.current as string)}
            className="group flex items-center space-x-3 px-2 py-1 -mx-2 rounded-md hover:bg-gray-50 cursor-pointer transition-colors duration-150"
          >
            <RadioGroupItem
              value={brand?.slug?.current as string}
              id={brand?.slug?.current}
              className="border-gray-300 text-brand-black-strong focus:ring-brand-black-strong"
            />
            <Label
              htmlFor={brand?.slug?.current}
              className={`flex-1 cursor-pointer transition-colors duration-150 ${
                selectedBrand === brand?.slug?.current
                  ? "font-medium text-brand-black-strong"
                  : "text-gray-700 group-hover:text-gray-900"
              }`}
            >
              {brand?.title}
            </Label>
          </div>
        ))}
      </RadioGroup>

      {selectedBrand && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedBrand(null);
          }}
          className="mt-4 text-xs font-medium text-gray-600 hover:text-brand-black-strong underline underline-offset-2 decoration-1 transition-colors duration-150"
        >
          Clear brand filter
        </button>
      )}
    </div>
  );
};

export default BrandList;
