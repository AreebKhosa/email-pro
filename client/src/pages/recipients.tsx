import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Users, Upload, Download, Trash, Eye, MoreHorizontal, TrendingUp, UserCheck, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const listSchema = z.object({
  name: z.string().min(1, "List name is required"),
  description: z.string().optional(),
});

const recipientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  lastName: z.string().optional(),
  companyName: z.string().optional(),
  position: z.string().optional(),
  email: z.string().email("Valid email is required"),
  websiteLink: z.string().url().optional().or(z.literal("")),
});

export default function Recipients() {
  const { toast } = useToast();
  const [isCreateListOpen, setIsCreateListOpen] = useState(false);
  const [isAddRecipientOpen, setIsAddRecipientOpen] = useState(false);
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  const { data: recipientLists, isLoading } = useQuery({
    queryKey: ["/api/recipient-lists"],
    retry: false,
  });

  const { data: recipients } = useQuery({
    queryKey: ["/api/recipient-lists", selectedListId, "recipients"],
    enabled: !!selectedListId,
    retry: false,
  });

  const { data: recentRecipients } = useQuery({
    queryKey: ["/api/recipients/recent"],
    enabled: !selectedListId,
    retry: false,
  });

  const { data: userStats } = useQuery({
    queryKey: ["/api/user/stats"],
    retry: false,
  });

  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const listForm = useForm({
    resolver: zodResolver(listSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const recipientForm = useForm({
    resolver: zodResolver(recipientSchema),
    defaultValues: {
      name: "",
      lastName: "",
      companyName: "",
      position: "",
      email: "",
      websiteLink: "",
    },
  });

  const createListMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/recipient-lists", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Recipient list created successfully",
      });
      setIsCreateListOpen(false);
      listForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/recipient-lists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addRecipientMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", `/api/recipient-lists/${selectedListId}/recipients`, {
        recipients: [data]
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Recipient added successfully",
      });
      setIsAddRecipientOpen(false);
      recipientForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/recipient-lists", selectedListId, "recipients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recipient-lists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bulkUploadMutation = useMutation({
    mutationFn: async (csvData: string) => {
      // Parse CSV data
      const lines = csvData.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      const recipients = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        return {
          name: values[headers.indexOf('name')] || '',
          lastName: values[headers.indexOf('last_name')] || '',
          companyName: values[headers.indexOf('company_name')] || '',
          position: values[headers.indexOf('position')] || '',
          email: values[headers.indexOf('email')] || '',
          websiteLink: values[headers.indexOf('website_link')] || '',
        };
      });

      // Check plan limits
      const currentPlan = user?.plan || 'demo';
      const planLimits = {
        demo: { recipients: 300 },
        starter: { recipients: 5000 },
        pro: { recipients: 25000 },
        premium: { recipients: Infinity }
      };
      
      const maxRecipients = planLimits[currentPlan as keyof typeof planLimits]?.recipients || 300;
      const currentTotal = recipientLists?.reduce((sum: number, list: any) => sum + (list.recipientCount || 0), 0) || 0;
      
      if (maxRecipients !== Infinity && currentTotal + recipients.length > maxRecipients) {
        throw new Error(`Your uploaded list exceeds your plan limit. Please upgrade your plan to add ${recipients.length} more recipients.`);
      }

      await apiRequest("POST", `/api/recipient-lists/${selectedListId}/recipients`, {
        recipients
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Recipients uploaded successfully",
      });
      setIsBulkUploadOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/recipient-lists", selectedListId, "recipients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recipient-lists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteRecipientMutation = useMutation({
    mutationFn: async (recipientId: number) => {
      const response = await apiRequest("DELETE", `/api/recipients/${recipientId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipient-lists", selectedListId, "recipients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recipients/recent"] });
      toast({
        title: "Recipient deleted",
        description: "The recipient has been removed from the list",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete recipient",
        variant: "destructive",
      });
    },
  });

  const deleteListMutation = useMutation({
    mutationFn: async (listId: number) => {
      const response = await apiRequest("DELETE", `/api/recipient-lists/${listId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipient-lists"] });
      setSelectedListId(null);
      toast({
        title: "List deleted",
        description: "The recipient list and all its recipients have been deleted",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete recipient list",
        variant: "destructive",
      });
    },
  });

  const onCreateList = (data: any) => {
    createListMutation.mutate(data);
  };

  const onAddRecipient = (data: any) => {
    addRecipientMutation.mutate(data);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const csvData = e.target?.result as string;
        bulkUploadMutation.mutate(csvData);
      };
      reader.readAsText(file);
    }
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Recipients</h1>
            <p className="text-slate-600 mt-1">Manage your recipient lists and contacts</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Lists</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{recipientLists?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                Active recipient lists
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Recipients</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {recipientLists?.reduce((sum: number, list: any) => sum + (list.recipientCount || 0), 0) || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Contacts across all lists
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Remaining Recipients</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(() => {
                  const currentPlan = user?.plan || 'demo';
                  const planLimits = {
                    demo: { recipients: 300 },
                    starter: { recipients: 5000 },
                    pro: { recipients: 25000 },
                    premium: { recipients: Infinity }
                  };
                  const maxRecipients = planLimits[currentPlan as keyof typeof planLimits]?.recipients || 300;
                  const totalRecipients = recipientLists?.reduce((sum: number, list: any) => sum + (list.recipientCount || 0), 0) || 0;
                  const remaining = maxRecipients === Infinity ? 'Unlimited' : Math.max(0, maxRecipients - totalRecipients);
                  return typeof remaining === 'number' ? remaining.toLocaleString() : remaining;
                })()}
              </div>
              <div className="mt-2">
                {(() => {
                  const currentPlan = user?.plan || 'demo';
                  const planLimits = {
                    demo: { recipients: 300 },
                    starter: { recipients: 5000 },
                    pro: { recipients: 25000 },
                    premium: { recipients: Infinity }
                  };
                  const maxRecipients = planLimits[currentPlan as keyof typeof planLimits]?.recipients || 300;
                  const totalRecipients = recipientLists?.reduce((sum: number, list: any) => sum + (list.recipientCount || 0), 0) || 0;
                  const usagePercentage = maxRecipients === Infinity ? 0 : Math.min(100, (totalRecipients / maxRecipients) * 100);
                  
                  if (maxRecipients !== Infinity) {
                    return (
                      <>
                        <Progress value={usagePercentage} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">
                          {usagePercentage.toFixed(1)}% of {maxRecipients.toLocaleString()} used
                        </p>
                      </>
                    );
                  } else {
                    return (
                      <p className="text-xs text-muted-foreground">
                        Unlimited plan
                      </p>
                    );
                  }
                })()}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          
          <Dialog open={isCreateListOpen} onOpenChange={setIsCreateListOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                New List
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Recipient List</DialogTitle>
                <DialogDescription>
                  Create a new list to organize your recipients
                </DialogDescription>
              </DialogHeader>
              
              <Form {...listForm}>
                <form onSubmit={listForm.handleSubmit(onCreateList)} className="space-y-4">
                  <FormField
                    control={listForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>List Name</FormLabel>
                        <FormControl>
                          <Input placeholder="My Prospects" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={listForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Describe this list..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsCreateListOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      disabled={createListMutation.isPending}
                    >
                      {createListMutation.isPending ? "Creating..." : "Create List"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Lists Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recipient Lists</CardTitle>
                <CardDescription>Select a list to view recipients</CardDescription>
              </CardHeader>
              <CardContent>
                {recipientLists && recipientLists.length > 0 ? (
                  <div className="space-y-2">
                    {recipientLists.map((list: any) => (
                      <button
                        key={list.id}
                        onClick={() => setSelectedListId(list.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          selectedListId === list.id
                            ? 'border-primary bg-primary/5'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium text-slate-900">{list.name}</h3>
                            {list.description && (
                              <p className="text-sm text-slate-500 mt-1">{list.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              {list.recipientCount || 0}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Are you sure you want to delete this list and all its recipients?')) {
                                  deleteListMutation.mutate(list.id);
                                }
                              }}
                              disabled={deleteListMutation.isPending}
                              className="text-red-600 hover:bg-red-50 h-8 w-8 p-0"
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No lists yet</h3>
                    <p className="text-slate-600 mb-4">Create your first recipient list</p>
                    <Button onClick={() => setIsCreateListOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create List
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recipients Table */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {selectedListId ? 'Recipients' : 'Select a List'}
                    </CardTitle>
                    <CardDescription>
                      {selectedListId ? 'Manage recipients in this list' : 'Choose a recipient list to view contacts'}
                    </CardDescription>
                  </div>
                  
                  {selectedListId && (
                    <div className="flex space-x-2">
                      <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Upload className="h-4 w-4 mr-2" />
                            Upload CSV
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Upload Recipients</DialogTitle>
                            <DialogDescription>
                              Upload a CSV file with the following format:
                              <br />
                              <code className="text-xs bg-slate-100 p-1 rounded mt-2 block">
                                name,last_name,company_name,position,email,website_link
                              </code>
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-4">
                            <Input
                              type="file"
                              accept=".csv"
                              onChange={handleFileUpload}
                              disabled={bulkUploadMutation.isPending}
                            />
                            
                            {bulkUploadMutation.isPending && (
                              <p className="text-sm text-slate-600">Uploading...</p>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Dialog open={isAddRecipientOpen} onOpenChange={setIsAddRecipientOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Recipient
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Recipient</DialogTitle>
                            <DialogDescription>
                              Add a new recipient to this list
                            </DialogDescription>
                          </DialogHeader>
                          
                          <Form {...recipientForm}>
                            <form onSubmit={recipientForm.handleSubmit(onAddRecipient)} className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <FormField
                                  control={recipientForm.control}
                                  name="name"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>First Name</FormLabel>
                                      <FormControl>
                                        <Input placeholder="John" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={recipientForm.control}
                                  name="lastName"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Last Name</FormLabel>
                                      <FormControl>
                                        <Input placeholder="Doe" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>

                              <FormField
                                control={recipientForm.control}
                                name="email"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                      <Input placeholder="john@example.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <div className="grid grid-cols-2 gap-4">
                                <FormField
                                  control={recipientForm.control}
                                  name="companyName"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Company</FormLabel>
                                      <FormControl>
                                        <Input placeholder="Acme Corp" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={recipientForm.control}
                                  name="position"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Position</FormLabel>
                                      <FormControl>
                                        <Input placeholder="CEO" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>

                              <FormField
                                control={recipientForm.control}
                                name="websiteLink"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Website (Optional)</FormLabel>
                                    <FormControl>
                                      <Input placeholder="https://example.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <div className="flex justify-end space-x-4">
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  onClick={() => setIsAddRecipientOpen(false)}
                                >
                                  Cancel
                                </Button>
                                <Button 
                                  type="submit"
                                  disabled={addRecipientMutation.isPending}
                                >
                                  {addRecipientMutation.isPending ? "Adding..." : "Add Recipient"}
                                </Button>
                              </div>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {selectedListId ? (
                  recipients && recipients.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Company</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recipients.map((recipient: any) => (
                          <TableRow key={recipient.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium text-slate-900">
                                  {recipient.name} {recipient.lastName}
                                </p>
                                {recipient.position && (
                                  <p className="text-sm text-slate-500">{recipient.position}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {recipient.companyName || '-'}
                            </TableCell>
                            <TableCell className="text-sm">
                              {recipient.email}
                            </TableCell>
                            <TableCell>
                              {recipient.deliverabilityStatus ? (
                                <Badge 
                                  variant={
                                    recipient.deliverabilityStatus === 'valid' ? 'default' :
                                    recipient.deliverabilityStatus === 'risky' ? 'secondary' :
                                    'destructive'
                                  }
                                  className={
                                    recipient.deliverabilityStatus === 'valid' ? 'bg-green-100 text-green-800' :
                                    recipient.deliverabilityStatus === 'risky' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }
                                >
                                  {recipient.deliverabilityStatus}
                                </Badge>
                              ) : (
                                <Badge variant="outline">Unchecked</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="text-red-600 hover:bg-red-50"
                                  onClick={() => deleteRecipientMutation.mutate(recipient.id)}
                                  disabled={deleteRecipientMutation.isPending}
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-slate-900 mb-2">No recipients in this list</h3>
                      <p className="text-slate-600 mb-4">Add recipients individually or upload a CSV file</p>
                      <div className="flex justify-center space-x-2">
                        <Button onClick={() => setIsAddRecipientOpen(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Recipient
                        </Button>
                        <Button variant="outline" onClick={() => setIsBulkUploadOpen(true)}>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload CSV
                        </Button>
                      </div>
                    </div>
                  )
                ) : (
                  <div>
                    {recentRecipients && recentRecipients.length > 0 ? (
                      <div>
                        <div className="mb-4">
                          <h3 className="text-lg font-medium text-slate-900 mb-2">Recently Uploaded Recipients</h3>
                          <p className="text-slate-600">Your latest uploaded contacts across all lists</p>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Company</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>List</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {recentRecipients.map((recipient: any) => (
                              <TableRow key={recipient.id}>
                                <TableCell>
                                  <div>
                                    <p className="font-medium text-slate-900">
                                      {recipient.name} {recipient.lastName}
                                    </p>
                                    {recipient.position && (
                                      <p className="text-sm text-slate-500">{recipient.position}</p>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm">
                                  {recipient.companyName || '-'}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {recipient.email}
                                </TableCell>
                                <TableCell className="text-sm">
                                  <Badge variant="outline">{recipient.listName}</Badge>
                                </TableCell>
                                <TableCell>
                                  {recipient.deliverabilityStatus ? (
                                    <Badge 
                                      variant={
                                        recipient.deliverabilityStatus === 'valid' ? 'default' :
                                        recipient.deliverabilityStatus === 'risky' ? 'secondary' :
                                        'destructive'
                                      }
                                      className={
                                        recipient.deliverabilityStatus === 'valid' ? 'bg-green-100 text-green-800' :
                                        recipient.deliverabilityStatus === 'risky' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-red-100 text-red-800'
                                      }
                                    >
                                      {recipient.deliverabilityStatus}
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline">Unchecked</Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center space-x-2">
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      className="text-red-600 hover:bg-red-50"
                                      onClick={() => deleteRecipientMutation.mutate(recipient.id)}
                                      disabled={deleteRecipientMutation.isPending}
                                    >
                                      <Trash className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-slate-900 mb-2">Select a recipient list</h3>
                        <p className="text-slate-600">Choose a list from the sidebar to view and manage recipients</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
