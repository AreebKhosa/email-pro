import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowRight,
  Heart,
  Award,
  Lightbulb,
  Rocket,
  Shield,
  Users
} from "lucide-react";
import { Link } from "wouter";
import SharedHeader from "@/components/SharedHeader";
import SharedFooter from "@/components/SharedFooter";

export default function About() {
  const values = [
    {
      icon: <Heart className="h-8 w-8 text-red-500" />,
      title: "Customer First",
      description: "We put our customers at the heart of everything we do, ensuring their success drives our innovation."
    },
    {
      icon: <Lightbulb className="h-8 w-8 text-yellow-500" />,
      title: "Innovation",
      description: "We continuously push boundaries with cutting-edge AI technology to transform email marketing."
    },
    {
      icon: <Shield className="h-8 w-8 text-blue-500" />,
      title: "Reliability",
      description: "Our platform delivers consistent performance with 99.9% uptime and enterprise-grade security."
    },
    {
      icon: <Users className="h-8 w-8 text-green-500" />,
      title: "Collaboration",
      description: "We believe in the power of teamwork, both within our company and with our valued customers."
    }
  ];

  const team = [
    {
      name: "Alex Johnson",
      role: "CEO & Co-Founder",
      bio: "Former VP of Marketing at TechCorp with 15+ years in email marketing and SaaS.",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
    },
    {
      name: "Sarah Chen",
      role: "CTO & Co-Founder", 
      bio: "AI researcher and former Google engineer specializing in machine learning and personalization.",
      image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face"
    },
    {
      name: "Michael Rodriguez",
      role: "VP of Engineering",
      bio: "Scalability expert who built email infrastructure serving billions of messages daily.",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
    },
    {
      name: "Emily Watson",
      role: "VP of Customer Success",
      bio: "Customer experience leader passionate about helping businesses achieve their marketing goals.",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face"
    }
  ];

  const milestones = [
    {
      year: "2021",
      title: "Company Founded",
      description: "Started with a vision to revolutionize email marketing through AI"
    },
    {
      year: "2022", 
      title: "First Million Emails",
      description: "Successfully delivered our first million emails with 99.5% deliverability"
    },
    {
      year: "2023",
      title: "AI Personalization Launch",
      description: "Launched industry-first AI-powered email personalization engine"
    },
    {
      year: "2024",
      title: "Global Expansion",
      description: "Expanded to serve customers across 150+ countries worldwide"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <SharedHeader />

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <Badge className="mb-4 bg-blue-100 text-blue-700 border-blue-200">About Us</Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-slate-900 mb-6">
              Transforming Email Marketing
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> with AI</span>
            </h1>
            <p className="text-xl text-slate-600 mb-8 leading-relaxed">
              We're on a mission to revolutionize how businesses connect with their audience through intelligent, 
              personalized email campaigns that drive real results.
            </p>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-6">Our Mission</h2>
              <p className="text-lg text-slate-600 mb-6 leading-relaxed">
                To democratize advanced email marketing technology, making AI-powered personalization 
                and deliverability optimization accessible to businesses of all sizes.
              </p>
              <p className="text-lg text-slate-600 leading-relaxed">
                We believe every business deserves the tools to build meaningful connections with 
                their audience through email marketing that actually works.
              </p>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-8 rounded-2xl text-white">
              <Rocket className="h-12 w-12 mb-4" />
              <h3 className="text-2xl font-bold mb-4">Our Vision</h3>
              <p className="text-blue-100 leading-relaxed">
                To become the world's most trusted email marketing platform, powering billions of 
                meaningful conversations between businesses and their customers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Our Values</h2>
            <p className="text-lg text-slate-600">The principles that guide everything we do</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-center mb-4">
                    {value.icon}
                  </div>
                  <CardTitle className="text-xl">{value.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Meet Our Team</h2>
            <p className="text-lg text-slate-600">The passionate people behind EmailReach Pro</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((member, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-center mb-4">
                    <img 
                      src={member.image} 
                      alt={member.name}
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  </div>
                  <CardTitle className="text-lg">{member.name}</CardTitle>
                  <CardDescription className="text-blue-600 font-medium">{member.role}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600">{member.bio}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Our Journey</h2>
            <p className="text-lg text-slate-600">Key milestones in our growth story</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {milestones.map((milestone, index) => (
              <div key={index} className="relative">
                <div className="bg-white p-6 rounded-lg border border-slate-200 hover:shadow-lg transition-shadow">
                  <div className="text-blue-600 font-bold text-lg mb-2">{milestone.year}</div>
                  <h3 className="font-semibold text-slate-900 mb-2">{milestone.title}</h3>
                  <p className="text-sm text-slate-600">{milestone.description}</p>
                </div>
                {index < milestones.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-slate-200"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Transform Your Email Marketing?</h2>
          <p className="text-xl text-blue-100 mb-8">Join thousands of businesses already using EmailReach Pro</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50">
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600">
                Contact Sales
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <SharedFooter />
    </div>
  );
}