import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Search, Loader2, Filter, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Price } from "@/components/ui/price";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Order, OrderStatus } from "@shared/schema";

export default function OrderManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [sortField, setSortField] = useState<"id" | "createdAt" | "total">("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false);
  const { toast } = useToast();
  
  // Fetch all orders
  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });
  
  // Update order status mutation
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: OrderStatus }) => {
      const res = await apiRequest("PATCH", `/api/orders/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Order status updated",
        description: "The order status has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update order status",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Filter orders by search query and status
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.id.toString().includes(searchQuery) || 
      (order.address && order.address.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });
  
  // Sort filtered orders
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    let comparison = 0;
    
    if (sortField === "id") {
      comparison = a.id - b.id;
    } else if (sortField === "createdAt") {
      comparison = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    } else if (sortField === "total") {
      comparison = a.total - b.total;
    }
    
    return sortDirection === "asc" ? comparison : -comparison;
  });
  
  // Handle sort toggle
  const toggleSort = (field: "id" | "createdAt" | "total") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };
  
  // Handle view order details
  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsOrderDetailsOpen(true);
  };
  
  // Handle update order status
  const handleUpdateStatus = (id: number, status: OrderStatus) => {
    updateOrderStatusMutation.mutate({ id, status });
  };
  
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
          <h1 className="text-3xl font-bold text-neutral-900 mb-8">Order Management</h1>
          
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <CardTitle>All Orders</CardTitle>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
                    <Input
                      placeholder="Search orders..."
                      className="pl-9 w-full"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full sm:w-auto">
                        <Filter className="h-4 w-4 mr-2" />
                        {statusFilter === "all" ? "All Statuses" : `Status: ${statusFilter}`}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                        All Statuses
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setStatusFilter("pending")}>
                        Pending
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter("processing")}>
                        Processing
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter("delivering")}>
                        Delivering
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter("delivered")}>
                        Delivered
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter("cancelled")}>
                        Cancelled
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
              ) : sortedOrders.length === 0 ? (
                <div className="text-center py-10 text-neutral-500">
                  No orders found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px] cursor-pointer" onClick={() => toggleSort("id")}>
                          <div className="flex items-center">
                            Order ID
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead>Customer ID</TableHead>
                        <TableHead className="cursor-pointer" onClick={() => toggleSort("createdAt")}>
                          <div className="flex items-center">
                            Date
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="cursor-pointer" onClick={() => toggleSort("total")}>
                          <div className="flex items-center">
                            Total
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">#{order.id}</TableCell>
                          <TableCell>{order.userId}</TableCell>
                          <TableCell>
                            {order.createdAt 
                              ? format(new Date(order.createdAt), 'MMM d, yyyy - h:mm a') 
                              : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(order.status as OrderStatus)}`}>
                              {order.status}
                            </span>
                          </TableCell>
                          <TableCell><Price value={order.total} /></TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    Update Status
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem 
                                    onClick={() => handleUpdateStatus(order.id, "pending")}
                                    disabled={order.status === "pending"}
                                  >
                                    Pending
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleUpdateStatus(order.id, "processing")}
                                    disabled={order.status === "processing"}
                                  >
                                    Processing
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleUpdateStatus(order.id, "delivering")}
                                    disabled={order.status === "delivering"}
                                  >
                                    Delivering
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleUpdateStatus(order.id, "delivered")}
                                    disabled={order.status === "delivered"}
                                  >
                                    Delivered
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => handleUpdateStatus(order.id, "cancelled")}
                                    disabled={order.status === "cancelled"}
                                    className="text-red-500"
                                  >
                                    Cancel Order
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                              
                              <Button variant="outline" size="sm" onClick={() => handleViewOrder(order)}>
                                View Details
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer />
      
      {/* Order Details Dialog */}
      <Dialog open={isOrderDetailsOpen} onOpenChange={setIsOrderDetailsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Order #{selectedOrder?.id} Details</DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-neutral-500">
                    Date: {selectedOrder.createdAt 
                      ? format(new Date(selectedOrder.createdAt), 'MMM d, yyyy - h:mm a') 
                      : 'N/A'}
                  </p>
                  <p className="text-sm text-neutral-500">Customer ID: {selectedOrder.userId}</p>
                </div>
                <div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(selectedOrder.status as OrderStatus)}`}>
                    {selectedOrder.status}
                  </span>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Status</h3>
                <Select 
                  defaultValue={selectedOrder.status} 
                  onValueChange={(value) => handleUpdateStatus(selectedOrder.id, value as OrderStatus)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="delivering">Delivering</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Order Items</h3>
                <div className="border rounded-md divide-y">
                  {Array.isArray(selectedOrder.items) && selectedOrder.items.map((item: any, index: number) => (
                    <div key={index} className="p-3 flex justify-between items-center">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-neutral-500">Quantity: {item.quantity}</p>
                      </div>
                      <Price value={item.price * item.quantity} />
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="pt-2 border-t">
                <div className="flex justify-between mb-1">
                  <span className="text-neutral-600">Subtotal</span>
                  <Price value={selectedOrder.total - 2.99} />
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-neutral-600">Delivery Fee</span>
                  <Price value={2.99} />
                </div>
                <div className="flex justify-between font-medium">
                  <span>Total</span>
                  <Price value={selectedOrder.total} className="font-medium" />
                </div>
              </div>
              
              {selectedOrder.address && (
                <div className="pt-2 border-t">
                  <h3 className="font-medium mb-2">Delivery Address</h3>
                  <p className="text-neutral-600">{selectedOrder.address}</p>
                </div>
              )}
              
              {selectedOrder.paymentId && (
                <div className="pt-2 border-t">
                  <h3 className="font-medium mb-2">Payment Information</h3>
                  <p className="text-neutral-600">Payment ID: {selectedOrder.paymentId}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
