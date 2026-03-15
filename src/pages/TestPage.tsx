import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Menu, X, Home, Settings, Users, BarChart3, FileText } from "lucide-react";

const menuItems = [
  { title: "Overview", section: "overview", icon: Home },
  { title: "Setup", section: "setup", icon: Settings },
  { title: "Products", section: "products", icon: FileText },
  { title: "Orders", section: "orders", icon: BarChart3 },
  { title: "Account", section: "account", icon: Users },
];

export default function TestPage() {
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const currentSection = urlParams.get("section") || "overview";
  const [drawerOpen, setDrawerOpen] = useState(false);

  const currentTitle = menuItems.find((item) => item.section === currentSection)?.title || "Overview";

  const isActive = (section: string) => currentSection === section;

  const navContent = (mobile = false) => (
    <nav className={`flex flex-col ${mobile ? "gap-0" : "gap-1"}`}>
      {menuItems.map((item) => (
        <NavLink
          key={item.section}
          to={`/test?section=${item.section}`}
          onClick={() => setDrawerOpen(false)}
          className={`flex items-center transition-colors ${
            mobile
              ? `px-5 py-4 rounded-2xl text-[17px] tracking-wide ${
                  isActive(item.section)
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground/60"
                }`
              : `gap-3 px-4 py-3 rounded-lg text-sm ${
                  isActive(item.section)
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`
          }`}
        >
          {!mobile && <item.icon className="h-4 w-4 shrink-0" />}
          <span>{item.title}</span>
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop/iPad sidebar — hidden on mobile */}
      <aside className="hidden md:flex flex-col w-56 border-r border-border bg-background sticky top-[57px] h-[calc(100vh-57px)] p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-4">Menu</p>
        {navContent()}
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile sticky header with hamburger — visible only on mobile */}
        <div className="md:hidden fixed top-[57px] left-0 right-0 z-40 bg-background border-b border-border px-4 py-2.5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="p-1.5 rounded-md hover:bg-muted"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-semibold text-sm">{currentTitle}</span>
        </div>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-8">
          <h1 className="text-2xl font-bold mb-4">{currentTitle}</h1>
          <p className="text-muted-foreground">This is the {currentTitle.toLowerCase()} section.</p>
        </main>
      </div>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close menu overlay"
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute top-0 left-0 h-full w-64 bg-background border-r border-border shadow-lg">
            <div className="flex justify-end p-4">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="p-2 rounded-md hover:bg-muted"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-col gap-2 px-4 pb-4">
              {menuItems.map((item) => (
                <NavLink
                  key={item.section}
                  to={`/test?section=${item.section}`}
                  onClick={() => setDrawerOpen(false)}
                  className={`px-4 py-3 rounded-lg transition-colors ${
                    isActive(item.section)
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <span>{item.title}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
