import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Layout from "@/components/Layout";
import InstructionBox from "@/components/InstructionBox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Mail, Trash, Settings, CheckCircle, XCircle, Flame, FlameKindling, Info, ExternalLink } from "lucide-react";
import { FaGoogle, FaYahoo, FaMicrosoft } from "react-icons/fa";
import { SiZoho } from "react-icons/si";

const providers = [
  { value: "google", label: "Gmail", icon: FaGoogle, color: "text-red-500" },
  { value: "outlook", label: "Outlook", icon: FaMicrosoft, color: "text-blue-500" },
  { value: "yahoo", label: "Yahoo", icon: FaYahoo, color: "text-purple-500" },
  { value: "zoho", label: "Zoho", icon: SiZoho, color: "text-orange-500" },
  { value: "custom", label: "Custom SMTP", icon: Mail, color: "text-gray-500" },
];

const baseSchema = z.object({
  email: z.string().email("Valid email is required"),
  fromName: z.string().min(1, "From name is required"),
  provider: z.enum(["google", "outlook", "yahoo", "zoho", "custom"]),
  connectionType: z.enum(["oauth", "smtp"]),
});

const smtpSchema = baseSchema.extend({
  smtpHost: z.string().min(1, "SMTP host is required"),
  smtpPort: z.coerce.number().min(1, "SMTP port is required"),
  smtpUsername: z.string().min(1, "SMTP username is required"),
  smtpPassword: z.string().min(1, "SMTP password is required"),
  imapHost: z.string().min(1, "IMAP host is required"),
  imapPort: z.coerce.number().min(1, "IMAP port is required"),
  imapUsername: z.string().min(1, "IMAP username is required"),
  imapPassword: z.string().min(1, "IMAP password is required"),
});

const oauthSchema = baseSchema.extend({
  smtpHost: z.string().optional(),
  smtpPort: z.coerce.number().optional(),
  smtpUsername: z.string().optional(),
  smtpPassword: z.string().optional(),
  imapHost: z.string().optional(),
  imapPort: z.coerce.number().optional(),
  imapUsername: z.string().optional(),
  imapPassword: z.string().optional(),
});

const integrationSchema = z.discriminatedUnion("connectionType", [
  smtpSchema.extend({ connectionType: z.literal("smtp") }),
  oauthSchema.extend({ connectionType: z.literal("oauth") }),
]);

