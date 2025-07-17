import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Flame, FlameKindling, TrendingUp, TrendingDown, Mail, MailOpen, Reply, Shield } from "lucide-react";
import { Link } from "wouter";

export default function WarmUp() {
  const { data: integrations, isLoading } = useQuery({
    queryKey: ["/api/email-integrations"],
    retry: false,
  });

  const warmupIntegrations = integrations?.filter((int: any) => int.warmupEnabled) || [];

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Email Warm-up</h1>
            <p className="text-slate-600 mt-1">Monitor and manage your email reputation warming</p>
          </div>
          <Link href="/email-integrations">
            <Button variant="outline">
              Manage Integrations
            </Button>
          </Link>
        </div>

        {warmupIntegrations.length > 0 ? (
          <>
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Daily Sent</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">45</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Mail className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <div className="flex items-center mt-4 text-sm">
                    <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                    <span className="text-green-600 font-medium">+8%</span>
                    <span className="text-slate-500 ml-1">from yesterday</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Daily Received</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">38</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <MailOpen className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                  <div className="flex items-center mt-4 text-sm">
                    <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                    <span className="text-green-600 font-medium">+12%</span>
                    <span className="text-slate-500 ml-1">from yesterday</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Replies Sent</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">22</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Reply className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                  <div className="flex items-center mt-4 text-sm">
                    <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                    <span className="text-green-600 font-medium">+15%</span>
                    <span className="text-slate-500 ml-1">from yesterday</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Reputation Score</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">96%</p>
                    </div>
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Shield className="h-6 w-6 text-orange-600" />
                    </div>
                  </div>
                  <div className="flex items-center mt-4 text-sm">
                    <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                    <span className="text-green-600 font-medium">+2%</span>
                    <span className="text-slate-500 ml-1">from yesterday</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Active Warm-up Accounts */}
            <Card>
              <CardHeader>
                <CardTitle>Active Warm-up Accounts</CardTitle>
                <CardDescription>Email accounts currently in the warm-up pool</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {warmupIntegrations.map((integration: any) => (
                    <div key={integration.id} className="border rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                            <Flame className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h3 className="font-medium text-slate-900">{integration.email}</h3>
                            <Badge className="bg-green-100 text-green-800 mt-1">
                              Active
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-600">Warm-up Progress</p>
                          <p className="text-2xl font-bold text-slate-900">78%</p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <Progress value={78} className="h-2" />
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <p className="font-medium text-blue-900">Sent Today</p>
                          <p className="text-2xl font-bold text-blue-600">15</p>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <p className="font-medium text-green-900">Received Today</p>
                          <p className="text-2xl font-bold text-green-600">12</p>
                        </div>
                        <div className="text-center p-3 bg-purple-50 rounded-lg">
                          <p className="font-medium text-purple-900">Opened</p>
                          <p className="text-2xl font-bold text-purple-600">89%</p>
                        </div>
                        <div className="text-center p-3 bg-orange-50 rounded-lg">
                          <p className="font-medium text-orange-900">Replied</p>
                          <p className="text-2xl font-bold text-orange-600">7</p>
                        </div>
                      </div>

                      <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-600">Spam Folder Recovery</span>
                          <span className="font-medium text-slate-900">3 emails recovered</span>
                        </div>
                        <div className="flex justify-between items-center text-sm mt-1">
                          <span className="text-slate-600">Domain Reputation</span>
                          <span className="font-medium text-green-600">Excellent</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Warm-up Settings */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle>Warm-up Settings</CardTitle>
                  <CardDescription>Configure your warm-up behavior</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">Daily Email Limit</p>
                      <p className="text-sm text-slate-600">Maximum emails sent per day</p>
                    </div>
                    <Badge variant="outline">50 emails</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">Ramp-up Speed</p>
                      <p className="text-sm text-slate-600">How quickly to increase volume</p>
                    </div>
                    <Badge variant="outline">Conservative</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">Reply Rate</p>
                      <p className="text-sm text-slate-600">Automatic reply percentage</p>
                    </div>
                    <Badge variant="outline">30%</Badge>
                  </div>

                  <Button className="w-full mt-4" variant="outline">
                    Adjust Settings
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>How Warm-up Works</CardTitle>
                  <CardDescription>Understanding the warm-up process</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-blue-600">1</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Pool Participation</p>
                      <p className="text-sm text-slate-600">Your email joins a network of other warm-up accounts</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-blue-600">2</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Gradual Volume Increase</p>
                      <p className="text-sm text-slate-600">We slowly increase sending volume to build reputation</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-blue-600">3</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Automatic Replies</p>
                      <p className="text-sm text-slate-600">Natural conversations help establish legitimacy</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-blue-600">4</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Spam Recovery</p>
                      <p className="text-sm text-slate-600">Emails are moved out of spam folders automatically</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <FlameKindling className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No active warm-up accounts</h3>
              <p className="text-slate-600 mb-4">
                Enable warm-up on your email integrations to start building sender reputation
              </p>
              <Link href="/email-integrations">
                <Button>
                  <Flame className="h-4 w-4 mr-2" />
                  Enable Warm-up
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
