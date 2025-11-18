import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { GlobalHeader } from "@/components/GlobalHeader";
import { Footer } from "@/components/Footer";
import { ShoppingCartProvider } from "@/contexts/ShoppingCartContext";
import { ShoppingCart } from "@/components/shopping/ShoppingCart";
import ScrollToTop from "@/components/ScrollToTop";
import Homepage from "./pages/Homepage";
import Test from "./pages/Test";
import Test2 from "./pages/Test2";
import CategoryProducts from "./pages/CategoryProducts";
import VendorDuplicate from "./pages/VendorDuplicate";
import Likes from "./pages/Likes";
import Orders from "./pages/Orders";
import NotFound from "./pages/NotFound";
import OrderSuccess from "./pages/OrderSuccess";
import ShopManager2 from "./pages/ShopManager2";
import Report from "./pages/Report";
import Messages from "./pages/Messages";
import Conversation from "./pages/Conversation";

import Commissions from "./pages/Commissions";
import Checkout from "./pages/Checkout";
import AccountSettings from "./pages/AccountSettings";
import Auth from "./pages/Auth";
import Analytics from "./pages/Analytics";
import Profile from "./pages/Profile";
import SubmitMarket from "./pages/SubmitMarket";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ShoppingCartProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <div className="min-h-screen flex flex-col">
            <GlobalHeader />
            <ShoppingCart />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<Test2 />} />
                <Route path="/test" element={<Test />} />
                <Route path="/homepage" element={<Homepage />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/search" element={<CategoryProducts />} />
                <Route path="/market" element={<VendorDuplicate />} />
                <Route path="/market/:marketSlug" element={<VendorDuplicate />} />
                <Route path="/vendor/:vendorSlug" element={<VendorDuplicate />} />
                <Route path="/likes" element={<Likes />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/account" element={<AccountSettings />} />
                <Route path="/order-success" element={<OrderSuccess />} />
                <Route path="/shop-manager" element={<ShopManager2 />} />
                <Route path="/my-shop" element={<ShopManager2 />} />
                <Route path="/commissions" element={<Commissions />} />
                <Route path="/report" element={<Report />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/messages/:conversationId" element={<Conversation />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/profile/:userId" element={<Profile />} />
                <Route path="/submit-market" element={<SubmitMarket />} />
                
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
