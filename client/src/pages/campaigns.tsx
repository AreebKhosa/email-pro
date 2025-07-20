import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

import InstructionBox from "@/components/InstructionBox";
import CampaignDetailModal from "@/components/CampaignDetailModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { Plus, Rocket, Mail, Calendar, MoreHorizontal, Eye, Play, Pause, Trash2, Send, MailOpen, MousePointer, Users } from "lucide-react";
import { Link } from "wouter";



export default function Campaigns() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["/api/campaigns"],
    retry: false,
  });

  // Get overall campaign stats
  const { data: dashboardStats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    retry: false,
  });

  

  // Toggle campaign status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ campaignId, status }: { campaignId: number; status: string }) => {
      const response = await apiRequest("PATCH", `/api/campaigns/${campaignId}/status`, { status });
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: "Success",
        description: `Campaign ${variables.status === 'sending' ? 'started' : 'paused'} successfully`,
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: error.message || "Failed to update campaign status",
        variant: "destructive",
      });
    },
  });

  // Delete campaign mutation
  const deleteCampaignMutation = useMutation({
    mutationFn: async (campaignId: number) => {
      const response = await apiRequest("DELETE", `/api/campaigns/${campaignId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: "Success", 
        description: "Campaign deleted successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: error.message || "Failed to delete campaign",
        variant: "destructive",
      });
    },
  });

  const handleViewCampaign = (campaign: any) => {
    setSelectedCampaign(campaign);
    setIsDetailModalOpen(true);
  };

  const handleDeleteCampaign = (campaignId: number) => {
    if (confirm("Are you sure you want to delete this campaign? This action cannot be undone.")) {
      deleteCampaignMutation.mutate(campaignId);
    }
  };

  

  const handleToggleStatus = (campaign: any) => {
    const newStatus = campaign.status === 'paused' || campaign.status === 'draft' ? 'sending' : 'paused';
    toggleStatusMutation.mutate({ campaignId: campaign.id, status: newStatus });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { variant: "outline", className: "bg-gray-100 text-gray-800" },
      scheduled: { variant: "outline", className: "bg-blue-100 text-blue-800" },
      sending: { variant: "outline", className: "bg-yellow-100 text-yellow-800" },
      completed: { variant: "outline", className: "bg-green-100 text-green-800" },
      paused: { variant: "outline", className: "bg-red-100 text-red-800" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;

    return (
      <Badge variant={config.variant as any} className={config.className}>
        {status}
      </Badge>
    );
  };

  // Calculate total stats from all campaigns
  const totalStats = campaigns?.reduce((acc: any, campaign: any) => ({
    totalCampaigns: acc.totalCampaigns + 1,
    totalEmails: acc.totalEmails + (campaign.sentCount || 0),
    totalRecipients: acc.totalRecipients + (campaign.totalRecipients || 0),
    totalOpened: acc.totalOpened + (campaign.openedCount || 0),
  }), { totalCampaigns: 0, totalEmails: 0, totalRecipients: 0, totalOpened: 0 }) || 
  { totalCampaigns: 0, totalEmails: 0, totalRecipients: 0, totalOpened: 0 };

  const openRate = totalStats.totalEmails > 0 ? ((totalStats.totalOpened / totalStats.totalEmails) * 100).toFixed(1) : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
        {/* Instruction Box */}
        <InstructionBox
          id="campaigns-intro"
          title="Creating Your First Campaign"
          content="Before creating campaigns, make sure you have: 1) Added recipient lists, 2) Set up email integrations, and 3) Verified your email accounts. You can schedule campaigns or send them immediately."
        />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Campaigns</h1>
            <p className="text-slate-600 mt-1">Create and manage your email campaigns</p>
          </div>
          
          <Link href="/campaigns/create">
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </Link>
        </div>

        {/* Campaign Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Rocket className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Campaigns</p>
                  <p className="text-2xl font-bold text-gray-900">{totalStats.totalCampaigns}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Send className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Emails Sent</p>
                  <p className="text-2xl font-bold text-gray-900">{totalStats.totalEmails.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Recipients</p>
                  <p className="text-2xl font-bold text-gray-900">{totalStats.totalRecipients.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <MailOpen className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Open Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{openRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Campaigns Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Campaigns</CardTitle>
            <CardDescription>Manage your email campaigns and track their performance</CardDescription>
          </CardHeader>
          <CardContent>
            {campaigns && campaigns.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Opens</TableHead>
                    <TableHead>Clicks</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign: any) => (
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
                        {getStatusBadge(campaign.status)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {campaign.sentCount || 0}
                      </TableCell>
                      <TableCell className="text-sm">
                        {campaign.openedCount || 0} 
                        {campaign.sentCount > 0 && (
                          <span className="text-slate-500 ml-1">
                            ({((campaign.openedCount / campaign.sentCount) * 100).toFixed(1)}%)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {campaign.clickedCount || 0}
                        {campaign.sentCount > 0 && (
                          <span className="text-slate-500 ml-1">
                            ({((campaign.clickedCount / campaign.sentCount) * 100).toFixed(1)}%)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {campaign.scheduledAt ? (
                          <div className="flex items-center text-blue-600">
                            <Calendar className="h-4 w-4 mr-1" />
                            {new Date(campaign.scheduledAt).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-slate-500">Now</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleViewCampaign(campaign)}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          {campaign.status === 'draft' || campaign.status === 'paused' ? (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleToggleStatus(campaign)}
                              disabled={toggleStatusMutation.isPending}
                              title="Start Campaign"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleToggleStatus(campaign)}
                              disabled={toggleStatusMutation.isPending}
                              title="Pause Campaign"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Pause className="h-4 w-4" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteCampaign(campaign.id)}
                            disabled={deleteCampaignMutation.isPending}
                            title="Delete Campaign"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
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
                <p className="text-slate-600 mb-4">Create your first campaign to start sending emails</p>
                <Link href="/campaigns/create">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Campaign
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Campaign Detail Modal */}
        <CampaignDetailModal
          campaign={selectedCampaign}
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedCampaign(null);
          }}
        />
      </div>
  );
}