export default function EmailIntegrations() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: integrations, isLoading } = useQuery({
    queryKey: ["/api/email-integrations"],
    retry: false,
  });

  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [connectionType, setConnectionType] = useState<"oauth" | "smtp">("oauth");

  const form = useForm({
    resolver: zodResolver(integrationSchema),
    defaultValues: {
      email: "",
      fromName: "",
      provider: "google" as const,
      connectionType: "oauth" as const,
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

  const watchedProvider = form.watch("provider");
  const watchedConnectionType = form.watch("connectionType");

  const createIntegrationMutation = useMutation({
    mutationFn: async (data: any) => {
      if (data.connectionType === "oauth" && data.provider === "google") {
        // Initiate Gmail OAuth flow
        const response = await apiRequest("POST", "/api/email-integrations/gmail-auth-url", {
          email: data.email,
          fromName: data.fromName,
        });
        const result = await response.json();
        window.location.href = result.authUrl;
        return;
      } else {
        // Create SMTP integration
        await apiRequest("POST", "/api/email-integrations", data);
      }
    },
    onSuccess: () => {
      if (form.getValues("connectionType") === "smtp") {
        toast({
          title: "Success",
          description: "Email integration created and verified successfully",
        });
        setIsCreateOpen(false);
        form.reset();
        queryClient.invalidateQueries({ queryKey: ["/api/email-integrations"] });
      }
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

  const onSubmit = async (data: any) => {
    console.log('Form submission data:', data);
    
    // Handle OAuth flow for Gmail
    if (data.connectionType === "oauth" && data.provider === "google") {
      try {
        const response = await apiRequest("POST", "/api/email-integrations/gmail-auth-url");
        const result = await response.json();
        if (result.authUrl) {
          window.open(result.authUrl, "_blank", "width=500,height=600");
          setIsCreateOpen(false);
          toast({
            title: "Authorization Required",
            description: "Please complete the Gmail authorization in the popup window.",
          });
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to initiate Gmail authorization",
          variant: "destructive",
        });
      }
      return;
    }

    // Handle SMTP/IMAP integration
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
        {/* Instruction Box */}
        <InstructionBox
          id="email-integrations-intro"
          title="Getting Started with Email Integrations"
          content="Connect your email accounts to send campaigns. Gmail users can use secure OAuth authentication, while other providers require SMTP/IMAP credentials from your email settings."
        />

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
                  {/* Provider Selection */}
                  <FormField
                    control={form.control}
                    name="provider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Provider</FormLabel>
                        <Select onValueChange={(value) => {
                          field.onChange(value);
                          // Set connection type and defaults based on provider
                          if (value === "google") {
                            form.setValue("connectionType", "oauth");
                            // Set Gmail SMTP/IMAP defaults for manual setup
                            form.setValue("smtpHost", "smtp.gmail.com");
                            form.setValue("smtpPort", 587);
                            form.setValue("imapHost", "imap.gmail.com");
                            form.setValue("imapPort", 993);
                          } else {
                            form.setValue("connectionType", "smtp");
                            // Set defaults for other providers
                            if (value === "outlook") {
                              form.setValue("smtpHost", "smtp-mail.outlook.com");
                              form.setValue("smtpPort", 587);
                              form.setValue("imapHost", "outlook.office365.com");
                              form.setValue("imapPort", 993);
                            } else if (value === "yahoo") {
                              form.setValue("smtpHost", "smtp.mail.yahoo.com");
                              form.setValue("smtpPort", 587);
                              form.setValue("imapHost", "imap.mail.yahoo.com");
                              form.setValue("imapPort", 993);
                            } else if (value === "zoho") {
                              form.setValue("smtpHost", "smtp.zoho.com");
                              form.setValue("smtpPort", 587);
                              form.setValue("imapHost", "imap.zoho.com");
                              form.setValue("imapPort", 993);
                            }
                          }
                        }} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your email provider" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {providers.map((provider) => (
                              <SelectItem key={provider.value} value={provider.value}>
                                <div className="flex items-center space-x-2">
                                  <provider.icon className={`h-4 w-4 ${provider.color}`} />
                                  <span>{provider.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                    <FormField
                      control={form.control}
                      name="fromName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>From Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your Company Name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Connection Type - Only show for Gmail */}
                  {watchedProvider === "google" && (
                    <FormField
                      control={form.control}
                      name="connectionType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Connection Method</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="oauth">
                                <div className="flex items-center space-x-2">
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                  <span>OAuth (Recommended)</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="smtp">
                                <div className="flex items-center space-x-2">
                                  <Settings className="h-4 w-4 text-gray-500" />
                                  <span>Manual SMTP/IMAP</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* OAuth Connection */}
                  {watchedConnectionType === "oauth" && watchedProvider === "google" && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <FaGoogle className="h-5 w-5 text-red-500" />
                        <h3 className="font-medium text-blue-900">Connect with Gmail</h3>
                      </div>
                      <p className="text-sm text-blue-700 mb-4">
                        Click "Connect with Gmail" to authorize EmailReach to send emails through your Gmail account.
                        This is the most secure and reliable method.
                      </p>
                    </div>
                  )}

                  {/* Provider-specific instructions */}
                  {watchedProvider && watchedProvider !== "google" && watchedConnectionType === "smtp" && (
                    <Alert className="border-amber-200 bg-amber-50">
                      <Info className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-800">
                        {watchedProvider === "outlook" && (
                          <>
                            <strong>Outlook/Hotmail Setup:</strong> Enable "SMTP authentication" in your Outlook settings. 
                            Use SMTP: smtp-mail.outlook.com:587, IMAP: outlook.office365.com:993.
                            <a href="https://support.microsoft.com/en-us/office/pop-imap-and-smtp-settings-8361e398-8af4-4e97-b147-6c6c4ac95353" target="_blank" rel="noopener noreferrer" className="ml-2 text-amber-700 hover:text-amber-900 inline-flex items-center">
                              View Guide <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          </>
                        )}
                        {watchedProvider === "yahoo" && (
                          <>
                            <strong>Yahoo Setup:</strong> Generate an "App Password" in Yahoo Security settings. 
                            Use SMTP: smtp.mail.yahoo.com:587, IMAP: imap.mail.yahoo.com:993.
                            <a href="https://help.yahoo.com/kb/generate-third-party-passwords-sln15241.html" target="_blank" rel="noopener noreferrer" className="ml-2 text-amber-700 hover:text-amber-900 inline-flex items-center">
                              View Guide <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          </>
                        )}
                        {watchedProvider === "zoho" && (
                          <>
                            <strong>Zoho Setup:</strong> Use your regular Zoho password or generate an App-specific password. 
                            Use SMTP: smtp.zoho.com:587, IMAP: imap.zoho.com:993.
                            <a href="https://www.zoho.com/mail/help/admins/pop-imap-settings.html" target="_blank" rel="noopener noreferrer" className="ml-2 text-amber-700 hover:text-amber-900 inline-flex items-center">
                              View Guide <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          </>
                        )}
                        {watchedProvider === "custom" && (
                          <>
                            <strong>Custom SMTP Setup:</strong> Contact your email provider for SMTP/IMAP settings. 
                            You'll need the server addresses, ports, and authentication details.
                          </>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* SMTP Configuration */}
                  {(watchedConnectionType === "smtp" || watchedProvider === "custom") && (
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
                  )}

                  <div className="flex items-center justify-end space-x-3">
                    <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createIntegrationMutation.isPending}>
                      {createIntegrationMutation.isPending ? "Connecting..." : 
                       watchedConnectionType === "oauth" && watchedProvider === "google" ? "Connect with Gmail" :
                       "Add Integration"}
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
                <strong>Gmail Users:</strong> You need an App Password (16 characters like "iyugpyatfbwcjiod"). 
                Go to Google Account → Security → 2-Step Verification → App passwords → Generate password.
                <br />
                <em>Use smtp.gmail.com:587 for SMTP and imap.gmail.com:993 for IMAP</em>
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
