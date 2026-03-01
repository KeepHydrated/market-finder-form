import { MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";

export const Footer = () => {
  return (
    <footer className="border-t bg-slate-900 text-slate-300 mt-auto">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-6">
            <Link to="/privacy" className="text-sm hover:text-white transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="text-sm hover:text-white transition-colors">
              Terms and Conditions
            </Link>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400">Questions and/or comments?</span>
            <a 
              href="mailto:hello@fromfarmersmarkets.com" 
              className="underline hover:text-white transition-colors"
            >
              We'd love to hear from you.
            </a>
            <MessageCircle className="h-4 w-4" />
          </div>
        </div>
      </div>
    </footer>
  );
};