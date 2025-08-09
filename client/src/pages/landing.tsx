import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, 
  Users, 
  TrendingUp, 
  Zap, 
  Shield, 
  CheckCircle,
  ArrowRight,
  Star,
  Clock,
  Target,
  BarChart3,
  Globe,
  Sparkles,
  Crown
} from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = '/login';
  };

  const features = [
    {
      icon: <Mail className="h-8 w-8 text-blue-600" />,
      title: "Smart Email Campaigns",
      description: "Create and manage professional email campaigns with AI-powered personalization and advanced tracking capabilities."
    },
    {
      icon: <Users className="h-8 w-8 text-green-600" />,
      title: "Recipient Management",
      description: "Organize and segment your audience with powerful recipient list management tools and CSV import functionality."
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-purple-600" />,
      title: "Advanced Analytics",
      description: "Track opens, clicks, and engagement with detailed analytics and real-time campaign performance insights."
    },
    {
      icon: <Zap className="h-8 w-8 text-yellow-600" />,
      title: "Email Warm-up",
      description: "Gradually increase your sending reputation with automated email warm-up sequences to improve deliverability."
    },
    {
      icon: <Shield className="h-8 w-8 text-red-600" />,
      title: "Deliverability Checks",
      description: "Ensure your emails reach the inbox with comprehensive deliverability testing and spam score analysis."
    },
    {
      icon: <Target className="h-8 w-8 text-indigo-600" />,
      title: "AI Personalization",
      description: "Leverage AI to create personalized email content that resonates with each recipient for higher engagement."
    }
  ];

  const stats = [
    { value: "1M+", label: "Emails Delivered", icon: <Mail className="h-6 w-6" /> },
    { value: "99.5%", label: "Uptime", icon: <Shield className="h-6 w-6" /> },
    { value: "50K+", label: "Active Users", icon: <Users className="h-6 w-6" /> },
    { value: "150+", label: "Countries", icon: <Globe className="h-6 w-6" /> }
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      company: "TechStart Inc.",
      role: "Marketing Director",
      content: "EmailReach Pro has revolutionized our email marketing. The AI personalization increased our open rates by 40%.",
      rating: 5
    },
    {
      name: "Michael Chen",
      company: "Growth Marketing Co.",
      role: "CEO",
      content: "The warm-up feature alone saved us months of reputation building. Incredible deliverability rates.",
      rating: 5
    },
    {
      name: "Emily Rodriguez",
      company: "Scale Digital",
      role: "Growth Manager",
      content: "Best email marketing platform we've used. The analytics and tracking features are top-notch.",
      rating: 5
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
        "100 deliverability checks",
        "30 personalized emails/month",
        "Max 3 campaigns",
        "No follow-ups",
        "Email support"
      ],
      limitations: ["No follow-ups", "Limited campaigns"],
      highlighted: false,
      cta: "Start Free"
    },
    {
      name: "Starter",
      price: "$14.99",
      priceUnit: "/month",
      description: "Great for growing businesses",
      features: [
        "50,000 emails/month",
        "25,000 recipients/month",
        "10 email integrations",
        "10,000 deliverability checks",
        "5,000 personalized emails/month",
        "Unlimited campaigns",
        "Unlimited follow-ups",
        "Unlimited warm-up emails",
        "Priority support"
      ],
      limitations: [],
      highlighted: true,
      cta: "Get Started"
    },
    {
      name: "Premium",
      price: "$29.99",
      priceUnit: "/month",
      description: "Unlimited everything",
      features: [
        "Unlimited emails",
        "Unlimited recipients",
        "Unlimited integrations",
        "Unlimited deliverability checks",
        "Unlimited personalized emails",
        "Unlimited campaigns",
        "Unlimited follow-ups",
        "Unlimited warm-up emails",
        "White-label options",
        "24/7 priority support",
        "Dedicated account manager"
      ],
      limitations: [],
      highlighted: false,
      cta: "Go Premium",
      enterprise: true
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Mail className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold text-gray-900">EmailReach</span>
                <span className="text-sm text-blue-600 font-semibold ml-1">Pro</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={handleLogin} className="hidden sm:inline-flex">
                Sign In
              </Button>
              <Button onClick={handleLogin} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center">
            <Badge className="mb-6 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 border-blue-200 hover:bg-blue-200">
              <Sparkles className="h-4 w-4 mr-2" />
              AI-Powered Email Marketing Platform
            </Badge>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              Scale Your Email
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 block">
                Outreach Intelligently
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-4xl mx-auto leading-relaxed">
              Send personalized email campaigns at scale with AI-powered personalization, smart warm-up pools, 
              and advanced deliverability tools. Trusted by 50,000+ businesses worldwide.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button 
                size="lg" 
                onClick={handleLogin}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8 py-4 h-auto"
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="text-lg px-8 py-4 h-auto border-2 hover:bg-gray-50"
              >
                Watch Demo
                <Clock className="ml-2 h-5 w-5" />
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                No credit card required
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                Setup in 2 minutes
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                Cancel anytime
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white border-y">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="flex justify-center mb-2 text-blue-600">
                  {stat.icon}
                </div>
                <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">{stat.value}</div>
                <div className="text-gray-600 text-sm md:text-base">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">
              Everything you need to succeed
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Powerful features designed to help you create, send, and optimize email campaigns that drive real results.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50">
                      {feature.icon}
                    </div>
                    <CardTitle className="text-xl font-semibold">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600 text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">
              Trusted by industry leaders
            </h2>
            <p className="text-xl text-gray-600">
              See what our customers are saying about EmailReach Pro
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-0 shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-600 mb-6 italic">"{testimonial.content}"</p>
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-500">{testimonial.role}, {testimonial.company}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">
              Simple, transparent pricing
            </h2>
            <p className="text-xl text-gray-600">
              Choose the plan that fits your business needs. Start free, scale as you grow.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {plans.map((plan, index) => (
              <Card 
                key={index} 
                className={`relative transition-all duration-300 ${
                  plan.highlighted 
                    ? 'border-blue-500 shadow-2xl scale-105 bg-white' 
                    : plan.enterprise
                    ? 'border-purple-300 shadow-xl bg-gradient-to-br from-purple-50 to-blue-50'
                    : 'border-gray-200 shadow-lg hover:shadow-xl hover:-translate-y-1'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                      Most Popular
                    </Badge>
                  </div>
                )}
                {plan.enterprise && (
                  <div className="absolute -top-2 -right-2">
                    <Crown className="h-8 w-8 text-purple-600" />
                  </div>
                )}
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    {plan.priceUnit && <span className="text-gray-500">{plan.priceUnit}</span>}
                  </div>
                  <CardDescription className="mt-2 text-base">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className={`w-full ${
                      plan.highlighted 
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white' 
                        : plan.enterprise
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
                        : 'bg-gray-900 hover:bg-gray-800 text-white'
                    }`}
                    onClick={handleLogin}
                  >
                    {plan.cta}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-12">
            <p className="text-gray-500 mb-4">Need a custom solution?</p>
            <Button variant="outline" size="lg">
              Contact Sales
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="max-w-5xl mx-auto text-center px-4 sm:px-6 lg:px-8 relative">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to transform your email marketing?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            Join 50,000+ businesses that trust EmailReach Pro for their email marketing needs. 
            Start your free trial today and see the difference AI-powered personalization can make.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={handleLogin}
              className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-4 h-auto font-semibold"
            >
              Start Your Free Trial Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-blue-600 text-lg px-8 py-4 h-auto"
            >
              Schedule Demo
            </Button>
          </div>
          <div className="flex items-center justify-center mt-8 text-blue-100">
            <CheckCircle className="h-5 w-5 mr-2" />
            30-day money-back guarantee
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Mail className="h-6 w-6 text-white" />
                </div>
                <div>
                  <span className="text-xl font-bold text-white">EmailReach</span>
                  <span className="text-sm text-blue-400 font-semibold ml-1">Pro</span>
                </div>
              </div>
              <p className="text-gray-400 mb-4 max-w-md">
                The most advanced email marketing platform for modern businesses. 
                Scale your outreach with AI-powered personalization and smart automation.
              </p>
              <div className="flex space-x-4">
                <Badge variant="secondary" className="bg-gray-800 text-gray-300">
                  SOC 2 Compliant
                </Badge>
                <Badge variant="secondary" className="bg-gray-800 text-gray-300">
                  GDPR Ready
                </Badge>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4">Product</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4">Company</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-gray-800">
            <div className="flex space-x-6 text-sm mb-4 md:mb-0">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Security</a>
            </div>
            <div className="text-sm text-gray-500">
              © 2025 EmailReach Pro. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}