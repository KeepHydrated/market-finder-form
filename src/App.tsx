import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { GlobalHeader } from "@/components/GlobalHeader";
import { Footer } from "@/components/Footer";
import { ShoppingCartProvider } from "@/contexts/ShoppingCartContext";
import { ShoppingCart } from "@/components/shopping/ShoppingCart";
import Index from "./pages/Index";
import Submissions from "./pages/Submissions";
import Submit from "./pages/Submit";
import Homepage from "./pages/Homepage";
import Vendor from "./pages/Vendor";
import VendorDuplicate from "./pages/VendorDuplicate";
import Likes from "./pages/Likes";
import NotFound from "./pages/NotFound";
import OrderSuccess from "./pages/OrderSuccess";
import ShopManager from "./pages/ShopManager";
import Markets from "./pages/Markets";
import Tet from "./pages/Tet";
import Test from "./pages/Test";
import Test2 from "./pages/Test2";
import PlacesDemo from "./pages/PlacesDemo";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ShoppingCartProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="min-h-screen flex flex-col">
            <GlobalHeader />
            <ShoppingCart />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<Navigate to="/profile" replace />} />
                <Route path="/profile" element={<Index />} />
                <Route path="/submissions" element={<Submissions />} />
                <Route path="/submit" element={<Submit />} />
                <Route path="/homepage" element={<Homepage />} />
                <Route path="/vendor/:id" element={<Vendor />} />
                <Route path="/market" element={<VendorDuplicate />} />
                <Route path="/tet" element={<Tet />} />
                <Route path="/likes" element={<Likes />} />
                <Route path="/order-success" element={<OrderSuccess />} />
                <Route path="/shop-manager" element={<ShopManager />} />
                <Route path="/markets" element={<Markets />} />
                <Route path="/test" element={<Test />} />
                <Route path="/test2" element={<Test2 />} />
                <Route path="/places-demo" element={<PlacesDemo />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </BrowserRouter>
      </ShoppingCartProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
