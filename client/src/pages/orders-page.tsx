import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { OrderWithItems, OrderStatus } from "@shared/schema";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { CartSidebar } from "@/components/cart/cart-sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Price } from "@/components/ui/price";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function OrdersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const { data: orders = [], isLoading } = useQuery<OrderWithItems[]>({
    queryKey: ["/api/orders", user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/orders/${user!.id}`, { credentials: 'include' });
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
    enabled: !!user,
  });
  
  // Helper function to get status badge color
  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "delivering":
        return "bg-purple-100 text-purple-800";
      case "delivered":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-neutral-100 text-neutral-800";
    }
  };
  
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-grow bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <h1 className="text-3xl font-bold text-neutral-900 mb-8">My Orders</h1>
          
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : orders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="bg-neutral-100 rounded-full p-6 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-neutral-900 mb-2">No orders yet</h3>
                <p className="text-neutral-600 mb-6 text-center max-w-md">
                  You haven't placed any orders yet. Browse our menu and place your first order!
                </p>
                <Button asChild>
                  <a href="/">Browse Menu</a>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => (
                <Card key={order.id} className="overflow-hidden">
                  <CardHeader className="bg-neutral-50 border-b border-neutral-200">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <CardTitle className="text-lg">Order #{order.id}</CardTitle>
                        <p className="text-sm text-neutral-500 mt-1">
                          {order.createdAt ? format(new Date(order.createdAt), 'MMM d, yyyy - h:mm a') : 'Processing'}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${getStatusColor(order.status as OrderStatus)}`}>
                          {order.status}
                        </span>
                        <Price value={order.total} />
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-0">
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="items" className="border-0">
                        <AccordionTrigger className="px-6 py-4 hover:bg-neutral-50">
                          <span className="font-medium">Order Details</span>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-4">
                          <div className="space-y-3">
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="bg-neutral-50 border-b border-neutral-200">
                                    <th className="px-4 py-2 text-left">Item</th>
                                    <th className="px-4 py-2 text-right">Quantity</th>
                                    <th className="px-4 py-2 text-right">Price</th>
                                    <th className="px-4 py-2 text-right">Subtotal</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {order.items.map((item, index) => (
                                    <tr key={index} className="border-b border-neutral-100">
                                      <td className="px-4 py-3">
                                        <div className="flex items-center">
                                          <img 
                                            src={item.menuItem.imageUrl} 
                                            alt={item.menuItem.name} 
                                            className="w-10 h-10 rounded-md object-cover mr-3" 
                                          />
                                          <div>
                                            <p className="font-medium text-neutral-900">{item.menuItem.name}</p>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-4 py-3 text-neutral-700 text-right">{item.quantity}</td>
                                      <td className="px-4 py-3 text-neutral-700 text-right">
                                        <Price value={item.menuItem.price} size="sm" />
                                      </td>
                                      <td className="px-4 py-3 text-neutral-900 font-medium text-right">
                                        <Price value={item.menuItem.price * item.quantity} size="sm" />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            
                            <div className="mt-4 text-sm">
                              <div className="flex justify-between py-1">
                                <span className="text-neutral-600">Subtotal</span>
                                <Price value={order.total - 2.99} size="sm" />
                              </div>
                              <div className="flex justify-between py-1">
                                <span className="text-neutral-600">Delivery Fee</span>
                                <Price value={2.99} size="sm" />
                              </div>
                              <div className="flex justify-between py-1 font-medium">
                                <span className="text-neutral-900">Total</span>
                                <Price value={order.total} size="sm" className="font-medium" />
                              </div>
                            </div>
                            
                            {order.address && (
                              <div className="mt-4 p-3 bg-neutral-50 rounded-md text-sm">
                                <p className="font-medium mb-1">Delivery Address</p>
                                <p className="text-neutral-700">{order.address}</p>
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      
      <Footer />
      <CartSidebar />
    </div>
  );
}
