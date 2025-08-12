import { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  Home, 
  Mail, 
  Users, 
  Settings, 
  BarChart3, 
  Zap, 
  UserCheck, 
  Palette, 
  ChevronLeft, 
  ChevronRight,
  LogOut,
  Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarProps {
  className?: string;
}

const navigation = [
  { name: "Dashboard", href: "/", iconName: "Home" },
  { name: "Campaigns", href: "/campaigns", iconName: "Mail" },
  { name: "Recipients", href: "/recipients", iconName: "Users" },
  { name: "Email Integrations", href: "/email-integrations", iconName: "UserCheck" },
  { name: "Personalization", href: "/personalization", iconName: "Palette" },
  { name: "Warm-up", href: "/warm-up", iconName: "Zap" },
  { name: "Deliverability", href: "/deliverability", iconName: "BarChart3" },
  { name: "Settings", href: "/settings", iconName: "Settings" },
];

export default function Sidebar({ className }: SidebarProps) {
  const [location] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="md:hidden fixed top-4 left-4 z-50"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed left-0 top-0 h-full bg-white border-r border-gray-200 transition-all duration-300 z-40",
          isCollapsed ? "w-16" : "w-64",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          {!isCollapsed && (
            <h1 className="text-xl font-bold text-gray-900">EmailSaaS</h1>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex h-8 w-8 p-0"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2">
          <ul className="space-y-1">
            {navigation.map((item) => {
              const isActive = location === item.href || 
                (item.href !== "/" && location.startsWith(item.href));
              
              return (
                <li key={item.name}>
                  <Link href={item.href}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start gap-3 h-10",
                        isActive 
                          ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700" 
                          : "text-gray-700 hover:bg-gray-50",
                        isCollapsed && "justify-center px-2"
                      )}
                      onClick={() => setIsMobileOpen(false)}
                    >
                      {item.iconName === "Home" && <Home className="h-5 w-5 flex-shrink-0" />}
                      {item.iconName === "Mail" && <Mail className="h-5 w-5 flex-shrink-0" />}
                      {item.iconName === "Users" && <Users className="h-5 w-5 flex-shrink-0" />}
                      {item.iconName === "UserCheck" && <UserCheck className="h-5 w-5 flex-shrink-0" />}
                      {item.iconName === "Palette" && <Palette className="h-5 w-5 flex-shrink-0" />}
                      {item.iconName === "Zap" && <Zap className="h-5 w-5 flex-shrink-0" />}
                      {item.iconName === "BarChart3" && <BarChart3 className="h-5 w-5 flex-shrink-0" />}
                      {item.iconName === "Settings" && <Settings className="h-5 w-5 flex-shrink-0" />}
                      {!isCollapsed && (
                        <span className="truncate">{item.name}</span>
                      )}
                    </Button>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Logout button at bottom */}
        <div className="p-2 border-t border-gray-200">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className={cn(
              "w-full justify-start gap-3 h-10 text-red-600 hover:bg-red-50 hover:text-red-700",
              isCollapsed && "justify-center px-2"
            )}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span>Logout</span>}
          </Button>
        </div>
      </div>

      {/* Spacer for main content */}
      <div
        className={cn(
          "hidden md:block transition-all duration-300",
          isCollapsed ? "w-16" : "w-64"
        )}
      />
    </>
  );
}