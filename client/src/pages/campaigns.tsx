import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Layout from "@/components/Layout";
import InstructionBox from "@/components/InstructionBox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Rocket, Mail, Calendar, MoreHorizontal, Eye, Edit, Trash, Play, Pause } from "lucide-react";

const campaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  recipientListId: z.coerce.number().min(1, "Please select a recipient list"),
  emailIntegrationId: z.coerce.number().min(1, "Please select an email integration"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Email body is required"),
  scheduledAt: z.string().optional(),
});

export default function Campaigns() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["/api/campaigns"],
    retry: false,
  });

  const { data: recipientLists } = useQuery({
    queryKey: ["/api/recipient-lists"],
    retry: false,
  });

  const { data: emailIntegrations } = useQuery({
    queryKey: ["/api/email-integrations"],
    retry: false,
  });

  const form = useForm({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: "",
      recipientListId: "",
      emailIntegrationId: "",
      subject: "",
      body: "",
      scheduledAt: "",
    },
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/campaigns", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Campaign created successfully",
      });
      setIsCreateOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    createCampaignMutation.mutate(data);
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
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                New Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Campaign</DialogTitle>
                <DialogDescription>
                  Set up your email campaign with recipients and content
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Campaign Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Q4 Product Launch" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="recipientListId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recipient List</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a list" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {recipientLists?.map((list: any) => (
                                <SelectItem key={list.id} value={list.id.toString()}>
                                  {list.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="emailIntegrationId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Integration</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select integration" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {emailIntegrations?.filter((int: any) => int.isVerified).map((integration: any) => (
                                <SelectItem key={integration.id} value={integration.id.toString()}>
                                  {integration.email}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject Line</FormLabel>
                        <FormControl>
                          <Input placeholder="Welcome to our new product!" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="body"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Content</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Hi {name},&#10;&#10;We're excited to introduce our new product..."
                            rows={8}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="scheduledAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Schedule (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            type="datetime-local"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsCreateOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      disabled={createCampaignMutation.isPending}
                    >
                      {createCampaignMutation.isPending ? "Creating..." : "Create Campaign"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
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
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          {campaign.status === 'draft' || campaign.status === 'paused' ? (
                            <Button variant="ghost" size="sm">
                              <Play className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm">
                              <Pause className="h-4 w-4" />
                            </Button>
                          )}
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
                <p className="text-slate-600 mb-4">Create your first campaign to start sending emails</p>
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Campaign
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
