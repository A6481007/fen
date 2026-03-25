import { Dispatch, SetStateAction } from "react";
import Title from "../Title";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";

const priceArray = [
  { title: "Under $100", value: "0-100" },
  { title: "$100 - $200", value: "100-200" },
  { title: "$200 - $300", value: "200-300" },
  { title: "$300 - $500", value: "300-500" },
  { title: "Over $500", value: "500-10000" },
];

interface Props {
  selectedPrice?: string | null;
  setSelectedPrice: Dispatch<SetStateAction<string | null>>;
}
const PriceList = ({ selectedPrice, setSelectedPrice }: Props) => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <Title className="text-base font-semibold text-gray-900">
          Price Range
        </Title>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
          {priceArray.length}
        </span>
      </div>

      <RadioGroup className="space-y-1" value={selectedPrice || ""}>
        {priceArray?.map((price, index) => (
          <div
            key={index}
            onClick={() => setSelectedPrice(price?.value)}
            className="group flex items-center space-x-3 px-2 py-1 -mx-2 rounded-md hover:bg-gray-50 cursor-pointer transition-colors duration-150"
          >
            <RadioGroupItem
              value={price?.value}
              id={price?.value}
              className="border-gray-300 text-brand-black-strong focus:ring-brand-black-strong"
            />
            <Label
              htmlFor={price.value}
              className={`flex-1 cursor-pointer transition-colors duration-150 ${
                selectedPrice === price?.value
                  ? "font-medium text-brand-black-strong"
                  : "text-gray-700 group-hover:text-gray-900"
              }`}
            >
              {price?.title}
            </Label>
          </div>
        ))}
      </RadioGroup>

      {selectedPrice && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedPrice(null);
          }}
          className="mt-4 text-xs font-medium text-gray-600 hover:text-brand-black-strong underline underline-offset-2 decoration-1 transition-colors duration-150"
        >
          Clear price filter
        </button>
      )}
    </div>
  );
};

export default PriceList;
