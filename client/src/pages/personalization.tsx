import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Sparkles, Wand2, Download, Eye, RotateCcw, Globe } from "lucide-react";

const personalizationSchema = z.object({
  emailType: z.string().min(1, "Email type is required"),
  tone: z.string().min(1, "Tone is required"),
  maxCharacters: z.coerce.number().min(50, "Minimum 50 characters").max(2000, "Maximum 2000 characters"),
  callToAction: z.string().min(1, "Call to action is required"),
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

  const { data: recipientLists } = useQuery({
    queryKey: ["/api/recipient-lists"],
    retry: false,
  });

  const { data: recipients } = useQuery({
    queryKey: ["/api/recipient-lists", parseInt(selectedListId), "recipients"],
    enabled: !!selectedListId,
    retry: false,
  });

  const form = useForm({
    resolver: zodResolver(personalizationSchema),
    defaultValues: {
      emailType: "",
      tone: "",
      maxCharacters: 500,
      callToAction: "",
    },
  });

  const personalizeListMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", `/api/recipient-lists/${selectedListId}/personalize`, data);
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Success",
        description: `Personalized ${result.personalizedCount} emails successfully`,
      });
      setIsPersonalizeOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/recipient-lists", parseInt(selectedListId), "recipients"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const personalizeSingleMutation = useMutation({
    mutationFn: async ({ recipientId, data }: { recipientId: number; data: any }) => {
      const response = await apiRequest("POST", `/api/recipients/${recipientId}/personalize`, data);
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Success",
        description: "Email personalized successfully",
      });
      setPreviewEmail(result.personalizedEmail);
      setIsPreviewOpen(true);
      queryClient.invalidateQueries({ queryKey: ["/api/recipient-lists", parseInt(selectedListId), "recipients"] });
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

  const handlePersonalizeSingle = (recipientId: number) => {
    const formData = form.getValues();
    if (!formData.emailType || !formData.tone || !formData.callToAction) {
      toast({
        title: "Error",
        description: "Please configure personalization settings first",
        variant: "destructive",
      });
      return;
    }
    personalizeSingleMutation.mutate({ recipientId, data: formData });
  };

  const recipientsWithWebsites = recipients?.filter((r: any) => r.websiteLink) || [];
  const personalizedCount = recipients?.filter((r: any) => r.personalizedEmail).length || 0;

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Email Personalization</h1>
            <p className="text-slate-600 mt-1">Use AI to create personalized emails based on website content</p>
          </div>
          
          <Dialog open={isPersonalizeOpen} onOpenChange={setIsPersonalizeOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90" disabled={!selectedListId}>
                <Sparkles className="h-4 w-4 mr-2" />
                Configure AI Settings
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>AI Personalization Settings</DialogTitle>
                <DialogDescription>
                  Configure how AI should personalize your emails
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                    name="maxCharacters"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maximum Characters</FormLabel>
                        <FormControl>
                          <Input type="number" min="50" max="2000" {...field} />
                        </FormControl>
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
                          <Textarea 
                            placeholder="Schedule a 15-minute demo to see how we can help..."
                            rows={3}
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
                      onClick={() => setIsPersonalizeOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      disabled={personalizeListMutation.isPending}
                    >
                      {personalizeListMutation.isPending ? "Personalizing..." : "Personalize All"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* List Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Recipient List</CardTitle>
            <CardDescription>Choose a list to personalize emails using AI and website content</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedListId} onValueChange={setSelectedListId}>
              <SelectTrigger className="max-w-md">
                <SelectValue placeholder="Select a recipient list" />
              </SelectTrigger>
              <SelectContent>
                {recipientLists?.map((list: any) => (
                  <SelectItem key={list.id} value={list.id.toString()}>
                    {list.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Personalization Stats */}
        {selectedListId && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total Recipients</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {recipients?.length || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">With Websites</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">
                      {recipientsWithWebsites.length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Globe className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Personalized</p>
                    <p className="text-2xl font-bold text-purple-600 mt-1">
                      {personalizedCount}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Wand2 className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recipients Table */}
        {selectedListId && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Personalization Results</CardTitle>
                  <CardDescription>AI-generated personalized emails for each recipient</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export Personalized
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recipients && recipients.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Website</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Personalized Content</TableHead>
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
                            <p className="text-sm text-slate-500">{recipient.email}</p>
                            {recipient.companyName && (
                              <p className="text-sm text-slate-500">{recipient.companyName}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {recipient.websiteLink ? (
                            <div className="flex items-center space-x-2">
                              <Globe className="h-4 w-4 text-green-600" />
                              <a 
                                href={recipient.websiteLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:underline truncate max-w-[150px]"
                              >
                                {recipient.websiteLink}
                              </a>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">No website</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {recipient.personalizedEmail ? (
                            <Badge className="bg-green-100 text-green-800">
                              Personalized
                            </Badge>
                          ) : recipient.websiteLink ? (
                            <Badge variant="outline">
                              Ready
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              No Website
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          {recipient.personalizedEmail ? (
                            <div className="text-sm text-slate-600">
                              <p className="truncate">
                                {recipient.personalizedEmail.substring(0, 100)}...
                              </p>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">Not generated yet</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {recipient.personalizedEmail ? (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  setPreviewEmail(recipient.personalizedEmail);
                                  setIsPreviewOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            ) : recipient.websiteLink ? (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handlePersonalizeSingle(recipient.id)}
                                disabled={personalizeSingleMutation.isPending}
                              >
                                <Wand2 className="h-4 w-4" />
                              </Button>
                            ) : null}
                            {recipient.personalizedEmail && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handlePersonalizeSingle(recipient.id)}
                                disabled={personalizeSingleMutation.isPending}
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <Sparkles className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No recipients in this list</h3>
                  <p className="text-slate-600">Add recipients with websites to start personalizing emails</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Email Preview Dialog */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Personalized Email Preview</DialogTitle>
              <DialogDescription>
                AI-generated personalized email content
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-96 overflow-y-auto">
              <div className="bg-slate-50 p-4 rounded-lg">
                <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans">
                  {previewEmail}
                </pre>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setIsPreviewOpen(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* AI Tips */}
        <Card className="bg-purple-50 border-purple-200">
          <CardHeader>
            <CardTitle className="text-purple-900">AI Personalization Tips</CardTitle>
          </CardHeader>
          <CardContent className="text-purple-800">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <strong>Website Content:</strong> AI analyzes company websites to understand their business and create relevant content.
                </div>
                <div>
                  <strong>Tone Matters:</strong> Choose the right tone based on your industry and target audience.
                </div>
                <div>
                  <strong>Call to Action:</strong> Be specific about what you want the recipient to do next.
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <strong>Length Control:</strong> Shorter emails often perform better for cold outreach.
                </div>
                <div>
                  <strong>Review Before Sending:</strong> Always review AI-generated content before using in campaigns.
                </div>
                <div>
                  <strong>A/B Testing:</strong> Test different personalization approaches to optimize results.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
