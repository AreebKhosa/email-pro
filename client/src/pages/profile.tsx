import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { User, Mail, Calendar, Shield, Star } from "lucide-react";

export default function Profile() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || ''
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof editData) => {
      const response = await apiRequest("PATCH", "/api/profile", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    }
  });

  const handleSave = () => {
    updateProfileMutation.mutate(editData);
  };

  const handleCancel = () => {
    setEditData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || ''
    });
    setIsEditing(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const displayName = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user?.email?.split('@')[0] || 'User';

  const getPlanBadgeVariant = (plan: string) => {
    switch (plan) {
      case 'premium': return 'default';
      case 'pro': return 'secondary';
      case 'starter': return 'outline';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-600">Manage your account settings and preferences</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Overview */}
        <Card className="md:col-span-1">
          <CardHeader className="text-center">
            <Avatar className="h-24 w-24 mx-auto mb-4">
              <AvatarImage src={user?.profileImageUrl} alt={displayName} />
              <AvatarFallback className="text-lg">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <CardTitle className="text-xl">{displayName}</CardTitle>
            <div className="flex items-center justify-center gap-2">
              <Mail className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">{user?.email}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Plan</span>
              <Badge variant={getPlanBadgeVariant(user?.plan || 'demo')}>
                <Star className="h-3 w-3 mr-1" />
                {user?.plan?.charAt(0).toUpperCase() + user?.plan?.slice(1) || 'Demo'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Member since</span>
              <span className="text-sm text-gray-600">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              <Badge variant="outline">
                <Shield className="h-3 w-3 mr-1" />
                Active
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Profile Details */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <p className="text-sm text-gray-600">Update your personal details</p>
            </div>
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)} variant="outline">
                Edit Profile
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button onClick={handleCancel} variant="outline" size="sm">
                  Cancel
                </Button>
                <Button 
                  onClick={handleSave} 
                  size="sm"
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                {isEditing ? (
                  <Input
                    id="firstName"
                    value={editData.firstName}
                    onChange={(e) => setEditData(prev => ({ ...prev, firstName: e.target.value }))}
                    className="mt-1"
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-900">{user?.firstName || 'Not set'}</p>
                )}
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                {isEditing ? (
                  <Input
                    id="lastName"
                    value={editData.lastName}
                    onChange={(e) => setEditData(prev => ({ ...prev, lastName: e.target.value }))}
                    className="mt-1"
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-900">{user?.lastName || 'Not set'}</p>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email Address</Label>
              {isEditing ? (
                <Input
                  id="email"
                  type="email"
                  value={editData.email}
                  onChange={(e) => setEditData(prev => ({ ...prev, email: e.target.value }))}
                  className="mt-1"
                />
              ) : (
                <p className="mt-1 text-sm text-gray-900">{user?.email}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Account Stats */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Account Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{user?.campaignCount || 0}</p>
                <p className="text-sm text-gray-600">Campaigns Created</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{user?.emailsSent || 0}</p>
                <p className="text-sm text-gray-600">Emails Sent</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{user?.recipientCount || 0}</p>
                <p className="text-sm text-gray-600">Recipients Managed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">{user?.integrationCount || 0}</p>
                <p className="text-sm text-gray-600">Email Integrations</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}