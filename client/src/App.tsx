import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { CartProvider } from "@/context/cart-context";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import CheckoutPage from "@/pages/checkout-page";
import OrdersPage from "@/pages/orders-page";
import OrderSuccessPage from "@/pages/order-success-page";
import MenuManagement from "@/pages/admin/menu-management";
import OrderManagement from "@/pages/admin/order-management";
import NotFound from "@/pages/not-found";
import { ProtectedRoute, AdminRoute } from "@/lib/protected-route";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/checkout" component={CheckoutPage} />
      <ProtectedRoute path="/orders" component={OrdersPage} />
      <ProtectedRoute path="/order-success/:orderId" component={OrderSuccessPage} />
      <AdminRoute path="/admin/menu" component={MenuManagement} />
      <AdminRoute path="/admin/orders" component={OrderManagement} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
