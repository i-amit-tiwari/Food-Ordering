import { Plus, Minus, Trash2 } from "lucide-react";
import { useCart } from "@/context/cart-context";
import { Price } from "@/components/ui/price";
import { CartItemWithDetails } from "@shared/schema";

interface CartItemProps {
  item: CartItemWithDetails;
}

export function CartItem({ item }: CartItemProps) {
  const { updateQuantity, removeItem } = useCart();
  const { menuItem, quantity } = item;
  
  const handleIncrement = () => {
    updateQuantity(item.id, quantity + 1);
  };
  
  const handleDecrement = () => {
    if (quantity > 1) {
      updateQuantity(item.id, quantity - 1);
    } else {
      removeItem(item.id);
    }
  };
  
  return (
    <div className="flex items-center py-4 border-b border-neutral-200">
      <img
        src={menuItem.imageUrl}
        alt={menuItem.name}
        className="w-16 h-16 object-cover rounded-lg"
      />
      <div className="ml-4 flex-grow">
        <h3 className="text-neutral-900 font-medium">{menuItem.name}</h3>
        <Price value={menuItem.price} size="sm" className="text-neutral-600" />
      </div>
      <div className="flex items-center">
        <button
          onClick={handleDecrement}
          className="text-neutral-500 hover:text-neutral-700 bg-neutral-100 rounded-full p-1"
          aria-label={quantity === 1 ? "Remove item" : "Decrease quantity"}
        >
          {quantity === 1 ? <Trash2 className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
        </button>
        <span className="mx-2 text-neutral-900 font-medium">{quantity}</span>
        <button
          onClick={handleIncrement}
          className="text-neutral-500 hover:text-neutral-700 bg-neutral-100 rounded-full p-1"
          aria-label="Increase quantity"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
