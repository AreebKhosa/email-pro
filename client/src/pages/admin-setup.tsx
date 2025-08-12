import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Mail, Settings, CheckCircle, AlertTriangle } from "lucide-react";

const adminEmailSchema = z.object({
  email: z.string().email("Valid email is required"),
  smtpHost: z.string().min(1, "SMTP host is required"),
  smtpPort: z.coerce.number().min(1, "SMTP port is required"),
  smtpUsername: z.string().min(1, "SMTP username is required"),
  smtpPassword: z.string().min(1, "SMTP password is required"),
  connectionType: z.literal("smtp")
});

type AdminEmailFormData = z.infer<typeof adminEmailSchema>;

export default function AdminSetup() {
  const [successMessage, setSuccessMessage] = useState("");
  const { toast } = useToast();

  const form = useForm<AdminEmailFormData>({
    resolver: zodResolver(adminEmailSchema),
    defaultValues: {
      email: "",
      smtpHost: "",
      smtpPort: 587,
      smtpUsername: "",
      smtpPassword: "",
      connectionType: "smtp"
    }
  });

  const setupAdminMutation = useMutation({
    mutationFn: async (data: AdminEmailFormData) => {
      // First create admin user
      const adminUser = await apiRequest("POST", "/api/admin/setup", {
        email: data.email,
        firstName: "Admin",
        lastName: "User",
        password: "admin123456" // You should change this
      });
      
      // Then add email integration
      const integration = await apiRequest("POST", "/api/email-integrations", {
        ...data,
        isVerified: true
      });
      
      return { adminUser: await adminUser.json(), integration: await integration.json() };
    },
    onSuccess: (data) => {
      setSuccessMessage("Admin email configured successfully! You can now send verification emails.");
      toast({
        title: "Success",
        description: "Admin email configured successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to setup admin email",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: AdminEmailFormData) => {
    setupAdminMutation.mutate(data);
  };

  if (successMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-800">Setup Complete!</CardTitle>
            <CardDescription className="text-green-600">
              {successMessage}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> The admin account was created with email: {form.getValues('email')} and password: "admin123456". 
                Please change this password immediately after logging in.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <Settings className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-800">Admin Email Setup</CardTitle>
          <CardDescription>
            Configure the admin email for sending verification and reset emails
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <Mail className="h-4 w-4" />
            <AlertDescription>
              This email will be used to send verification and password reset emails to new users.
              Make sure you have SMTP credentials for this email account.
            </AlertDescription>
          </Alert>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admin Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="admin@yourcompany.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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

              <div className="grid grid-cols-2 gap-4">
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
                  name="connectionType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Connection Type</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="smtp">SMTP</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="smtpUsername"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SMTP Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Usually your email address" {...field} />
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
                      <Input type="password" placeholder="Your email password or app password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Gmail users:</strong> You'll need to use an "App Password" instead of your regular password. 
                  Enable 2FA and generate an app password in your Google Account settings.
                </AlertDescription>
              </Alert>

              <Button 
                type="submit" 
                className="w-full" 
                size="lg" 
                disabled={setupAdminMutation.isPending}
              >
                {setupAdminMutation.isPending ? "Setting up..." : "Setup Admin Email"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}