import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import SharedHeader from "@/components/SharedHeader";
import SharedFooter from "@/components/SharedFooter";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Check, 
  X, 
  Crown, 
  Zap, 
  Shield, 
  CreditCard, 
  TrendingUp, 
  Users, 
  Mail, 
  Infinity,
  CheckCircle,
  AlertTriangle
} from "lucide-react";

const plans = [
  {
    id: "demo",
    name: "Demo",
    price: 0,
    priceLabel: "Free",
    description: "Perfect for testing",
    features: [
      "1,000 emails/month",
      "300 recipients/month",
      "1 email integration", 
      "100 deliverability checks",
      "30 personalized emails/month",
      "Max 3 campaigns",
      "No follow-ups",
      "1 warm-up email"
    ],
    limitations: [
      "No follow-ups",
      "Limited campaigns",
      "Basic support"
    ],
    popular: false,
    current: false
  },
  {
    id: "starter",
    name: "Starter",
    price: 14.99,
    priceLabel: "$14.99/mo",
    description: "Great for growing businesses",
    features: [
      "50,000 emails/month",
      "25,000 recipients/month",
      "10 email integrations",
      "10,000 deliverability checks",
      "5,000 personalized emails/month", 
      "Unlimited campaigns",
      "1 follow-up sequence",
      "10 warm-up emails"
    ],
    limitations: [],
    popular: true,
    current: false
  },
  {
    id: "premium",
    name: "Premium",
    price: 29.99,
    priceLabel: "$29.99/mo",
    description: "Unlimited everything",
    features: [
      "Unlimited emails",
      "Unlimited recipients",
      "Unlimited integrations", 
      "Unlimited deliverability checks",
      "Unlimited personalized emails",
      "Unlimited campaigns",
      "2 follow-up sequences",
      "Unlimited warm-up emails"
    ],
    limitations: [],
    popular: false,
    current: false,
    enterprise: true
  }
];

