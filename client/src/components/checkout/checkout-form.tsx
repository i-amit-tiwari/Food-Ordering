import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useElements, useStripe, PaymentElement } from "@stripe/react-stripe-js";
import { Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Price } from "@/components/ui/price";
import { CheckoutData, checkoutSchema } from "@shared/schema";
import { useCart } from "@/context/cart-context";
import { CartItemWithDetails } from "@shared/schema";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

interface CheckoutFormProps {
  clientSecret: string;
  onSuccess: (orderId: number) => void;
}

export function CheckoutForm({ clientSecret, onSuccess }: CheckoutFormProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const stripe = useStripe();
  const elements = useElements();
  const { items, calculateTotal, clearCart } = useCart();
  const { user } = useAuth();
  
  const form = useForm<CheckoutData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      name: user?.name || "",
      address: "",
      city: "",
      zipCode: "",
      phone: ""
    }
  });
  
  const subtotal = calculateTotal();
  const deliveryFee = items.length > 0 ? 2.99 : 0;
  const total = subtotal + deliveryFee;
  
  const onSubmit = async (data: CheckoutData) => {
    if (!stripe || !elements) {
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // First confirm payment with Stripe
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + "/payment-success",
        },
        redirect: "if_required"
      });
      
      if (error) {
        toast({
          title: "Payment failed",
          description: error.message,
          variant: "destructive"
        });
        setIsProcessing(false);
        return;
      }
      
      // If payment is successful, create the order
      const orderItems = items.map(item => ({
        menuItemId: item.menuItemId,
        name: item.menuItem.name,
        price: item.menuItem.price,
        quantity: item.quantity
      }));
      
      const orderData = {
        userId: user!.id,
        items: orderItems,
        total: total,
        address: `${data.address}, ${data.city}, ${data.zipCode}`,
        paymentId: clientSecret.split('_secret_')[0]
      };
      
      const res = await apiRequest("POST", "/api/orders", orderData);
      const order = await res.json();
      
      // Clear the cart after successful order
      clearCart();
      
      // Show success message and redirect
      onSuccess(order.id);
      
    } catch (err: any) {
      toast({
        title: "Error creating order",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Delivery Information */}
          <Card>
            <CardHeader>
              <CardTitle>Delivery Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main St" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="New York" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="zipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ZIP Code</FormLabel>
                      <FormControl>
                        <Input placeholder="10001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="(123) 456-7890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          
          {/* Payment Information and Order Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Payment Information</CardTitle>
              </CardHeader>
              <CardContent>
                <PaymentElement options={{ layout: "tabs" }} />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {items.map((item: CartItemWithDetails) => (
                    <div key={item.id} className="flex justify-between text-sm py-1">
                      <span className="text-neutral-600">
                        {item.menuItem.name} x{item.quantity}
                      </span>
                      <Price value={item.menuItem.price * item.quantity} size="sm" />
                    </div>
                  ))}
                </div>
                
                <Separator className="my-4" />
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Subtotal</span>
                    <Price value={subtotal} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Delivery Fee</span>
                    <Price value={deliveryFee} />
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Total</span>
                    <Price value={total} className="font-medium" />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isProcessing || !stripe || !elements}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Pay ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(total)}`
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </form>
    </Form>
  );
}
