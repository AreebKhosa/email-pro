import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Settings, 
  Key, 
  Mail, 
  CreditCard, 
  ExternalLink, 
  Eye, 
  EyeOff, 
  Save,
  LogOut,
  Shield,
  CheckCircle,
  AlertTriangle
} from "lucide-react";

const configSchema = z.object({
  geminiApiKey: z.string().optional(),
  stripeSecretKey: z.string().optional(),
  stripePublicKey: z.string().optional(),
  stripeStarterPriceId: z.string().optional(),
  stripeProPriceId: z.string().optional(),
  stripePremiumPriceId: z.string().optional(),
  googleClientId: z.string().optional(),
  googleClientSecret: z.string().optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.coerce.number().optional(),
  smtpUsername: z.string().optional(),
  smtpPassword: z.string().optional(),
  smtpFromEmail: z.string().email().optional().or(z.literal("")),
});

type ConfigFormData = z.infer<typeof configSchema>;

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  // Check admin auth
  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
      navigate('/admin/login');
    }
  }, [navigate]);

  const { data: config, isLoading } = useQuery({
    queryKey: ["/api/admin/config"],
    queryFn: async () => {
      const token = localStorage.getItem('adminToken');
      const response = await fetch("/api/admin/config", {
        method: "GET",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
  });

  const form = useForm<ConfigFormData>({
    resolver: zodResolver(configSchema),
    defaultValues: config || {}
  });

  // Update form when config loads
  useEffect(() => {
    if (config) {
      form.reset(config);
    }
  }, [config, form]);

  const updateConfigMutation = useMutation({
    mutationFn: async (data: ConfigFormData) => {
      const token = localStorage.getItem('adminToken');
      const response = await fetch("/api/admin/config", {
        method: "PUT",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update configuration');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Configuration updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/config"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update configuration",
        variant: "destructive",
      });
    }
  });

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin/login');
  };

  const toggleKeyVisibility = (key: string) => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const maskKey = (key: string | undefined, keyName: string) => {
    if (!key) return "Not set";
    if (showKeys[keyName]) return key;
    return key.substring(0, 8) + "••••••••••••••••";
  };

  const onSubmit = (data: ConfigFormData) => {
    updateConfigMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <Shield className="h-4 w-4 text-red-600" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Admin Panel</h1>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">System Configuration</h2>
          <p className="text-gray-600">Manage API keys, integrations, and system settings</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Tabs defaultValue="api-keys" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="api-keys">API Keys</TabsTrigger>
                <TabsTrigger value="stripe">Stripe</TabsTrigger>
                <TabsTrigger value="oauth">OAuth</TabsTrigger>
                <TabsTrigger value="smtp">SMTP</TabsTrigger>
              </TabsList>

              {/* API Keys Tab */}
              <TabsContent value="api-keys" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Key className="h-5 w-5" />
                      <span>API Keys</span>
                    </CardTitle>
                    <CardDescription>
                      Configure external service API keys for system functionality
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        API keys are stored securely and encrypted. Only you can view the full keys.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <FormField
                            control={form.control}
                            name="geminiApiKey"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-medium">Gemini API Key</FormLabel>
                                <p className="text-sm text-gray-600 mb-2">For AI-powered email personalization</p>
                                <FormControl>
                                  <div className="flex space-x-2">
                                    <Input 
                                      type={showKeys['gemini'] ? "text" : "password"}
                                      placeholder="AIza..." 
                                      {...field} 
                                      className="flex-1"
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      onClick={() => toggleKeyVisibility('gemini')}
                                    >
                                      {showKeys['gemini'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="ml-4">
                          <Badge variant={config?.geminiApiKey ? "default" : "secondary"}>
                            {config?.geminiApiKey ? "Configured" : "Not Set"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Stripe Tab */}
              <TabsContent value="stripe" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <CreditCard className="h-5 w-5" />
                      <span>Stripe Configuration</span>
                    </CardTitle>
                    <CardDescription>
                      Configure Stripe for payment processing and subscriptions
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <FormField
                            control={form.control}
                            name="stripeSecretKey"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-medium">Stripe Secret Key</FormLabel>
                                <p className="text-sm text-gray-600 mb-2">Server-side key for processing payments</p>
                                <FormControl>
                                  <div className="flex space-x-2">
                                    <Input 
                                      type={showKeys['stripe_secret'] ? "text" : "password"}
                                      placeholder="sk_live_... or sk_test_..." 
                                      {...field} 
                                      className="flex-1"
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      onClick={() => toggleKeyVisibility('stripe_secret')}
                                    >
                                      {showKeys['stripe_secret'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="ml-4">
                          <Badge variant={config?.stripeSecretKey ? "default" : "secondary"}>
                            {config?.stripeSecretKey ? "Configured" : "Not Set"}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <FormField
                            control={form.control}
                            name="stripePublicKey"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-medium">Stripe Public Key</FormLabel>
                                <p className="text-sm text-gray-600 mb-2">Client-side key for frontend integration</p>
                                <FormControl>
                                  <div className="flex space-x-2">
                                    <Input 
                                      type={showKeys['stripe_public'] ? "text" : "password"}
                                      placeholder="pk_live_... or pk_test_..." 
                                      {...field} 
                                      className="flex-1"
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      onClick={() => toggleKeyVisibility('stripe_public')}
                                    >
                                      {showKeys['stripe_public'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="ml-4">
                          <Badge variant={config?.stripePublicKey ? "default" : "secondary"}>
                            {config?.stripePublicKey ? "Configured" : "Not Set"}
                          </Badge>
                        </div>
                      </div>

                      {/* Price ID Configuration */}
                      <div className="space-y-4 mt-6 p-4 border rounded-lg bg-gray-50">
                        <h4 className="text-lg font-medium">Subscription Price IDs</h4>
                        <p className="text-sm text-gray-600">Configure Stripe Price IDs for each subscription plan. Get these from your Stripe Dashboard → Products.</p>
                        
                        <div className="grid grid-cols-1 gap-4">
                          <FormField
                            control={form.control}
                            name="stripeStarterPriceId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Starter Plan Price ID</FormLabel>
                                <FormControl>
                                  <Input placeholder="price_..." {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="stripeProPriceId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Pro Plan Price ID</FormLabel>
                                <FormControl>
                                  <Input placeholder="price_..." {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="stripePremiumPriceId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Premium Plan Price ID</FormLabel>
                                <FormControl>
                                  <Input placeholder="price_..." {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* OAuth Tab */}
              <TabsContent value="oauth" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <ExternalLink className="h-5 w-5" />
                      <span>OAuth Configuration</span>
                    </CardTitle>
                    <CardDescription>
                      Configure OAuth providers for user authentication
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <FormField
                            control={form.control}
                            name="googleClientId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-medium">Google Client ID</FormLabel>
                                <p className="text-sm text-gray-600 mb-2">For Google OAuth authentication</p>
                                <FormControl>
                                  <Input 
                                    placeholder="123456789.apps.googleusercontent.com" 
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="ml-4">
                          <Badge variant={config?.googleClientId ? "default" : "secondary"}>
                            {config?.googleClientId ? "Configured" : "Not Set"}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <FormField
                            control={form.control}
                            name="googleClientSecret"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-medium">Google Client Secret</FormLabel>
                                <p className="text-sm text-gray-600 mb-2">Secret key for Google OAuth</p>
                                <FormControl>
                                  <div className="flex space-x-2">
                                    <Input 
                                      type={showKeys['google_secret'] ? "text" : "password"}
                                      placeholder="GOCSPX-..." 
                                      {...field} 
                                      className="flex-1"
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      onClick={() => toggleKeyVisibility('google_secret')}
                                    >
                                      {showKeys['google_secret'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="ml-4">
                          <Badge variant={config?.googleClientSecret ? "default" : "secondary"}>
                            {config?.googleClientSecret ? "Configured" : "Not Set"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* SMTP Tab */}
              <TabsContent value="smtp" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Mail className="h-5 w-5" />
                      <span>SMTP Configuration</span>
                    </CardTitle>
                    <CardDescription>
                      Configure SMTP settings for sending system emails
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                              <Input placeholder="your-email@gmail.com" {...field} />
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
                              <div className="flex space-x-2">
                                <Input 
                                  type={showKeys['smtp'] ? "text" : "password"}
                                  placeholder="app-password" 
                                  {...field} 
                                  className="flex-1"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => toggleKeyVisibility('smtp')}
                                >
                                  {showKeys['smtp'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="smtpFromEmail"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>From Email Address</FormLabel>
                            <FormControl>
                              <Input placeholder="noreply@yourcompany.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Save Button */}
              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  size="lg" 
                  disabled={updateConfigMutation.isPending}
                  className="min-w-[120px]"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateConfigMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </Tabs>
          </form>
        </Form>
      </div>
    </div>
  );
}