import { Button } from "./ui/button";
import { HiMinus, HiPlus } from "react-icons/hi2";
import { toast } from "sonner";
import { Product } from "@/sanity.types";
import { twMerge } from "tailwind-merge";
import { trackAddToCart, trackRemoveFromCart } from "@/lib/analytics";
import { useCart } from "@/hooks/useCart";

interface Props {
  product: Product;
  className?: string;
  borderStyle?: string;
  lineId?: string;
}

const QuantityButtons = ({ product, className, borderStyle, lineId }: Props) => {
  const { cart, addItems, updateItem, removeItem, isMutating } = useCart();
  const line = lineId
    ? cart?.items.find((item) => item.id === lineId)
    : cart?.items.find((item) => item.productId === product?._id);
  const itemCount = line?.quantity ?? 0;
  const isOutOfStock = product?.stock === 0;

  const handleRemoveProduct = async () => {
    if (!line) return;

    try {
      if (line.quantity > 1) {
        await updateItem(line.id, line.quantity - 1);
        toast.success("Quantity decreased");
      } else {
        await removeItem(line.id);
        toast.success(`${product?.name?.substring(0, 12)} removed successfully!`);
      }
      trackRemoveFromCart({
        productId: product._id,
        name: product.name || "Unknown",
        price: product.price ?? 0,
        quantity: Math.max(0, itemCount - 1),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to update cart quantity";
      toast.error(message);
    }
  };

  const handleAddToCart = async () => {
    if ((product?.stock as number) <= itemCount) {
      toast.error("Can not add more than available stock");
      return;
    }

    try {
      if (line) {
        await updateItem(line.id, line.quantity + 1);
      } else {
        await addItems({
          items: [
            {
              productId: product._id,
              productName: product.name ?? product._id,
              productSlug: product.slug?.current ?? product._id,
              quantity: 1,
              unitPrice: product.price ?? 0,
            },
          ],
        });
      }

      toast.success("Quantity increased successfully!");
      trackAddToCart({
        productId: product._id,
        name: product.name || "Unknown",
        price: product.price ?? 0,
        quantity: itemCount + 1,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to add more of this item";
      toast.error(message);
    }
  };
  return (
    <div
      className={twMerge(
        "flex items-center gap-1 pb-1 text-base",
        borderStyle,
        className
      )}
    >
      <Button
        variant="outline"
        size="icon"
        className="w-6 h-6 border-0 hover:bg-brand-black-strong/20"
        onClick={handleRemoveProduct}
        disabled={itemCount === 0 || isOutOfStock || isMutating}
      >
        <HiMinus />
      </Button>
      <span className="font-semibold text-sm w-6 text-center text-brand-black-strong">
        {itemCount}
      </span>
      <Button
        variant="outline"
        size="icon"
        className="w-6 h-6 border-0 hover:bg-brand-black-strong/20"
        onClick={handleAddToCart}
        disabled={isOutOfStock || isMutating}
      >
        <HiPlus />
      </Button>
    </div>
  );
};

export default QuantityButtons;
