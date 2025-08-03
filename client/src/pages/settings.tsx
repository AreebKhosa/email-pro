import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from '@uppy/core';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  User, 
  Shield, 
  CreditCard,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Trash2,
  Download,
  Camera
} from "lucide-react";

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
});



export default function Settings() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: dashboardData } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    retry: false,
  });



  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
    },
  });

  // Update form values when user data changes
  useEffect(() => {
    if (user && typeof user === 'object') {
      profileForm.setValue("firstName", (user as any).firstName || "");
      profileForm.setValue("lastName", (user as any).lastName || "");
      profileForm.setValue("email", (user as any).email || "");
    }
  }, [user, profileForm]);



  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PATCH", "/api/profile", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateNotificationsMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("PUT", "/api/notifications", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Notification preferences updated",
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

  const exportDataMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", "/api/export-data");
      return response.blob();
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'emailreach-data-export.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast({
        title: "Success",
        description: "Data export downloaded successfully",
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

  const onUpdateProfile = (data: any) => {
    updateProfileMutation.mutate(data);
  };



  const handleExportData = () => {
    exportDataMutation.mutate();
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  // Profile picture upload handlers
  const handleGetUploadParameters = async () => {
    const response = await apiRequest("POST", "/api/objects/upload");
    const data = await response.json();
    return {
      method: 'PUT' as const,
      url: data.uploadURL,
    };
  };

  const handleUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadURL = result.successful[0].uploadURL;
      try {
        await apiRequest("PUT", "/api/profile/picture", { profileImageURL: uploadURL });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        toast({
          title: "Success",
          description: "Profile picture updated successfully",
        });
      } catch (error) {
        toast({
          title: "Error", 
          description: "Failed to update profile picture",
          variant: "destructive",
        });
      }
    }
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "security", label: "Security", icon: Shield },
    { id: "billing", label: "Billing", icon: CreditCard },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-600 mt-1">Manage your account settings and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Settings Navigation */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Settings</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <nav className="space-y-1">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 text-left rounded-lg transition-colors ${
                        activeTab === tab.id
                          ? 'bg-primary/10 text-primary border-r-2 border-primary'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <tab.icon className="h-5 w-5" />
                      <span className="font-medium">{tab.label}</span>
                    </button>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Settings Content */}
          <div className="lg:col-span-3">
            {activeTab === "profile" && (
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Update your personal information and account details</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit(onUpdateProfile)} className="space-y-6">
                      <div className="flex items-center space-x-6">
                        <Avatar className="w-16 h-16">
                          <AvatarImage 
                            src={(user as any)?.profileImageUrl || undefined} 
                            alt={`${(user as any)?.firstName || 'User'} ${(user as any)?.lastName || ''}`}
                          />
                          <AvatarFallback className="bg-primary/10">
                            {(user as any)?.firstName ? (user as any).firstName.charAt(0).toUpperCase() : 'U'}
                            {(user as any)?.lastName ? (user as any).lastName.charAt(0).toUpperCase() : ''}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-medium text-slate-900">Profile Picture</h3>
                          <p className="text-sm text-slate-600">Update your profile photo</p>
                          <ObjectUploader
                            maxNumberOfFiles={1}
                            maxFileSize={5242880} // 5MB
                            onGetUploadParameters={handleGetUploadParameters}
                            onComplete={handleUploadComplete}
                            buttonClassName="mt-2"
                          >
                            <Camera className="h-4 w-4 mr-2" />
                            Change Photo
                          </ObjectUploader>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={profileForm.control}
                          name="firstName"
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
                          control={profileForm.control}
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
                        control={profileForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="john@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex items-center space-x-2">
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                        <span className="text-sm text-slate-600">Your email is verified</span>
                      </div>

                      <Button type="submit" disabled={updateProfileMutation.isPending}>
                        {updateProfileMutation.isPending ? "Updating..." : "Update Profile"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}

            {activeTab === "notifications" && (
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>Choose what notifications you want to receive</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...notificationForm}>
                    <form onSubmit={notificationForm.handleSubmit(onUpdateNotifications)} className="space-y-6">
                      <div className="space-y-6">
                        <FormField
                          control={notificationForm.control}
                          name="campaignNotifications"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between space-y-0">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base font-medium">Campaign Notifications</FormLabel>
                                <p className="text-sm text-slate-600">Get notified when campaigns are sent or completed</p>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={notificationForm.control}
                          name="deliverabilityAlerts"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between space-y-0">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base font-medium">Deliverability Alerts</FormLabel>
                                <p className="text-sm text-slate-600">Receive alerts about delivery issues and bounces</p>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={notificationForm.control}
                          name="usageWarnings"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between space-y-0">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base font-medium">Usage Warnings</FormLabel>
                                <p className="text-sm text-slate-600">Get warned when approaching plan limits</p>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={notificationForm.control}
                          name="marketingEmails"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between space-y-0">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base font-medium">Marketing Emails</FormLabel>
                                <p className="text-sm text-slate-600">Receive product updates and tips</p>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      <Button type="submit" disabled={updateNotificationsMutation.isPending}>
                        {updateNotificationsMutation.isPending ? "Saving..." : "Save Preferences"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}

            {activeTab === "security" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Account Security</CardTitle>
                    <CardDescription>Manage your account security settings</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium text-slate-900">Two-Factor Authentication</h3>
                        <p className="text-sm text-slate-600">Add an extra layer of security to your account</p>
                      </div>
                      <Badge variant="outline" className="text-yellow-600">
                        Not Enabled
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium text-slate-900">Login Notifications</h3>
                        <p className="text-sm text-slate-600">Get notified when someone logs into your account</p>
                      </div>
                      <Badge className="bg-green-100 text-green-800">
                        Enabled
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium text-slate-900">IP Verification</h3>
                        <p className="text-sm text-slate-600">Verify new login locations via email</p>
                      </div>
                      <Badge className="bg-green-100 text-green-800">
                        Enabled
                      </Badge>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h3 className="font-medium text-slate-900">Recent Activity</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span>Logged in from Chrome on Windows</span>
                          </div>
                          <span className="text-slate-500">2 hours ago</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span>Email integration added</span>
                          </div>
                          <span className="text-slate-500">Yesterday</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span>Campaign created</span>
                          </div>
                          <span className="text-slate-500">2 days ago</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-red-600">Danger Zone</CardTitle>
                    <CardDescription>Irreversible actions that affect your account</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                        <div>
                          <h3 className="font-medium text-red-900">Delete Account</h3>
                          <p className="text-sm text-red-700">Permanently delete your account and all data</p>
                        </div>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Account
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "billing" && (
              <Card>
                <CardHeader>
                  <CardTitle>Billing & Subscription</CardTitle>
                  <CardDescription>Manage your subscription and billing information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium text-slate-900">Current Plan</h3>
                      <p className="text-sm text-slate-600">Your current subscription plan</p>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-blue-100 text-blue-800 capitalize">
                        {(user as any)?.plan || 'Demo'}
                      </Badge>
                      <p className="text-sm text-slate-600 mt-1">
                        {(user as any)?.plan === 'demo' ? 'Free' : `$${(user as any)?.plan === 'starter' ? '14.99' : (user as any)?.plan === 'pro' ? '29.99' : '49.99'}/month`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium text-slate-900">Next Billing Date</h3>
                      <p className="text-sm text-slate-600">When your next payment is due</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-slate-900">
                        {(user as any)?.plan === 'demo' ? 'N/A' : (() => {
                          // Calculate next billing date based on creation date (30 days later)
                          const createdDate = new Date((user as any).createdAt);
                          const nextBilling = new Date(createdDate);
                          nextBilling.setMonth(nextBilling.getMonth() + 1);
                          return nextBilling.toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          });
                        })()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium text-slate-900">Payment Method</h3>
                      <p className="text-sm text-slate-600">Your default payment method</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-slate-900">
                        {(user as any)?.plan === 'demo' ? 'None' : '•••• •••• •••• 4242'}
                      </p>
                      <p className="text-sm text-slate-600">Expires 12/26</p>
                    </div>
                  </div>

                  

                  <div className="flex space-x-4">
                    <Button onClick={() => window.location.href = '/upgrade'}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Upgrade Plan
                    </Button>
                    <Button variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Download Invoice
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}




          </div>
        </div>
      </div>
    
  );
}
