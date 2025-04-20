import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { X } from "lucide-react";
import { useCart } from "@/context/cart-context";
import { CartItem } from "@/components/cart/cart-item";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/ui/price";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";

export function CartSidebar() {
  const { items, isOpen, toggleCart, calculateTotal } = useCart();
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  
  // Close the cart when navigating to checkout
  useEffect(() => {
    if (location === "/checkout" && isOpen) {
      toggleCart();
    }
  }, [location, isOpen, toggleCart]);
  
  const subtotal = calculateTotal();
  const deliveryFee = items.length > 0 ? 2.99 : 0;
  const total = subtotal + deliveryFee;
  
  const handleCheckout = () => {
    if (!user) {
      navigate("/auth");
    } else {
      navigate("/checkout");
    }
    toggleCart();
  };
  
  return (
    <div 
      data-cart="true" 
      className={`fixed inset-y-0 right-0 max-w-sm w-full bg-white shadow-xl transform ${isOpen ? 'translate-x-0' : 'translate-x-full'} transition-transform duration-300 ease-in-out z-50`}
    >
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">Your Cart</h2>
          <button 
            onClick={toggleCart}
            className="text-neutral-600 hover:text-neutral-900"
            aria-label="Close cart"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="flex-grow overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="bg-neutral-100 rounded-full p-6 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-neutral-900 mb-2">Your cart is empty</h3>
              <p className="text-neutral-600 mb-6">Add items to get started with your order</p>
              <Button onClick={toggleCart} className="w-full">
                Browse Menu
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <CartItem key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
        
        {items.length > 0 && (
          <div className="p-4 border-t border-neutral-200">
            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-neutral-600">Subtotal</span>
                <Price value={subtotal} />
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-neutral-600">Delivery Fee</span>
                <Price value={deliveryFee} />
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between">
                <span className="text-neutral-900 font-semibold">Total</span>
                <Price value={total} size="lg" className="font-semibold" />
              </div>
            </div>
            <Button 
              onClick={(e) => {
                e.stopPropagation();
                handleCheckout();
              }} 
              className="w-full"
              data-cart="true"
            >
              Proceed to Checkout
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
