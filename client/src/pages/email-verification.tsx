import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  RefreshCw,
  ArrowLeft
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

export default function EmailVerification() {
  const [email, setEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Get email from localStorage (stored during registration)
    const registeredEmail = localStorage.getItem('pendingVerificationEmail');
    if (registeredEmail) {
      setEmail(registeredEmail);
    } else {
      // If no email found, redirect back to signup
      setLocation('/signup');
    }
  }, [setLocation]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleResendEmail = async () => {
    if (resendCooldown > 0) return;

    setIsResending(true);
    try {
      await apiRequest("POST", "/api/auth/resend-verification", { email });
      
      toast({
        title: "Verification Email Sent",
        description: "A new verification email has been sent to your inbox.",
      });
      
      setResendCooldown(60); // 60 second cooldown
    } catch (error: any) {
      toast({
        title: "Resend Failed", 
        description: error.message || "Failed to resend verification email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleBackToSignup = () => {
    localStorage.removeItem('pendingVerificationEmail');
    setLocation('/signup');
  };

  const handleGoToLogin = () => {
    localStorage.removeItem('pendingVerificationEmail');
    setLocation('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Mail className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Check Your Email
          </CardTitle>
          <CardDescription className="text-gray-600">
            We've sent a verification link to your email address
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Email Display */}
          <div className="text-center">
            <Badge variant="secondary" className="text-sm px-3 py-1">
              <Mail className="h-4 w-4 mr-2" />
              {email}
            </Badge>
          </div>

          {/* Instructions */}
          <div className="space-y-4">
            <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Step 1: Check your inbox</p>
                <p>Look for an email from EmailReach Pro with your verification link.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 bg-green-50 rounded-lg">
              <Clock className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-green-800">
                <p className="font-medium">Step 2: Click the link</p>
                <p>Click the verification link to activate your account.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 bg-yellow-50 rounded-lg">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Check your spam folder</p>
                <p>If you don't see the email, check your spam or junk folder.</p>
              </div>
            </div>
          </div>

          {/* Resend Button */}
          <div className="space-y-4">
            <Button 
              onClick={handleResendEmail}
              disabled={isResending || resendCooldown > 0}
              variant="outline" 
              className="w-full"
            >
              {isResending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : resendCooldown > 0 ? (
                <>
                  <Clock className="h-4 w-4 mr-2" />
                  Resend in {resendCooldown}s
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Resend Verification Email
                </>
              )}
            </Button>

            <div className="text-center text-sm text-gray-500">
              Didn't receive the email? Check your spam folder or try resending.
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-4 border-t">
            <Button 
              onClick={handleGoToLogin}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              Already Verified? Sign In
            </Button>
            
            <Button 
              onClick={handleBackToSignup}
              variant="ghost" 
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sign Up
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}