import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { Loader2 } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { useCart } from "@/context/cart-context";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || "pk_test_TYooMQauvdEDq54NiTphI7jx");

export default function CheckoutPage() {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { items, calculateTotal } = useCart();
  const { user } = useAuth();
  const [_, navigate] = useLocation();
  
  useEffect(() => {
    // Redirect to home if cart is empty
    if (items.length === 0) {
      navigate("/");
      return;
    }
    
    // Fetch payment intent client secret from server
    const getPaymentIntent = async () => {
      try {
        const total = calculateTotal() + 2.99; // Add delivery fee
        const res = await apiRequest("POST", "/api/payment", { amount: total });
        const data = await res.json();
        setClientSecret(data.clientSecret);
      } catch (error) {
        console.error("Error creating payment intent:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    getPaymentIntent();
  }, [items, navigate, calculateTotal]);
  
  const handleCheckoutSuccess = (orderId: number) => {
    navigate(`/order-success/${orderId}`);
  };
  
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-grow bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <h1 className="text-3xl font-bold text-neutral-900 mb-8">Checkout</h1>
          
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : clientSecret ? (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm 
                clientSecret={clientSecret} 
                onSuccess={handleCheckoutSuccess} 
              />
            </Elements>
          ) : (
            <div className="text-center py-12">
              <h2 className="text-xl font-medium text-neutral-800">
                Unable to initialize payment. Please try again later.
              </h2>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
