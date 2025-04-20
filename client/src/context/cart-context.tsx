import { createContext, useState, useContext, useEffect, ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CartItemWithDetails, InsertCartItem } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface CartContextType {
  items: CartItemWithDetails[];
  isOpen: boolean;
  isLoading: boolean;
  toggleCart: () => void;
  addItem: (item: CartItemWithDetails) => void;
  updateQuantity: (id: number, quantity: number) => void;
  removeItem: (id: number) => void;
  clearCart: () => void;
  calculateTotal: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Cart data fetching
  const { data: cartItems = [], isLoading } = useQuery<CartItemWithDetails[]>({
    queryKey: ["/api/cart"],
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
  
  // Cart mutations
  const addToCartMutation = useMutation({
    mutationFn: async (cartItem: InsertCartItem) => {
      const res = await apiRequest("POST", "/api/cart", cartItem);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error adding to cart",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const updateCartMutation = useMutation({
    mutationFn: async ({ id, quantity }: { id: number; quantity: number }) => {
      const res = await apiRequest("PUT", `/api/cart/${id}`, { quantity });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating cart",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const removeFromCartMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/cart/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error removing from cart",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const toggleCart = () => {
    setIsOpen(!isOpen);
  };
  
  const addItem = (item: CartItemWithDetails) => {
    if (!user) return;
    
    const { menuItem, ...cartItem } = item;
    addToCartMutation.mutate(cartItem);
    
    // Open cart when adding items
    if (!isOpen) {
      setIsOpen(true);
    }
  };
  
  const updateQuantity = (id: number, quantity: number) => {
    if (quantity < 1) return;
    updateCartMutation.mutate({ id, quantity });
  };
  
  const removeItem = (id: number) => {
    removeFromCartMutation.mutate(id);
  };
  
  const clearCart = async () => {
    // We would need a clear cart endpoint ideally
    // For now, we'll just remove each item
    if (cartItems.length === 0) return;
    
    try {
      for (const item of cartItems) {
        await apiRequest("DELETE", `/api/cart/${item.id}`);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
    } catch (error) {
      console.error("Error clearing cart:", error);
    }
  };
  
  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      return total + item.menuItem.price * item.quantity;
    }, 0);
  };
  
  // Close cart when user state changes (login/logout)
  useEffect(() => {
    if (isOpen) setIsOpen(false);
  }, [user]);
  
  // Close cart when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-cart]") && !target.closest("[data-cart-trigger]")) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);
  
  // Listen for Escape key to close cart
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);
  
  return (
    <CartContext.Provider
      value={{
        items: cartItems,
        isOpen,
        isLoading,
        toggleCart,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        calculateTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
