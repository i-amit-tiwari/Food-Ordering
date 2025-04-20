import { useState } from "react";
import { Heart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/ui/price";
import { MenuItem } from "@shared/schema";
import { useCart } from "@/context/cart-context";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface MenuItemCardProps {
  item: MenuItem;
}

export function MenuItemCard({ item }: MenuItemCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const { addItem } = useCart();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const handleAddToCart = () => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please login to add items to your cart",
        variant: "destructive"
      });
      return;
    }
    
    addItem({
      id: 0, // Will be set by the server
      userId: user.id,
      menuItemId: item.id,
      quantity: 1,
      menuItem: item
    });
    
    toast({
      title: "Added to cart",
      description: `${item.name} has been added to your cart`,
    });
  };
  
  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFavorite(!isFavorite);
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
      <div className="relative h-48 overflow-hidden">
        <img
          src={item.imageUrl}
          alt={item.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute top-2 right-2 bg-white rounded-full p-1.5 shadow-sm">
          <button
            onClick={toggleFavorite}
            className={cn(
              "transition-colors",
              isFavorite ? "text-red-500" : "text-neutral-600 hover:text-red-500"
            )}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart className="h-5 w-5" fill={isFavorite ? "currentColor" : "none"} />
          </button>
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-medium text-neutral-900">{item.name}</h3>
          <div className="bg-neutral-100 text-neutral-600 px-2 py-1 rounded-full text-xs flex items-center">
            <Star className="h-3 w-3 mr-1 fill-yellow-400 stroke-yellow-400" />
            {item.rating.toFixed(1)}
          </div>
        </div>
        
        <p className="text-neutral-600 text-sm mt-1 line-clamp-2">{item.description}</p>
        
        <div className="mt-4 flex justify-between items-center">
          <Price value={item.price} />
          <Button
            onClick={handleAddToCart}
            variant="default"
            className="rounded-lg text-sm"
            size="sm"
          >
            Add to Cart
          </Button>
        </div>
      </div>
    </div>
  );
}
