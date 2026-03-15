import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { SupportChat } from "./SupportChat";

export const Footer = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <>
      <footer className="border-t bg-card text-foreground mt-auto">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-6">
              <Link to="/privacy" className="text-sm">
                Privacy
              </Link>
              <Link to="/terms" className="text-sm">
                Terms and Conditions
              </Link>
            </div>
            <button 
              onClick={() => setIsChatOpen(true)}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2 text-sm cursor-pointer"
            >
              <span className="text-muted-foreground">Questions and/or comments?</span>
              <span className="flex items-center gap-2">
                <span className="underline">We'd love to hear from you.</span>
                <MessageCircle className="h-4 w-4" />
              </span>
            </button>
          </div>
        </div>
      </footer>

      <SupportChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </>
  );
};