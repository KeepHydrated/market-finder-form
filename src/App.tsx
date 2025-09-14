import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { GlobalHeader } from "@/components/GlobalHeader";
import { ShoppingCartProvider } from "@/contexts/ShoppingCartContext";
import { ShoppingCart } from "@/components/shopping/ShoppingCart";
import Index from "./pages/Index";
import Submissions from "./pages/Submissions";
import Homepage from "./pages/Homepage";
import Vendor from "./pages/Vendor";
import Likes from "./pages/Likes";
import NotFound from "./pages/NotFound";
import OrderSuccess from "./pages/OrderSuccess";
import ShopManager from "./pages/ShopManager";
import Markets from "./pages/Markets";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ShoppingCartProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <GlobalHeader />
          <ShoppingCart />
          <Routes>
            <Route path="/" element={<Navigate to="/profile" replace />} />
            <Route path="/profile" element={<Index />} />
            <Route path="/submissions" element={<Submissions />} />
            <Route path="/homepage" element={<Homepage />} />
            <Route path="/vendor" element={<Vendor />} />
            <Route path="/likes" element={<Likes />} />
            <Route path="/order-success" element={<OrderSuccess />} />
            <Route path="/shop-manager" element={<ShopManager />} />
            <Route path="/markets" element={<Markets />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ShoppingCartProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
