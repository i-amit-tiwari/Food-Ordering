import { useEffect } from "react";
import { Link, useParams, useLocation } from "wouter";
import { CheckCircle } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function OrderSuccessPage() {
  const params = useParams<{ orderId: string }>();
  const [_, navigate] = useLocation();
  const orderId = params?.orderId || "unknown";
  
  // Redirect to home if accessed directly without an orderId
  useEffect(() => {
    if (orderId === "unknown") {
      navigate("/");
    }
  }, [orderId, navigate]);
  
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-grow bg-neutral-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl">Order Placed Successfully!</CardTitle>
            <CardDescription>
              Your order #{orderId} has been placed successfully. You can track your order in the Orders section.
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="bg-neutral-50 p-4 rounded-md border border-neutral-200 text-left">
              <h3 className="font-medium text-neutral-900 mb-2">Order Details</h3>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Order Number:</span>
                  <span className="text-neutral-900 font-medium">#{orderId}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Estimated Delivery:</span>
                  <span className="text-neutral-900 font-medium">30-45 minutes</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Payment Method:</span>
                  <span className="text-neutral-900 font-medium">Credit Card</span>
                </div>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-2">
            <Button asChild className="w-full">
              <Link href="/orders">Track My Order</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/">Continue Shopping</Link>
            </Button>
          </CardFooter>
        </Card>
      </main>
      
      <Footer />
    </div>
  );
}
