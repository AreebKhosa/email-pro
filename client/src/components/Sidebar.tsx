import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  Mail, 
  BarChart3, 
  Rocket, 
  Users, 
  MailOpen, 
  Flame, 
  Shield, 
  Sparkles, 
  Crown, 
  Settings,
  MoreVertical
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Campaigns", href: "/campaigns", icon: Rocket },
  { name: "Recipients", href: "/recipients", icon: Users },
  { name: "Email Integrations", href: "/email-integrations", icon: MailOpen },
  { name: "Warm-up", href: "/warm-up", icon: Flame },
  { name: "Deliverability", href: "/deliverability", icon: Shield },
  { name: "Personalization", href: "/personalization", icon: Sparkles },
];

const bottomNavigation = [
  { name: "Upgrade Plan", href: "/upgrade", icon: Crown },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const { user } = useAuth();
  const [location] = useLocation();

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <aside className="w-64 bg-white shadow-sm border-r border-slate-200 fixed h-full overflow-y-auto">
      {/* Logo & Brand */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Mail className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-xl text-slate-900">EmailReach</h1>
            <p className="text-sm text-slate-500">Pro</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="px-4 py-6 space-y-2">
        {navigation.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.name} href={item.href}>
              <a
                className={cn(
                  "flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-slate-700 hover:bg-slate-100"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </a>
            </Link>
          );
        })}
        
        <div className="pt-4 border-t border-slate-200 mt-4">
          {bottomNavigation.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <a
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-slate-700 hover:bg-slate-100"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </a>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User Profile */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 bg-white">
        <div className="flex items-center space-x-3">
          <img 
            src={user?.profileImageUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"} 
            alt="User profile" 
            className="w-10 h-10 rounded-full object-cover"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900">
              {user?.firstName && user?.lastName 
                ? `${user.firstName} ${user.lastName}`
                : user?.email?.split('@')[0] || 'User'
              }
            </p>
            <p className="text-xs text-slate-500 capitalize">
              {user?.plan || 'Demo'} Plan
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
