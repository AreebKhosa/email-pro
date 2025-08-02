import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

import InstructionBox from "@/components/InstructionBox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Bot, Wand2, Globe, Clock, Target, MoreHorizontal, Eye, Sparkles, Download, Zap, Users, AlertCircle, Plus } from "lucide-react";

const personalizationSchema = z.object({
  emailType: z.string().min(1, "Email type is required"),
  tone: z.string().min(1, "Tone is required"),
  maxCharacters: z.coerce.number().min(50, "Minimum 50 characters").max(2000, "Maximum 2000 characters"),
  callToAction: z.string().min(1, "Call to action is required"),
  ourServices: z.string().optional(),
  ourIndustry: z.string().optional(),
});

const emailTypes = [
  { value: "outreach", label: "Sales Outreach" },
  { value: "marketing", label: "Marketing" },
  { value: "followup", label: "Follow-up" },
  { value: "introduction", label: "Introduction" },
  { value: "partnership", label: "Partnership" },
];

const tones = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "casual", label: "Casual" },
  { value: "formal", label: "Formal" },
  { value: "enthusiastic", label: "Enthusiastic" },
];

export default function Personalization() {
  const { toast } = useToast();
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [isPersonalizeOpen, setIsPersonalizeOpen] = useState(false);
  const [previewEmail, setPreviewEmail] = useState<string>("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [showUpdateListDialog, setShowUpdateListDialog] = useState(false);
  const [showCreateListDialog, setShowCreateListDialog] = useState(false);
  const [selectedTargetListId, setSelectedTargetListId] = useState<string>("");
  const [newListName, setNewListName] = useState("");
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkPersonalizing, setBulkPersonalizing] = useState(false);
  const [currentPersonalizingId, setCurrentPersonalizingId] = useState<number | null>(null);

  const { data: recipientLists } = useQuery({
    queryKey: ["/api/recipient-lists"],
    retry: false,
  });

  const { data: recipients } = useQuery({
    queryKey: ["/api/recipient-lists", parseInt(selectedListId), "recipients"],
    enabled: !!selectedListId,
    retry: false,
  });

  const { data: userStats } = useQuery({
    queryKey: ["/api/user/stats"],
    retry: false,
  });

  const form = useForm({
    resolver: zodResolver(personalizationSchema),
    defaultValues: {
      emailType: "",
      tone: "",
      maxCharacters: 500,
      callToAction: "",
      ourServices: "",
      ourIndustry: "",
    },
  });

  const personalizeListMutation = useMutation({
    mutationFn: async (data: any) => {
      setBulkPersonalizing(true);
      setBulkProgress(0);
      
      try {
        // Simulate progress for better UX
        const progressInterval = setInterval(() => {
          setBulkProgress(prev => Math.min(prev + Math.random() * 10, 90));
        }, 500);
        
        const response = await apiRequest("POST", `/api/recipient-lists/${selectedListId}/personalize`, data);
        
        clearInterval(progressInterval);
        setBulkProgress(100);
        
        // Show 100% briefly before hiding
        setTimeout(() => {
          setBulkProgress(0);
        }, 1000);
        
        return response.json();
      } finally {
        setBulkPersonalizing(false);
      }
    },
    onSuccess: (result) => {
      toast({
        title: "Success",
        description: `Personalized ${result.personalizedCount} emails successfully`,
      });
      setIsPersonalizeOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/recipient-lists", parseInt(selectedListId), "recipients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
    },
    onError: (error) => {
      setBulkPersonalizing(false);
      setBulkProgress(0);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const personalizeSingleMutation = useMutation({
    mutationFn: async ({ recipientId, data }: { recipientId: number; data: any }) => {
      setCurrentPersonalizingId(recipientId);
      try {
        const response = await apiRequest("POST", `/api/recipients/${recipientId}/personalize`, data);
        return response.json();
      } finally {
        setCurrentPersonalizingId(null);
      }
    },
    onSuccess: (result) => {
      toast({
        title: "Success",
        description: "Email personalized successfully",
      });
      setPreviewEmail(result.personalizedEmail);
      setIsPreviewOpen(true);
      queryClient.invalidateQueries({ queryKey: ["/api/recipient-lists", parseInt(selectedListId), "recipients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
    },
    onError: (error) => {
      setCurrentPersonalizingId(null);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", `/api/recipient-lists/${selectedListId}/export`);
      return response.blob();
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `personalized-emails-${selectedListId}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast({
        title: "Success",
        description: "Email list exported successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateListMutation = useMutation({
    mutationFn: async (targetListId: string) => {
      const response = await apiRequest("POST", `/api/recipient-lists/${targetListId}/update-with-personalized`, {
        sourceListId: parseInt(selectedListId)
      });
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Success",
        description: result.message,
      });
      setShowUpdateListDialog(false);
      setSelectedTargetListId("");
      queryClient.invalidateQueries({ queryKey: ["/api/recipient-lists"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createListMutation = useMutation({
    mutationFn: async (name: string) => {
      const personalizedRecipients = recipients?.filter((r: any) => r.personalizedEmail) || [];
      const listData = {
        name,
        description: `Personalized list created from ${selectedList?.name}`,
      };
      
      const response = await apiRequest("POST", "/api/recipient-lists", listData);
      const newList = await response.json();
      
      // Add personalized recipients to the new list
      for (const recipient of personalizedRecipients) {
        await apiRequest("POST", "/api/recipients", {
          listId: newList.id,
          name: recipient.name,
          email: recipient.email,
          companyName: recipient.companyName,
          position: recipient.position,
          websiteLink: recipient.websiteLink,
          personalizedEmail: recipient.personalizedEmail,
        });
      }
      
      return newList;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Personalized recipients added to new list successfully",
      });
      setShowCreateListDialog(false);
      setNewListName("");
      queryClient.invalidateQueries({ queryKey: ["/api/recipient-lists"] });
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
    personalizeListMutation.mutate(data);
  };

  const handleUpdateList = () => {
    if (!selectedTargetListId) {
      toast({
        title: "Error",
        description: "Please select a list to update",
        variant: "destructive",
      });
      return;
    }
    updateListMutation.mutate(selectedTargetListId);
  };

  const handleCreateList = () => {
    if (!newListName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a list name",
        variant: "destructive",
      });
      return;
    }
    createListMutation.mutate(newListName);
  };

  const handlePersonalizeSingle = (recipientId: number) => {
    const formData = form.getValues();
    if (!formData.emailType || !formData.tone || !formData.callToAction) {
      toast({
        title: "Error",
        description: "Please fill in personalization settings first",
        variant: "destructive",
      });
      return;
    }
    personalizeSingleMutation.mutate({ recipientId, data: formData });
  };

  const selectedList = recipientLists?.find((list: any) => list.id.toString() === selectedListId);
  const personalizedCount = recipients?.filter((r: any) => r.personalizedEmail).length || 0;
  const totalRecipients = recipients?.length || 0;

  // Calculate personalization quota from actual plan limits
  const quota = userStats?.planLimits?.personalizedEmails || 100;
  const used = userStats?.personalizationsUsed || 0;
  const remaining = Math.max(0, quota - used);
  const quotaPercentage = quota === Infinity ? 0 : (used / quota) * 100;
  
  // Determine current plan based on limits
  const determinePlan = (limits: any) => {
    if (!limits) return 'demo';
    if (limits.personalizedEmails === 100 && limits.emailsPerMonth === 1000) return 'demo';
    if (limits.personalizedEmails === 1000 && limits.emailsPerMonth === 20000) return 'starter';
    if (limits.personalizedEmails === 1000 && limits.emailsPerMonth === 75000) return 'pro';
    if (limits.personalizedEmails === 1000 && limits.emailsPerMonth === Infinity) return 'premium';
    return 'demo';
  };
  
  const currentPlan = determinePlan(userStats?.planLimits);

  return (
    <div className="space-y-8">
        {/* Instruction Box */}
        <InstructionBox
          id="personalization-intro"
          title="AI Email Personalization"
          content="Generate personalized emails using AI. First select a recipient list, then configure your personalization settings. You can personalize all emails at once or individual recipients. Personalized emails will appear in the table."
        />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">AI Personalization</h1>
            <p className="text-slate-600 mt-1">Generate personalized emails using AI</p>
          </div>
        </div>

        {/* Quota Card */}
        <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Bot className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-purple-900">Personalization Quota</CardTitle>
                  <CardDescription className="text-purple-700">
                    {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} Plan
                  </CardDescription>
                </div>
              </div>
              <Badge className="bg-purple-100 text-purple-800">
                {quota === Infinity ? 'Unlimited' : `${remaining} remaining`}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Used: {used}</span>
                <span className="text-slate-600">Total: {quota === Infinity ? 'Unlimited' : quota}</span>
              </div>
              <Progress value={quotaPercentage} className="h-2" />
              {remaining <= 10 && (
                <div className="flex items-center space-x-2 text-amber-700 bg-amber-50 p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">Low quota remaining. Consider upgrading your plan.</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* List Selection & Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* List Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Select Recipient List</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedListId} onValueChange={setSelectedListId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a recipient list" />
                </SelectTrigger>
                <SelectContent>
                  {recipientLists?.map((list: any) => (
                    <SelectItem key={list.id} value={list.id.toString()}>
                      {list.name} ({list.recipientCount || 0} recipients)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedList && (
                <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{selectedList.name}</p>
                      <p className="text-sm text-slate-600">
                        {totalRecipients} total • {personalizedCount} personalized
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => exportMutation.mutate()}
                        disabled={!recipients || recipients.length === 0 || personalizedCount === 0 || bulkPersonalizing || currentPersonalizingId !== null}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        {exportMutation.isPending ? "Exporting..." : "Export Personalized"}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setShowUpdateListDialog(true)}
                        disabled={!recipients || recipients.length === 0 || personalizedCount === 0 || bulkPersonalizing || currentPersonalizingId !== null}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Update List
                      </Button>
                    </div>
                  </div>
                  {totalRecipients > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between text-sm text-slate-600 mb-1">
                        <span>Personalized Progress</span>
                        <span>{personalizedCount}/{totalRecipients}</span>
                      </div>
                      <Progress value={(personalizedCount / totalRecipients) * 100} className="h-1.5" />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Personalization Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5" />
                <span>Personalization Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="emailType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select email type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {emailTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
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
                    name="tone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tone</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select tone" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {tones.map((tone) => (
                              <SelectItem key={tone.value} value={tone.value}>
                                {tone.label}
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
                    name="callToAction"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Call to Action</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Schedule a demo, Learn more..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maxCharacters"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Characters</FormLabel>
                        <FormControl>
                          <Input type="number" min="50" max="2000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ourServices"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Our Services/Products</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Web development, AI solutions, Marketing automation..." {...field} />
                        </FormControl>
                        <FormDescription>
                          What services or products do you offer? This helps AI write more relevant emails.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />


                </div>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        {selectedListId && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Button
                    onClick={form.handleSubmit(onSubmit)}
                    disabled={bulkPersonalizing || currentPersonalizingId !== null || remaining <= 0}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {bulkPersonalizing ? (
                      <div className="animate-spin h-4 w-4 mr-2 border-2 border-white rounded-full border-t-transparent" />
                    ) : (
                      <Zap className="h-4 w-4 mr-2" />
                    )}
                    {bulkPersonalizing ? "Personalizing..." : "Personalize All"}
                  </Button>
                  {bulkPersonalizing ? (
                    <div className="flex items-center space-x-3">
                      <Progress value={bulkProgress} className="w-48 h-2" />
                      <p className="text-sm text-slate-600">
                        Processing emails... {Math.round(bulkProgress)}%
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600">
                      This will personalize {totalRecipients - personalizedCount} remaining emails
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recipients Table */}
        {selectedListId && recipients && (
          <Card>
            <CardHeader>
              <CardTitle>Recipients & Personalized Emails</CardTitle>
              <CardDescription>
                View and manage personalized emails for each recipient
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Website</TableHead>
                    <TableHead>Personalized Email</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipients.map((recipient: any) => (
                    <TableRow key={recipient.id}>
                      <TableCell className="font-medium">{recipient.name}</TableCell>
                      <TableCell>{recipient.email}</TableCell>
                      <TableCell>
                        {recipient.websiteLink ? (
                          <div className="flex items-center space-x-2">
                            <Globe className="h-4 w-4 text-green-600" />
                            <span className="text-sm">{new URL(recipient.websiteLink).hostname}</span>
                          </div>
                        ) : (
                          <Badge variant="outline">No website</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {recipient.personalizedEmail ? (
                          <Badge className="bg-green-100 text-green-800">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Generated
                          </Badge>
                        ) : recipient.websiteLink ? (
                          <Badge variant="outline">Not generated</Badge>
                        ) : (
                          <Badge variant="outline">No website</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              disabled={bulkPersonalizing || currentPersonalizingId !== null}
                            >
                              {currentPersonalizingId === recipient.id ? (
                                <div className="animate-spin h-4 w-4 border-2 border-blue-600 rounded-full border-t-transparent" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {recipient.personalizedEmail && (
                              <DropdownMenuItem 
                                onClick={() => {
                                  setPreviewEmail(recipient.personalizedEmail);
                                  setIsPreviewOpen(true);
                                }}
                                disabled={bulkPersonalizing || currentPersonalizingId !== null}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Email
                              </DropdownMenuItem>
                            )}
                            {recipient.websiteLink && (
                              <DropdownMenuItem 
                                onClick={() => handlePersonalizeSingle(recipient.id)}
                                disabled={bulkPersonalizing || currentPersonalizingId !== null || remaining <= 0}
                              >
                                <Wand2 className="h-4 w-4 mr-2" />
                                {currentPersonalizingId === recipient.id ? "Personalizing..." : 
                                 recipient.personalizedEmail ? "Re-personalize" : "Personalize"}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Email Preview Dialog */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Personalized Email Preview</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <div className="bg-slate-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm">{previewEmail}</pre>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Update List Dialog */}
        <Dialog open={showUpdateListDialog} onOpenChange={setShowUpdateListDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update List with Personalized Emails</DialogTitle>
              <DialogDescription>
                Add {personalizedCount} personalized emails from "{selectedList?.name}" to an existing recipient list. Existing recipients with the same email will have their personalized email updated.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Select Target List</label>
                <Select value={selectedTargetListId} onValueChange={setSelectedTargetListId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a list to update" />
                  </SelectTrigger>
                  <SelectContent>
                    {recipientLists?.filter((list: any) => list.id.toString() !== selectedListId).map((list: any) => (
                      <SelectItem key={list.id} value={list.id.toString()}>
                        {list.name} ({list.recipientCount || 0} recipients)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                <strong>What will happen:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Recipients with matching emails will get updated personalized emails</li>
                  <li>New recipients will be added to the target list</li>
                  <li>Original recipient data will be preserved</li>
                </ul>
              </div>
              <div className="flex justify-between space-x-2">
                <Button 
                  variant="outline"
                  onClick={() => setShowUpdateListDialog(false)}
                >
                  Cancel
                </Button>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setShowUpdateListDialog(false);
                      setNewListName(`${selectedList?.name} - Personalized`);
                      setShowCreateListDialog(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Instead
                  </Button>
                  <Button 
                    onClick={handleUpdateList}
                    disabled={updateListMutation.isPending || !selectedTargetListId}
                  >
                    {updateListMutation.isPending ? "Updating..." : "Update List"}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create New List Dialog */}
        <Dialog open={showCreateListDialog} onOpenChange={setShowCreateListDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New List with Personalized Emails</DialogTitle>
              <DialogDescription>
                Create a new recipient list with {personalizedCount} personalized recipients from "{selectedList?.name}".
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">List Name</label>
                <Input
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="Enter new list name"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => {
                  setNewListName("");
                  setShowCreateListDialog(false);
                }}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateList}
                  disabled={createListMutation.isPending || !newListName.trim()}
                >
                  {createListMutation.isPending ? "Creating..." : "Create List"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    
  );
}