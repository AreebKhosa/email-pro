import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import StatsCard from "@/components/StatsCard";
import PlanUsage from "@/components/PlanUsage";
import WarmupStatus from "@/components/WarmupStatus";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Plus, TrendingUp, TrendingDown, Rocket, Mail, MailOpen, MousePointer, TriangleAlert, Eye, Edit, MoreHorizontal } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    retry: false,
  });

  const { data: campaigns } = useQuery({
    queryKey: ["/api/campaigns"],
    retry: false,
  });

  const { data: emailIntegrations } = useQuery({
    queryKey: ["/api/email-integrations"],
    retry: false,
  });

  if (isDashboardLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  const stats = dashboardData || {};
  const usage = stats.usage || {};
  const limits = stats.planLimits || {};
  const recentCampaigns = campaigns?.slice(0, 3) || [];

  // Check if approaching limits
  const emailUsagePercent = limits.emailsPerMonth ? (usage.emailsSent / limits.emailsPerMonth) * 100 : 0;
  const approachingLimit = emailUsagePercent > 80;

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-600 mt-1">Welcome back! Here's what's happening with your campaigns.</p>
          </div>
          <Link href="/campaigns">
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </Link>
        </div>

        {/* Plan Usage Alert */}
        {approachingLimit && (
          <Alert className="border-amber-200 bg-amber-50">
            <TriangleAlert className="h-4 w-4 text-amber-500" />
            <AlertTitle className="text-amber-800">Approaching Plan Limit</AlertTitle>
            <AlertDescription className="text-amber-700">
              You've used {usage.emailsSent?.toLocaleString()} of {limits.emailsPerMonth?.toLocaleString()} monthly emails. 
              <Link href="/upgrade" className="font-medium underline ml-1">Upgrade to Pro</Link> for higher limits.
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Campaigns"
            value={stats.totalCampaigns || 0}
            icon={<Rocket className="h-6 w-6" />}
            trend={12}
            trendLabel="from last month"
            className="bg-blue-50 border-blue-200"
            iconClassName="text-blue-600"
          />
          
          <StatsCard
            title="Emails Sent"
            value={stats.emailsSent || 0}
            icon={<Mail className="h-6 w-6" />}
            trend={8}
            trendLabel="from last month"
            className="bg-green-50 border-green-200"
            iconClassName="text-green-600"
          />
          
          <StatsCard
            title="Open Rate"
            value={`${(stats.openRate || 0).toFixed(1)}%`}
            icon={<MailOpen className="h-6 w-6" />}
            trend={2.1}
            trendLabel="from last month"
            className="bg-purple-50 border-purple-200"
            iconClassName="text-purple-600"
          />
          
          <StatsCard
            title="Click Rate"
            value={`${(stats.clickRate || 0).toFixed(1)}%`}
            icon={<MousePointer className="h-6 w-6" />}
            trend={-0.5}
            trendLabel="from last month"
            className="bg-orange-50 border-orange-200"
            iconClassName="text-orange-600"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Campaigns */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Recent Campaigns</CardTitle>
                  <Link href="/campaigns" className="text-primary hover:text-primary/80 font-medium text-sm">
                    View all
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {recentCampaigns.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead>Campaign</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Sent</TableHead>
                        <TableHead>Open Rate</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentCampaigns.map((campaign: any) => (
                        <TableRow key={campaign.id}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                                <Mail className="h-4 w-4 text-white" />
                              </div>
                              <div>
                                <p className="font-medium text-slate-900">{campaign.name}</p>
                                <p className="text-sm text-slate-500">
                                  Created {new Date(campaign.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                campaign.status === 'active' ? 'default' :
                                campaign.status === 'completed' ? 'secondary' :
                                'outline'
                              }
                              className={
                                campaign.status === 'active' ? 'bg-green-100 text-green-800' :
                                campaign.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                                'bg-blue-100 text-blue-800'
                              }
                            >
                              {campaign.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {campaign.sentCount} / {campaign.totalRecipients || 0}
                          </TableCell>
                          <TableCell className="text-sm">
                            {campaign.sentCount > 0 
                              ? `${((campaign.openedCount / campaign.sentCount) * 100).toFixed(1)}%`
                              : '-'
                            }
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <Rocket className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No campaigns yet</h3>
                    <p className="text-slate-600 mb-4">Create your first campaign to get started</p>
                    <Link href="/campaigns">
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Campaign
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Content */}
          <div className="space-y-6">
            <PlanUsage usage={usage} limits={limits} />
            <WarmupStatus integrations={emailIntegrations || []} />
            
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/recipients">
                  <Button variant="ghost" className="w-full justify-start p-3 h-auto">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <Plus className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="font-medium">Add Recipients</span>
                  </Button>
                </Link>

                <Link href="/email-integrations">
                  <Button variant="ghost" className="w-full justify-start p-3 h-auto">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                      <MailOpen className="h-4 w-4 text-green-600" />
                    </div>
                    <span className="font-medium">Connect Email</span>
                  </Button>
                </Link>

                <Link href="/deliverability">
                  <Button variant="ghost" className="w-full justify-start p-3 h-auto">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                      <Mail className="h-4 w-4 text-purple-600" />
                    </div>
                    <span className="font-medium">Check Deliverability</span>
                  </Button>
                </Link>

                <Link href="/personalization">
                  <Button variant="ghost" className="w-full justify-start p-3 h-auto">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                      <TrendingUp className="h-4 w-4 text-orange-600" />
                    </div>
                    <span className="font-medium">Personalize Emails</span>
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
