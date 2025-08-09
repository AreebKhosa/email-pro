import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { Link } from "wouter";

export default function SharedHeader() {
  return (
    <div className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Mail className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900">EmailReach Pro</span>
            </div>
          </Link>
          <div className="flex items-center space-x-4">
            <Link href="/about" className="text-slate-600 hover:text-slate-900 px-3 py-2 text-sm font-medium">About</Link>
            <Link href="/careers" className="text-slate-600 hover:text-slate-900 px-3 py-2 text-sm font-medium">Careers</Link>
            <Link href="/contact" className="text-slate-600 hover:text-slate-900 px-3 py-2 text-sm font-medium">Contact</Link>
            <Link href="/login">
              <Button>Login</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}