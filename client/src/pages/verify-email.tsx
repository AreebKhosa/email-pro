import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, CheckCircle, RefreshCw } from "lucide-react";

export default function VerifyEmail() {
  const [email, setEmail] = useState("");

  useEffect(() => {
    // Get the email from localStorage if available
    const pendingEmail = localStorage.getItem('pendingVerificationEmail');
    if (pendingEmail) {
      setEmail(pendingEmail);
    }
  }, []);

  const handleResendEmail = () => {
    // You can implement resend functionality here if needed
    console.log("Resending verification email to:", email);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Mail className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl text-slate-800">Check Your Email</CardTitle>
          <CardDescription className="text-slate-600">
            We've sent a verification link to{email && (
              <span className="block font-semibold text-slate-800 mt-1">{email}</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Next Steps:</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-700">
                  <li>Check your email inbox</li>
                  <li>Click the verification link</li>
                  <li>Return here to login</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="text-sm text-slate-600 text-center">
            <p>Didn't receive the email? Check your spam folder or</p>
            <Button 
              variant="link" 
              className="p-0 h-auto text-blue-600"
              onClick={handleResendEmail}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              resend verification email
            </Button>
          </div>

          <div className="pt-4 space-y-3">
            <Link href="/login">
              <Button className="w-full" size="lg">
                Go to Login
              </Button>
            </Link>
            
            <Link href="/">
              <Button variant="outline" className="w-full" size="lg">
                Back to Home
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}