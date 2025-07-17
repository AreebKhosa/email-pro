import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Mail, Zap, Shield, Target, Crown, Users, BarChart3 } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  const features = [
    {
      icon: <Mail className="h-6 w-6" />,
      title: "Email Integration",
      description: "Connect multiple SMTP & IMAP accounts with automatic verification"
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "AI Personalization",
      description: "Generate personalized emails using website scraping and AI"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Deliverability Checker",
      description: "Verify email addresses and improve campaign success rates"
    },
    {
      icon: <Target className="h-6 w-6" />,
      title: "Smart Warm-up",
      description: "Automatically warm up your email accounts to avoid spam"
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "List Management",
      description: "Organize recipients with CSV import and list segmentation"
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: "Advanced Analytics",
      description: "Track opens, clicks, bounces, and campaign performance"
    }
  ];

  const plans = [
    {
      name: "Demo",
      price: "Free",
      description: "Perfect for testing",
      features: [
        "1,000 emails/month",
        "300 recipients/month", 
        "1 email integration",
        "150 deliverability checks",
        "No follow-ups"
      ],
      highlighted: false
    },
    {
      name: "Starter",
      price: "$14.99/mo",
      description: "Great for small teams",
      features: [
        "20,000 emails/month",
        "6,000 recipients/month",
        "4 email integrations",
        "2,000 deliverability checks",
        "1 follow-up allowed"
      ],
      highlighted: true
    },
    {
      name: "Pro",
      price: "$29.99/mo", 
      description: "Scaling businesses",
      features: [
        "75,000 emails/month",
        "25,000 recipients/month",
        "20 email integrations",
        "10,000 deliverability checks",
        "1 follow-up allowed"
      ],
      highlighted: false
    },
    {
      name: "Premium",
      price: "$49.99/mo",
      description: "Enterprise ready",
      features: [
        "Unlimited emails",
        "Unlimited recipients",
        "Unlimited integrations",
        "Unlimited checks",
        "2 follow-ups allowed"
      ],
      highlighted: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Mail className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-xl text-slate-900">EmailReach</h1>
              <p className="text-sm text-slate-500">Pro</p>
            </div>
          </div>
          <Button onClick={handleLogin} className="bg-primary hover:bg-primary/90">
            Get Started
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge variant="secondary" className="mb-4">
            AI-Powered Email Marketing
          </Badge>
          <h1 className="text-5xl font-bold text-slate-900 mb-6 leading-tight">
            Scale Your Email Outreach with
            <span className="text-primary"> Smart Automation</span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 leading-relaxed">
            Send personalized email campaigns at scale with AI-powered personalization, 
            smart warm-up pools, and advanced deliverability tools.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={handleLogin} size="lg" className="bg-primary hover:bg-primary/90">
              Start Free Trial
            </Button>
            <Button variant="outline" size="lg">
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Everything You Need for Email Success
            </h2>
            <p className="text-lg text-slate-600">
              Powerful features designed to maximize your email campaign performance
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary mb-4">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Choose Your Plan
            </h2>
            <p className="text-lg text-slate-600">
              Start free and scale as you grow
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan, index) => (
              <Card 
                key={index} 
                className={`relative ${
                  plan.highlighted 
                    ? 'border-primary shadow-lg scale-105' 
                    : 'border-slate-200'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      Recommended
                    </Badge>
                  </div>
                )}
                {plan.name === "Premium" && (
                  <div className="absolute -top-3 right-3">
                    <Crown className="h-6 w-6 text-yellow-500" />
                  </div>
                )}
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-3xl font-bold text-slate-900">{plan.price}</span>
                  </div>
                  <CardDescription className="mt-2">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center text-sm">
                        <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    onClick={handleLogin}
                    className={`w-full mt-6 ${
                      plan.highlighted 
                        ? 'bg-primary hover:bg-primary/90' 
                        : plan.name === "Premium"
                        ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600'
                        : 'bg-slate-600 hover:bg-slate-700'
                    }`}
                  >
                    {plan.name === "Demo" ? "Start Free" : "Upgrade Now"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-primary">
        <div className="container mx-auto text-center max-w-3xl">
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">
            Ready to Transform Your Email Marketing?
          </h2>
          <p className="text-xl text-primary-foreground/90 mb-8">
            Join thousands of businesses already using EmailReach Pro to scale their outreach
          </p>
          <Button 
            onClick={handleLogin}
            size="lg" 
            variant="secondary"
            className="bg-white text-primary hover:bg-white/90"
          >
            Get Started Today - It's Free!
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-slate-900 text-slate-400">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Mail className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl text-white">EmailReach Pro</span>
          </div>
          <p className="text-sm">
            © 2024 EmailReach Pro. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