export default function Upgrade() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<string>("");

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: dashboardData } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    retry: false,
  });

  const createSubscriptionMutation = useMutation({
    mutationFn: async (plan: string) => {
      const response = await apiRequest("POST", "/api/create-subscription", { plan });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUpgrade = (planId: string) => {
    if (planId === "demo") {
      toast({
        title: "Info",
        description: "You're already on the Demo plan",
        variant: "default",
      });
      return;
    }
    
    setSelectedPlan(planId);
    createSubscriptionMutation.mutate(planId);
  };

  const currentPlan = user?.plan || 'demo';
  const usage = dashboardData?.usage || {};
  const limits = dashboardData?.planLimits || {};

  // Update current plan in plans array
  const plansWithCurrent = plans.map(plan => ({
    ...plan,
    current: plan.id === currentPlan
  }));

  const calculateUsagePercentage = (used: number, limit: number) => {
    if (limit === Infinity || limit === 0) return 0;
    return Math.min((used / limit) * 100, 100);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <SharedHeader />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-900">Choose Your Plan</h1>
            <p className="text-slate-600 mt-2">Upgrade to unlock more features and higher limits</p>
          </div>

          {/* Current Plan Status */}
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span>Current Plan: {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}</span>
              </CardTitle>
              <CardDescription>Your current usage and limits</CardDescription>
            </CardHeader>
            <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Emails Sent</span>
                  <span>{usage.emailsSent || 0} / {limits.emailsPerMonth === Infinity ? '∞' : limits.emailsPerMonth || 0}</span>
                </div>
                <Progress value={calculateUsagePercentage(usage.emailsSent || 0, limits.emailsPerMonth || 0)} className="h-2" />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Recipients</span>
                  <span>{usage.recipientsUploaded || 0} / {limits.recipientsPerMonth === Infinity ? '∞' : limits.recipientsPerMonth || 0}</span>
                </div>
                <Progress value={calculateUsagePercentage(usage.recipientsUploaded || 0, limits.recipientsPerMonth || 0)} className="h-2" />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Deliverability</span>
                  <span>{usage.deliverabilityChecks || 0} / {limits.deliverabilityChecks === Infinity ? '∞' : limits.deliverabilityChecks || 0}</span>
                </div>
                <Progress value={calculateUsagePercentage(usage.deliverabilityChecks || 0, limits.deliverabilityChecks || 0)} className="h-2" />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Personalized</span>
                  <span>{usage.personalizedEmails || 0} / {limits.personalizedEmails === Infinity ? '∞' : limits.personalizedEmails || 0}</span>
                </div>
                <Progress value={calculateUsagePercentage(usage.personalizedEmails || 0, limits.personalizedEmails || 0)} className="h-2" />
              </div>
            </div>
            </CardContent>
          </Card>

          {/* Plan Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {plansWithCurrent.map((plan) => (
            <Card 
              key={plan.id}
              className={`relative ${
                plan.popular 
                  ? 'border-primary shadow-lg scale-105' 
                  : plan.current
                  ? 'border-green-500 bg-green-50'
                  : 'border-slate-200'
              } ${
                plan.enterprise 
                  ? 'bg-gradient-to-b from-yellow-50 to-orange-50 border-yellow-200'
                  : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">
                    Recommended
                  </Badge>
                </div>
              )}
              
              {plan.current && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-green-500 text-white">
                    Current Plan
                  </Badge>
                </div>
              )}

              {plan.enterprise && (
                <div className="absolute -top-3 right-3">
                  <Crown className="h-6 w-6 text-yellow-500" />
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl flex items-center justify-center space-x-2">
                  {plan.enterprise && <Crown className="h-5 w-5 text-yellow-500" />}
                  <span>{plan.name}</span>
                </CardTitle>
                <div className="mt-4">
                  <span className="text-3xl font-bold text-slate-900">{plan.priceLabel}</span>
                  {plan.price > 0 && <span className="text-slate-500 ml-1">/ month</span>}
                </div>
                <CardDescription className="mt-2">{plan.description}</CardDescription>
              </CardHeader>
              
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-sm">
                      <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                  {plan.limitations.map((limitation, index) => (
                    <li key={index} className="flex items-center text-sm text-slate-500">
                      <X className="h-4 w-4 text-red-500 mr-3 flex-shrink-0" />
                      <span>{limitation}</span>
                    </li>
                  ))}
                </ul>

                <Button 
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={plan.current || createSubscriptionMutation.isPending}
                  className={`w-full ${
                    plan.current
                      ? 'bg-slate-100 text-slate-600 cursor-not-allowed'
                      : plan.popular
                      ? 'bg-primary hover:bg-primary/90'
                      : plan.enterprise
                      ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600'
                      : 'bg-slate-600 hover:bg-slate-700'
                  }`}
                >
                  {plan.current 
                    ? "Current Plan" 
                    : createSubscriptionMutation.isPending && selectedPlan === plan.id
                    ? "Processing..."
                    : plan.id === "demo" 
                    ? "Downgrade" 
                    : "Upgrade Now"
                  }
                </Button>
              </CardContent>
            </Card>
          ))}
          </div>

          {/* Payment Security */}
          <Card className="bg-slate-50 border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-center space-x-8 text-slate-600">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <span className="text-sm">SSL Encrypted</span>
              </div>
              <div className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5 text-green-600" />
                <span className="text-sm">Secure Payment with Stripe</span>
              </div>
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                <span className="text-sm">Cancel Anytime</span>
              </div>
            </div>
            </CardContent>
          </Card>

          {/* Feature Comparison */}
          <Card>
          <CardHeader>
            <CardTitle>Feature Comparison</CardTitle>
            <CardDescription>Compare features across all plans</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4">Feature</th>
                    <th className="text-center p-4">Demo</th>
                    <th className="text-center p-4">Starter</th>
                    <th className="text-center p-4">Pro</th>
                    <th className="text-center p-4">Premium</th>
                  </tr>
                </thead>
                <tbody className="space-y-2">
                  <tr className="border-b">
                    <td className="p-4 font-medium">Monthly Emails</td>
                    <td className="text-center p-4">1,000</td>
                    <td className="text-center p-4">20,000</td>
                    <td className="text-center p-4">75,000</td>
                    <td className="text-center p-4">
                      <Infinity className="h-4 w-4 mx-auto" />
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4 font-medium">Recipients</td>
                    <td className="text-center p-4">300</td>
                    <td className="text-center p-4">6,000</td>
                    <td className="text-center p-4">25,000</td>
                    <td className="text-center p-4">
                      <Infinity className="h-4 w-4 mx-auto" />
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4 font-medium">Email Integrations</td>
                    <td className="text-center p-4">1</td>
                    <td className="text-center p-4">4</td>
                    <td className="text-center p-4">20</td>
                    <td className="text-center p-4">
                      <Infinity className="h-4 w-4 mx-auto" />
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4 font-medium">Follow-ups</td>
                    <td className="text-center p-4">
                      <X className="h-4 w-4 text-red-500 mx-auto" />
                    </td>
                    <td className="text-center p-4">1</td>
                    <td className="text-center p-4">1</td>
                    <td className="text-center p-4">2</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4 font-medium">Email Warm-up Limit</td>
                    <td className="text-center p-4">1</td>
                    <td className="text-center p-4">10</td>
                    <td className="text-center p-4">
                      <Check className="h-4 w-4 text-green-500 mx-auto" />
                    </td>
                    <td className="text-center p-4">
                      <Check className="h-4 w-4 text-green-500 mx-auto" />
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4 font-medium">AI Personalization</td>
                    <td className="text-center p-4">30/month</td>
                    <td className="text-center p-4">1,000/month</td>
                    <td className="text-center p-4">1,000/month</td>
                    <td className="text-center p-4">1,000/month</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4 font-medium">Email Warm-up</td>
                    <td className="text-center p-4">Basic</td>
                    <td className="text-center p-4">
                      <Check className="h-4 w-4 text-green-500 mx-auto" />
                    </td>
                    <td className="text-center p-4">
                      <Check className="h-4 w-4 text-green-500 mx-auto" />
                    </td>
                    <td className="text-center p-4">
                      <Check className="h-4 w-4 text-green-500 mx-auto" />
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4 font-medium">Priority Support</td>
                    <td className="text-center p-4">
                      <X className="h-4 w-4 text-red-500 mx-auto" />
                    </td>
                    <td className="text-center p-4">
                      <X className="h-4 w-4 text-red-500 mx-auto" />
                    </td>
                    <td className="text-center p-4">
                      <Check className="h-4 w-4 text-green-500 mx-auto" />
                    </td>
                    <td className="text-center p-4">
                      <Check className="h-4 w-4 text-green-500 mx-auto" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            </CardContent>
          </Card>

          {/* FAQ */}
          <Card>
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-medium text-slate-900 mb-2">Can I change my plan anytime?</h3>
              <p className="text-sm text-slate-600">Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.</p>
            </div>
            
            <div>
              <h3 className="font-medium text-slate-900 mb-2">What happens to my data if I downgrade?</h3>
              <p className="text-sm text-slate-600">Your data is preserved, but you'll have reduced limits. You can upgrade again to regain full access.</p>
            </div>
            
            <div>
              <h3 className="font-medium text-slate-900 mb-2">Do you offer refunds?</h3>
              <p className="text-sm text-slate-600">Yes, we offer a 30-day money-back guarantee for all paid plans. Contact support for assistance.</p>
            </div>
            
            <div>
              <h3 className="font-medium text-slate-900 mb-2">Are there any setup fees?</h3>
              <p className="text-sm text-slate-600">No, there are no setup fees or hidden charges. You only pay the monthly subscription fee.</p>
            </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <SharedFooter />
    </div>
  );
}
