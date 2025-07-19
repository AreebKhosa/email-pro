import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  Play, 
  Pause, 
  Edit, 
  Save, 
  X, 
  Mail, 
  Users, 
  Clock, 
  TrendingUp,
  BarChart3,
  Eye,
  MousePointer,
  Send
} from "lucide-react";
import RichTextEditor from "./RichTextEditor";

interface Campaign {
  id: number;
  name: string;
  status: string;
  subject: string;
  body: string;
  sentCount?: number;
  openedCount?: number;
  clickedCount?: number;
  recipientListId: number;
  emailIntegrationId: number;
  emailRotationEnabled?: boolean;
  emailRotationIds?: number[];
  dailyLimit?: number;
  timeWindowStart?: string;
  timeWindowEnd?: string;
  emailsPerAccount?: number;
  emailDelay?: number;
  followUpEnabled?: boolean;
  followUpSubject?: string;
  followUpBody?: string;
  followUpCondition?: string;
  followUpDays?: number;
  createdAt: string;
  scheduledAt?: string;
  userId?: string;
}

interface CampaignDetailModalProps {
  campaign: Campaign | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function CampaignDetailModal({ campaign, isOpen, onClose }: CampaignDetailModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    subject: "",
    body: "",
    followUpSubject: "",
    followUpBody: "",
  });

  // Update edit data when campaign changes
  useEffect(() => {
    if (campaign) {
      setEditData({
        subject: campaign.subject || "",
        body: campaign.body || "",
        followUpSubject: campaign.followUpSubject || "",
        followUpBody: campaign.followUpBody || "",
      });
    }
  }, [campaign]);

  // Update campaign status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ status }: { status: string }) => {
      const response = await apiRequest("PATCH", `/api/campaigns/${campaign?.id}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: "Success",
        description: `Campaign ${campaign?.status === 'paused' ? 'started' : 'paused'} successfully`,
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

  // Update campaign content
  const updateContentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PATCH", `/api/campaigns/${campaign?.id}`, editData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Campaign updated successfully",
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
        description: error.message || "Failed to update campaign",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    const colors = {
      draft: "bg-gray-100 text-gray-800",
      scheduled: "bg-blue-100 text-blue-800",
      sending: "bg-yellow-100 text-yellow-800",
      completed: "bg-green-100 text-green-800",
      paused: "bg-red-100 text-red-800",
    };
    return colors[status as keyof typeof colors] || colors.draft;
  };

  const canEdit = campaign?.status === 'draft' || campaign?.status === 'paused';
  const canToggle = campaign?.status !== 'completed';

  const handleToggleStatus = () => {
    if (!campaign) return;
    const newStatus = campaign.status === 'paused' || campaign.status === 'draft' ? 'sending' : 'paused';
    updateStatusMutation.mutate({ status: newStatus });
  };

  const handleSaveChanges = () => {
    updateContentMutation.mutate();
  };

  const handleCancelEdit = () => {
    setEditData({
      subject: campaign?.subject || "",
      body: campaign?.body || "",
    });
    setIsEditing(false);
  };

  if (!campaign) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold">{campaign.name}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={getStatusColor(campaign.status)}>
                  {campaign.status}
                </Badge>
                <span className="text-sm text-gray-500">
                  Created {new Date(campaign.createdAt).toLocaleDateString()}
                </span>
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => isEditing ? handleCancelEdit() : setIsEditing(true)}
                  disabled={updateContentMutation.isPending}
                >
                  {isEditing ? <X className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                  {isEditing ? "Cancel" : "Edit"}
                </Button>
              )}
              {canToggle && (
                <Button
                  variant={campaign.status === 'sending' ? "destructive" : "default"}
                  size="sm"
                  onClick={handleToggleStatus}
                  disabled={updateStatusMutation.isPending}
                >
                  {campaign.status === 'sending' ? (
                    <>
                      <Pause className="w-4 h-4 mr-1" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-1" />
                      Start
                    </>
                  )}
                </Button>
              )}
              {isEditing && (
                <Button
                  onClick={handleSaveChanges}
                  disabled={updateContentMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-1" />
                  Save Changes
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Sent</CardTitle>
                  <Send className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{campaign.sentCount || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Opened</CardTitle>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{campaign.openedCount || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {(campaign.sentCount || 0) > 0 ? (((campaign.openedCount || 0) / (campaign.sentCount || 1)) * 100).toFixed(1) : 0}% rate
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Clicked</CardTitle>
                  <MousePointer className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{campaign.clickedCount || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {(campaign.sentCount || 0) > 0 ? (((campaign.clickedCount || 0) / (campaign.sentCount || 1)) * 100).toFixed(1) : 0}% rate
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Campaign Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Daily Limit</Label>
                    <p className="text-sm text-gray-600">{campaign.dailyLimit || 50} emails/day</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Time Window</Label>
                    <p className="text-sm text-gray-600">
                      {campaign.timeWindowStart || '08:00'} - {campaign.timeWindowEnd || '17:00'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Email Rotation</Label>
                    <p className="text-sm text-gray-600">
                      {campaign.emailRotationEnabled ? `Yes (${campaign.emailsPerAccount || 30} emails/account)` : 'No'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Email Delay</Label>
                    <p className="text-sm text-gray-600">{campaign.emailDelay || 5} minutes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Email Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="subject">Subject Line</Label>
                  {isEditing ? (
                    <Input
                      id="subject"
                      value={editData.subject}
                      onChange={(e) => setEditData(prev => ({ ...prev, subject: e.target.value }))}
                      className="mt-2"
                    />
                  ) : (
                    <p className="mt-2 p-3 bg-gray-50 rounded-md">{campaign.subject}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="body">Email Body</Label>
                  {isEditing ? (
                    <div className="mt-2">
                      <RichTextEditor
                        value={editData.body}
                        onChange={(value) => setEditData(prev => ({ ...prev, body: value }))}
                        minHeight="300px"
                      />
                    </div>
                  ) : (
                    <div 
                      className="mt-2 p-4 bg-gray-50 rounded-md min-h-[200px]"
                      dangerouslySetInnerHTML={{ __html: campaign.body }}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Follow-up Email</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {campaign.followUpEnabled ? (
                  <>
                    <div>
                      <Label>Follow-up Subject</Label>
                      {isEditing ? (
                        <Input
                          value={editData.followUpSubject || ''}
                          onChange={(e) => setEditData(prev => ({ ...prev, followUpSubject: e.target.value }))}
                          className="mt-2"
                          placeholder="Follow-up subject..."
                        />
                      ) : (
                        <p className="mt-2 p-3 bg-gray-50 rounded-md">{campaign.followUpSubject || 'Not configured'}</p>
                      )}
                    </div>
                    <div>
                      <Label>Follow-up Body</Label>
                      {isEditing ? (
                        <div className="mt-2">
                          <RichTextEditor
                            value={editData.followUpBody || ''}
                            onChange={(value) => setEditData(prev => ({ ...prev, followUpBody: value }))}
                            minHeight="200px"
                            placeholder="Follow-up email content..."
                          />
                        </div>
                      ) : (
                        <div 
                          className="mt-2 p-4 bg-gray-50 rounded-md min-h-[150px]"
                          dangerouslySetInnerHTML={{ __html: campaign.followUpBody || '<p>Not configured</p>' }}
                        />
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Condition</Label>
                        <p className="text-sm text-gray-600 mt-1">
                          {campaign.followUpCondition === 'not_opened' ? 'Not Opened' : 'No Reply'}
                        </p>
                      </div>
                      <div>
                        <Label>Delay</Label>
                        <p className="text-sm text-gray-600 mt-1">{campaign.followUpDays || 3} days</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-gray-500 text-center py-4">Follow-up emails are not enabled for this campaign</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Recipient List ID</Label>
                    <p className="text-sm text-gray-600 mt-1">{campaign.recipientListId}</p>
                  </div>
                  <div>
                    <Label>Email Integration ID</Label>
                    <p className="text-sm text-gray-600 mt-1">
                      {campaign.emailIntegrationId}
                      {campaign.emailRotationIds && campaign.emailRotationIds.length > 0 && 
                        `, Rotation: ${campaign.emailRotationIds.join(", ")}`
                      }
                    </p>
                  </div>
                  <div>
                    <Label>Created</Label>
                    <p className="text-sm text-gray-600 mt-1">
                      {new Date(campaign.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {campaign.scheduledAt && (
                    <div>
                      <Label>Scheduled</Label>
                      <p className="text-sm text-gray-600 mt-1">
                        {new Date(campaign.scheduledAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{campaign.sentCount || 0}</p>
                      <p className="text-sm text-gray-500">Total Sent</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">
                        {(campaign.sentCount || 0) > 0 ? (((campaign.openedCount || 0) / (campaign.sentCount || 1)) * 100).toFixed(1) : 0}%
                      </p>
                      <p className="text-sm text-gray-500">Open Rate</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-purple-600">
                        {(campaign.sentCount || 0) > 0 ? (((campaign.clickedCount || 0) / (campaign.sentCount || 1)) * 100).toFixed(1) : 0}%
                      </p>
                      <p className="text-sm text-gray-500">Click Rate</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Delivery Rate</span>
                      <span className="text-sm font-medium">
                        {(campaign.sentCount || 0) > 0 ? "100%" : "0%"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Bounce Rate</span>
                      <span className="text-sm font-medium">0%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Unsubscribe Rate</span>
                      <span className="text-sm font-medium">0%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}