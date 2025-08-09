import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  CheckCircle,
  ArrowRight,
  Heart,
  Rocket,
  MapPin,
  DollarSign,
  Calendar,
  Code,
  Palette,
  HeadphonesIcon,
  BarChart,
  Sparkles,
  Shield,
  Award
} from "lucide-react";
import { Link } from "wouter";
import SharedHeader from "@/components/SharedHeader";
import SharedFooter from "@/components/SharedFooter";

export default function Careers() {
  const benefits = [
    {
      icon: <Heart className="h-6 w-6 text-red-500" />,
      title: "Health & Wellness",
      description: "Comprehensive health insurance, mental health support, and wellness programs"
    },
    {
      icon: <Calendar className="h-6 w-6 text-blue-500" />,
      title: "Flexible Time Off",
      description: "Unlimited PTO policy and flexible working hours to maintain work-life balance"
    },
    {
      icon: <Rocket className="h-6 w-6 text-purple-500" />,
      title: "Growth Opportunities", 
      description: "Professional development budget, conference attendance, and internal mobility"
    },
    {
      icon: <DollarSign className="h-6 w-6 text-green-500" />,
      title: "Competitive Compensation",
      description: "Market-leading salaries, equity participation, and performance bonuses"
    },
    {
      icon: <Users className="h-6 w-6 text-orange-500" />,
      title: "Remote-First Culture",
      description: "Work from anywhere with quarterly team offsites and collaboration tools"
    },
    {
      icon: <Award className="h-6 w-6 text-yellow-500" />,
      title: "Recognition Programs",
      description: "Peer recognition system, achievement rewards, and career milestone celebrations"
    }
  ];

  const openPositions = [
    {
      title: "Senior Full Stack Engineer",
      department: "Engineering",
      location: "Remote",
      type: "Full-time",
      description: "Join our core platform team to build scalable email infrastructure serving millions of users.",
      requirements: [
        "5+ years experience with Node.js and React",
        "Experience with PostgreSQL and cloud platforms",
        "Strong understanding of email protocols (SMTP, IMAP)",
        "Experience with high-volume email delivery systems"
      ],
      icon: <Code className="h-6 w-6 text-blue-600" />
    },
    {
      title: "AI/ML Engineer",
      department: "Engineering", 
      location: "Remote",
      type: "Full-time",
      description: "Lead our AI personalization efforts and build next-generation email intelligence features.",
      requirements: [
        "PhD/Masters in AI/ML or equivalent experience",
        "Experience with PyTorch, TensorFlow, or similar",
        "NLP and recommendation systems experience",
        "Python backend development skills"
      ],
      icon: <Sparkles className="h-6 w-6 text-purple-600" />
    },
    {
      title: "Product Designer",
      department: "Design",
      location: "Remote", 
      type: "Full-time",
      description: "Shape the user experience of our email marketing platform used by thousands daily.",
      requirements: [
        "5+ years of product design experience",
        "Proficiency in Figma and design systems",
        "Experience with B2B SaaS platforms",
        "Strong user research and testing skills"
      ],
      icon: <Palette className="h-6 w-6 text-pink-600" />
    },
    {
      title: "Customer Success Manager",
      department: "Customer Success",
      location: "Remote",
      type: "Full-time", 
      description: "Help our customers achieve their email marketing goals and drive platform adoption.",
      requirements: [
        "3+ years in customer success or account management",
        "Experience with email marketing platforms",
        "Strong communication and problem-solving skills",
        "Data analysis and reporting experience"
      ],
      icon: <HeadphonesIcon className="h-6 w-6 text-green-600" />
    },
    {
      title: "Sales Development Representative",
      department: "Sales",
      location: "Remote",
      type: "Full-time",
      description: "Drive new business growth by qualifying leads and building relationships with prospects.",
      requirements: [
        "1-3 years of sales or SDR experience",
        "Experience with CRM systems (Salesforce preferred)",
        "Strong communication and prospecting skills",
        "Interest in email marketing and SaaS"
      ],
      icon: <BarChart className="h-6 w-6 text-orange-600" />
    },
    {
      title: "DevOps Engineer",
      department: "Engineering",
      location: "Remote",
      type: "Full-time",
      description: "Build and maintain our infrastructure to support high-volume email delivery.",
      requirements: [
        "3+ years of DevOps/Infrastructure experience",
        "Experience with AWS, Docker, and Kubernetes", 
        "CI/CD pipeline development and maintenance",
        "Monitoring and alerting system expertise"
      ],
      icon: <Shield className="h-6 w-6 text-blue-500" />
    }
  ];

  const departments = [
    { name: "Engineering", count: 3, color: "bg-blue-100 text-blue-800" },
    { name: "Design", count: 1, color: "bg-pink-100 text-pink-800" },
    { name: "Customer Success", count: 1, color: "bg-green-100 text-green-800" },
    { name: "Sales", count: 1, color: "bg-orange-100 text-orange-800" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <SharedHeader />

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <Badge className="mb-4 bg-purple-100 text-purple-700 border-purple-200">Join Our Team</Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-slate-900 mb-6">
              Build the Future of
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Email Marketing</span>
            </h1>
            <p className="text-xl text-slate-600 mb-8 leading-relaxed">
              Join a passionate team of innovators working to revolutionize how businesses connect 
              with their audience through intelligent email marketing technology.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600">
                View Open Positions
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline">
                Learn About Our Culture
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Why Work Here */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Why Work at EmailReach Pro?</h2>
            <p className="text-lg text-slate-600">Amazing benefits and a culture that puts people first</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center space-x-3 mb-2">
                    {benefit.icon}
                    <CardTitle className="text-lg">{benefit.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Department Overview */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Open Positions by Department</h2>
            <p className="text-lg text-slate-600">Find your perfect role across our growing team</p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {departments.map((dept, index) => (
              <Badge key={index} variant="secondary" className={`px-4 py-2 text-sm ${dept.color}`}>
                {dept.name} ({dept.count} open)
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Open Positions</h2>
            <p className="text-lg text-slate-600">Join our mission to transform email marketing</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {openPositions.map((position, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      {position.icon}
                      <div>
                        <CardTitle className="text-xl">{position.title}</CardTitle>
                        <CardDescription className="text-base">
                          <Badge variant="outline" className="mr-2">{position.department}</Badge>
                          <span className="text-slate-500 flex items-center mt-1">
                            <MapPin className="h-4 w-4 mr-1" />
                            {position.location} • {position.type}
                          </span>
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 mb-4">{position.description}</p>
                  <div className="mb-4">
                    <h4 className="font-semibold text-slate-900 mb-2">Key Requirements:</h4>
                    <ul className="text-sm text-slate-600 space-y-1">
                      {position.requirements.slice(0, 3).map((req, reqIndex) => (
                        <li key={reqIndex} className="flex items-start">
                          <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Button className="w-full">
                    Apply Now
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Culture Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-6">Our Culture</h2>
              <p className="text-lg text-slate-600 mb-6 leading-relaxed">
                We're building more than just software – we're creating an environment where 
                passionate people can do their best work and grow their careers.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-slate-700">Remote-first with flexible schedules</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-slate-700">Quarterly team offsites and retreats</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-slate-700">Learning & development opportunities</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-slate-700">Inclusive and diverse environment</span>
                </li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-8 rounded-2xl text-white">
              <Users className="h-12 w-12 mb-4" />
              <h3 className="text-2xl font-bold mb-4">Join Our Growing Team</h3>
              <p className="text-blue-100 mb-6 leading-relaxed">
                We're a fast-growing company with big ambitions. Join us as we scale to serve 
                millions of users worldwide.
              </p>
              <Button variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600">
                View All Benefits
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Don't See Your Role?</h2>
          <p className="text-xl text-blue-100 mb-8">
            We're always looking for talented people. Send us your resume and tell us how you'd like to contribute.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50">
                Send Your Resume
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600">
              Learn More About Us
            </Button>
          </div>
        </div>
      </section>

      <SharedFooter />
    </div>
  );
}