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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Mail, Trash, Settings, CheckCircle, XCircle, Flame, FlameKindling } from "lucide-react";

const integrationSchema = z.object({
  email: z.string().email("Valid email is required"),
  smtpHost: z.string().min(1, "SMTP host is required"),
  smtpPort: z.coerce.number().min(1, "SMTP port is required"),
  smtpUsername: z.string().min(1, "SMTP username is required"),
  smtpPassword: z.string().min(1, "SMTP password is required"),
  imapHost: z.string().min(1, "IMAP host is required"),
  imapPort: z.coerce.number().min(1, "IMAP port is required"),
  imapUsername: z.string().min(1, "IMAP username is required"),
  imapPassword: z.string().min(1, "IMAP password is required"),
});

export default function EmailIntegrations() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: integrations, isLoading } = useQuery({
    queryKey: ["/api/email-integrations"],
    retry: false,
  });

  const form = useForm({
    resolver: zodResolver(integrationSchema),
    defaultValues: {
      email: "",
      smtpHost: "",
      smtpPort: 587,
      smtpUsername: "",
      smtpPassword: "",
      imapHost: "",
      imapPort: 993,
      imapUsername: "",
      imapPassword: "",
    },
  });

  const createIntegrationMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/email-integrations", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Email integration created and verified successfully",
      });
      setIsCreateOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/email-integrations"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleWarmupMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: number; enabled: boolean }) => {
      await apiRequest("POST", `/api/email-integrations/${id}/toggle-warmup`, { enabled });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Warm-up setting updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/email-integrations"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteIntegrationMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/email-integrations/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Email integration deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/email-integrations"] });
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
    createIntegrationMutation.mutate(data);
  };

  const handleToggleWarmup = (id: number, enabled: boolean) => {
    toggleWarmupMutation.mutate({ id, enabled });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this email integration?")) {
      deleteIntegrationMutation.mutate(id);
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
            <h1 className="text-3xl font-bold text-slate-900">Email Integrations</h1>
            <p className="text-slate-600 mt-1">Connect your email accounts for sending campaigns</p>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Add Integration
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Email Integration</DialogTitle>
                <DialogDescription>
                  Connect your SMTP and IMAP accounts to send emails through EmailReach
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input placeholder="your-email@domain.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* SMTP Settings */}
                    <div className="space-y-4">
                      <h3 className="font-medium text-slate-900">SMTP Settings (Outgoing)</h3>
                      
                      <FormField
                        control={form.control}
                        name="smtpHost"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SMTP Host</FormLabel>
                            <FormControl>
                              <Input placeholder="smtp.gmail.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="smtpPort"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SMTP Port</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="587" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="smtpUsername"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SMTP Username</FormLabel>
                            <FormControl>
                              <Input placeholder="your-email@domain.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="smtpPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SMTP Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* IMAP Settings */}
                    <div className="space-y-4">
                      <h3 className="font-medium text-slate-900">IMAP Settings (Incoming)</h3>
                      
                      <FormField
                        control={form.control}
                        name="imapHost"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>IMAP Host</FormLabel>
                            <FormControl>
                              <Input placeholder="imap.gmail.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="imapPort"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>IMAP Port</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="993" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="imapUsername"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>IMAP Username</FormLabel>
                            <FormControl>
                              <Input placeholder="your-email@domain.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="imapPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>IMAP Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Common Email Provider Settings</h4>
                    <div className="text-sm text-blue-800 space-y-2">
                      <div>
                        <strong>Gmail:</strong> SMTP: smtp.gmail.com:587, IMAP: imap.gmail.com:993
                      </div>
                      <div>
                        <strong>Outlook:</strong> SMTP: smtp-mail.outlook.com:587, IMAP: outlook.office365.com:993
                      </div>
                      <div>
                        <strong>Yahoo:</strong> SMTP: smtp.mail.yahoo.com:587, IMAP: imap.mail.yahoo.com:993
                      </div>
                    </div>
                  </div>

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
                      disabled={createIntegrationMutation.isPending}
                    >
                      {createIntegrationMutation.isPending ? "Testing Connection..." : "Add Integration"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Email Integrations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {integrations && integrations.length > 0 ? (
            integrations.map((integration: any) => (
              <Card key={integration.id} className="relative">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <Mail className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{integration.email}</CardTitle>
                        <div className="flex items-center space-x-2 mt-1">
                          {integration.isVerified ? (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <XCircle className="h-3 w-3 mr-1" />
                              Not Verified
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(integration.id)}
                      className="text-slate-400 hover:text-red-600"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {integration.warmupEnabled ? (
                        <Flame className="h-4 w-4 text-orange-500" />
                      ) : (
                        <FlameKindling className="h-4 w-4 text-slate-400" />
                      )}
                      <span className="text-sm font-medium text-slate-700">Warm-up</span>
                    </div>
                    <Switch
                      checked={integration.warmupEnabled}
                      onCheckedChange={(enabled) => handleToggleWarmup(integration.id, enabled)}
                      disabled={!integration.isVerified || toggleWarmupMutation.isPending}
                    />
                  </div>

                  <div className="text-sm text-slate-600 space-y-1">
                    <div>SMTP: {integration.smtpHost}:{integration.smtpPort}</div>
                    <div>IMAP: {integration.imapHost}:{integration.imapPort}</div>
                  </div>

                  <div className="pt-2 border-t">
                    <Button variant="outline" size="sm" className="w-full">
                      <Settings className="h-4 w-4 mr-2" />
                      Configure
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full">
              <Card>
                <CardContent className="text-center py-12">
                  <Mail className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No email integrations</h3>
                  <p className="text-slate-600 mb-4">
                    Connect your email accounts to start sending campaigns
                  </p>
                  <Button onClick={() => setIsCreateOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Integration
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Integration Help */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">Integration Help</CardTitle>
          </CardHeader>
          <CardContent className="text-blue-800">
            <div className="space-y-3">
              <div>
                <strong>Gmail Users:</strong> You'll need to generate an App Password instead of using your regular password. 
                Go to Google Account settings → Security → App passwords.
              </div>
              <div>
                <strong>Outlook Users:</strong> Make sure IMAP is enabled in your Outlook settings and use your full email address as the username.
              </div>
              <div>
                <strong>Custom Domains:</strong> Contact your email provider for the correct SMTP and IMAP settings.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
