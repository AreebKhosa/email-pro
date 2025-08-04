import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useLocation } from "wouter";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ArrowRight, Check, Mail, Users, FileText, Settings, Sparkles, Clock, RotateCw, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import RichTextEditor from "@/components/RichTextEditor";


interface RecipientList {
  id: number;
  name: string;
  description: string;
  recipientCount: number;
  createdAt: string;
}

interface EmailIntegration {
  id: number;
  email: string;
  name: string;
  provider: string;
  isVerified: boolean;
}

interface User {
  id: string;
  email: string;
  plan: string;
  firstName?: string;
  lastName?: string;
}

interface CampaignData {
  name: string;
  recipientListId: number;
  subject: string;
  body: string;
  dailyLimit: number;
  timeWindowStart: string;
  timeWindowEnd: string;
  rotateEmails: boolean;
  // Personalization settings
  personalizationEnabled: boolean;
  fallbackToDefault: boolean;
  dynamicFields: string[];
  emailIntegrationIds: number[];
  emailsPerAccount: number;
  emailDelay: number;
  followUpEnabled: boolean;
  followUpSubject: string;
  followUpBody: string;
  followUpCondition: 'not_opened' | 'no_reply';
  followUpDays: number;
}

const PLAN_LIMITS = {
  Demo: { emailAccounts: 1, followUps: false, dailyLimit: 50 },
  Starter: { emailAccounts: 3, followUps: true, dailyLimit: 200 },
  Pro: { emailAccounts: 10, followUps: true, dailyLimit: 1000 },
  Premium: { emailAccounts: 20, followUps: true, dailyLimit: 5000 },
};

const STEPS = [
  { id: 1, title: "Campaign Info", icon: "FileText" },
  { id: 2, title: "Select Recipients", icon: "Users" },
  { id: 3, title: "Write Email Content", icon: "Mail" },
  { id: 4, title: "Sending Settings", icon: "Settings" },
];

export default function CreateCampaign() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [campaignData, setCampaignData] = useState<CampaignData>({
    name: '',
    recipientListId: 0,
    subject: '',
    body: '',
    dailyLimit: 50,
    timeWindowStart: '08:00',
    timeWindowEnd: '17:00',
    rotateEmails: true, // Default to true for better deliverability
    emailIntegrationIds: [],
    emailsPerAccount: 1, // Default to 1 for maximum rotation (rotate after each email)
    emailDelay: 5, // Auto-optimized default (5 minutes for best deliverability)
    followUpEnabled: false,
    followUpSubject: '',
    followUpBody: '',
    followUpCondition: 'not_opened',
    followUpDays: 3,
    // Personalization defaults
    personalizationEnabled: true,
    fallbackToDefault: true,
    dynamicFields: [],
  });

  const { data: recipientLists } = useQuery({
    queryKey: ["/api/recipient-lists"],
    enabled: isAuthenticated,
  });

  const { data: emailIntegrations } = useQuery({
    queryKey: ["/api/email-integrations"],
    enabled: isAuthenticated,
  });

  // Get personalization status for selected list
  const { data: personalizationStatus } = useQuery({
    queryKey: ["/api/recipient-lists", campaignData.recipientListId, "personalization-status"],
    enabled: isAuthenticated && campaignData.recipientListId > 0,
    retry: false,
  });

  const enhanceEmailMutation = useMutation({
    mutationFn: async (emailBody: string) => {
      const response = await apiRequest("POST", "/api/ai/enhance-email", { body: emailBody });
      return response.json();
    },
    onSuccess: (data) => {
      setCampaignData(prev => ({ ...prev, body: data.enhancedBody }));
      toast({
        title: "Success",
        description: "Email content enhanced with AI",
      });
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
        description: error.message || "Failed to enhance email",
        variant: "destructive",
      });
    },
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (data: CampaignData) => {
      const response = await apiRequest("POST", "/api/campaigns", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Campaign created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      navigate("/campaigns");
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
        description: error.message || "Failed to create campaign",
        variant: "destructive",
      });
    },
  });

  const { data: userStats } = useQuery({
    queryKey: ["/api/user/stats"],
    enabled: isAuthenticated,
  });

  const planLimits = userStats?.planLimits || PLAN_LIMITS[user?.plan as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.Demo;
  const verifiedIntegrations = emailIntegrations?.filter((i: EmailIntegration) => i.isVerified) || [];

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    if (!campaignData.name || !campaignData.recipientListId || !campaignData.subject || !campaignData.body) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (campaignData.emailIntegrationIds.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one email account",
        variant: "destructive",
      });
      return;
    }

    // Prepare campaign payload with email rotation support
    const campaignPayload = {
      name: campaignData.name,
      recipientListId: campaignData.recipientListId,
      emailIntegrationId: campaignData.emailIntegrationIds[0], // Primary email for the campaign
      subject: campaignData.subject,
      body: campaignData.body,
      // Email rotation settings
      emailRotationEnabled: campaignData.rotateEmails,
      emailRotationIds: campaignData.emailIntegrationIds,
      emailsPerAccount: campaignData.emailsPerAccount,
      emailDelay: campaignData.emailDelay,
      dailyLimit: campaignData.dailyLimit,
      timeWindowStart: campaignData.timeWindowStart,
      timeWindowEnd: campaignData.timeWindowEnd,
      // Follow-up settings
      followUpEnabled: campaignData.followUpEnabled,
      followUpSubject: campaignData.followUpSubject,
      followUpBody: campaignData.followUpBody,
      followUpCondition: campaignData.followUpCondition,
      followUpDays: campaignData.followUpDays,
      // Personalization settings
      personalizationEnabled: campaignData.personalizationEnabled,
      fallbackToDefault: campaignData.fallbackToDefault,
      dynamicFields: campaignData.dynamicFields,
    };

    createCampaignMutation.mutate(campaignPayload);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return campaignData.name.trim() !== '';
      case 2:
        return campaignData.recipientListId > 0;
      case 3:
        return campaignData.subject.trim() !== '' && campaignData.body.trim() !== '';
      case 4:
        return campaignData.emailIntegrationIds.length > 0;
      default:
        return false;
    }
  };

  const selectedRecipientList = recipientLists?.find((list: RecipientList) => list.id === campaignData.recipientListId);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create Campaign</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Set up your email marketing campaign in 4 easy steps
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/campaigns")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Campaigns
          </Button>
        </div>

        {/* Progress Steps */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              {STEPS.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    currentStep >= step.id
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-gray-300 text-gray-400'
                  }`}>
                    {currentStep > step.id ? (
                      <Check className="w-5 h-5" />
                    ) : step.icon === "FileText" ? (
                      <FileText className="w-5 h-5" />
                    ) : step.icon === "Users" ? (
                      <Users className="w-5 h-5" />
                    ) : step.icon === "Mail" ? (
                      <Mail className="w-5 h-5" />
                    ) : (
                      <Settings className="w-5 h-5" />
                    )}
                  </div>
                  <div className="ml-3 min-w-0">
                    <p className={`text-sm font-medium ${
                      currentStep >= step.id ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      Step {step.id}
                    </p>
                    <p className={`text-sm ${
                      currentStep >= step.id ? 'text-gray-900 dark:text-white' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </p>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`w-16 h-0.5 mx-4 ${
                      currentStep > step.id ? 'bg-blue-600' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <Progress value={(currentStep / 4) * 100} className="h-2" />
          </CardContent>
        </Card>

        {/* Step Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {(() => {
                const currentStepData = STEPS.find(s => s.id === currentStep);
                if (!currentStepData) return null;
                
                if (currentStepData.icon === "FileText") return <FileText className="w-5 h-5" />;
                if (currentStepData.icon === "Users") return <Users className="w-5 h-5" />;
                if (currentStepData.icon === "Mail") return <Mail className="w-5 h-5" />;
                return <Settings className="w-5 h-5" />;
              })()}
              {STEPS.find(s => s.id === currentStep)?.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Campaign Info */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="campaign-name">Campaign Name *</Label>
                  <Input
                    id="campaign-name"
                    value={campaignData.name}
                    onChange={(e) => setCampaignData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter campaign name"
                    className="mt-2"
                  />
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  Give your campaign a descriptive name that helps you identify it later.
                </div>
              </div>
            )}

            {/* Step 2: Select Recipients */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div>
                  <Label>Select Recipient List *</Label>
                  <div className="mt-2 space-y-2">
                    {recipientLists?.map((list: RecipientList) => (
                      <div
                        key={list.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          campaignData.recipientListId === list.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setCampaignData(prev => ({ ...prev, recipientListId: list.id }))}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{list.name}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-300">{list.description}</p>
                          </div>
                          <Badge variant="secondary">
                            {list.recipientCount} recipients
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {!recipientLists?.length && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No recipient lists found. Create a recipient list first.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Step 3: Write Email Content */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="subject">Email Subject *</Label>
                  <Input
                    id="subject"
                    value={campaignData.subject}
                    onChange={(e) => setCampaignData(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Enter email subject"
                    className="mt-2"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="body">Email Body *</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => enhanceEmailMutation.mutate(campaignData.body)}
                      disabled={enhanceEmailMutation.isPending || !campaignData.body.trim()}
                      className="flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      {enhanceEmailMutation.isPending ? "Enhancing..." : "Enhance with AI"}
                    </Button>
                  </div>
                  <div className="space-y-4">
                    <RichTextEditor
                      value={campaignData.body}
                      onChange={(value) => setCampaignData(prev => ({ ...prev, body: value }))}
                      placeholder="Write your email content here..."
                      minHeight="300px"
                      personalizationStatus={personalizationStatus}
                    />
                    
                    
                    
                    {/* Personalization Status & Settings */}
                    <div className="border-t pt-4 space-y-4">
                      <h4 className="font-medium">Email Personalization Settings</h4>
                      
                      {/* Personalization Status Display */}
                      {personalizationStatus && campaignData.recipientListId > 0 && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                              Personalization Status
                            </span>
                            <Badge variant={personalizationStatus.hasAllPersonalized ? "default" : "secondary"}>
                              {personalizationStatus.personalizationPercentage}% Complete
                            </Badge>
                          </div>
                          <div className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                            {personalizationStatus.personalizedRecipients} of {personalizationStatus.totalRecipients} recipients have personalized emails
                          </div>
                          {personalizationStatus.hasAllPersonalized && (
                            <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              All recipients have personalized content - dynamic fields will show personalized previews
                            </div>
                          )}
                          {personalizationStatus.sampleData && personalizationStatus.sampleData.length > 0 && (
                            <div className="mt-3 text-xs">
                              <div className="font-medium text-blue-900 dark:text-blue-100 mb-2">Sample Recipients:</div>
                              {personalizationStatus.sampleData.slice(0, 2).map((sample: any, idx: number) => (
                                <div key={idx} className="text-blue-700 dark:text-blue-300">
                                  • {sample.name} ({sample.email}) {sample.company && `- ${sample.company}`}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="personalization-enabled"
                            checked={campaignData.personalizationEnabled}
                            onCheckedChange={(checked) => 
                              setCampaignData(prev => ({ ...prev, personalizationEnabled: checked as boolean }))
                            }
                          />
                          <Label htmlFor="personalization-enabled" className="text-sm">
                            Enable personalization fields in email content
                          </Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="fallback-enabled"
                            checked={campaignData.fallbackToDefault}
                            onCheckedChange={(checked) => 
                              setCampaignData(prev => ({ ...prev, fallbackToDefault: checked as boolean }))
                            }
                          />
                          <Label htmlFor="fallback-enabled" className="text-sm">
                            Send default content if personalized version unavailable
                          </Label>
                        </div>
                        
                        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                          <p>• When personalization is enabled, {`{personalize_email}`} will be replaced with AI-personalized content</p>
                          <p>• If fallback is disabled, emails without personalized content will be skipped</p>
                          <p>• If fallback is enabled, default content will be used when personalization is unavailable</p>
                          {personalizationStatus?.hasAllPersonalized && (
                            <p className="text-green-600 dark:text-green-400">
                              • All recipients have personalized emails - {`{personalize_email}`} will use AI-generated content
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="daily-limit">Daily Sending Limit</Label>
                    <Input
                      id="daily-limit"
                      type="number"
                      value={campaignData.dailyLimit}
                      onChange={(e) => setCampaignData(prev => ({ ...prev, dailyLimit: parseInt(e.target.value) || 50 }))}
                      min="1"
                      max={planLimits.dailyLimit}
                      className="mt-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Max {planLimits.dailyLimit} per day on {user?.plan || 'Demo'} plan
                    </p>
                  </div>
                  <div>
                    <Label>Schedule Time Window</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        type="time"
                        value={campaignData.timeWindowStart}
                        onChange={(e) => setCampaignData(prev => ({ ...prev, timeWindowStart: e.target.value }))}
                      />
                      <span className="text-sm text-gray-500">to</span>
                      <Input
                        type="time"
                        value={campaignData.timeWindowEnd}
                        onChange={(e) => setCampaignData(prev => ({ ...prev, timeWindowEnd: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Time Spacing Controls */}
                <div className="border-t pt-4">
                  <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Email Timing Settings
                  </h3>
                  <div className={`grid gap-4 ${user?.plan !== 'demo' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    <div>
                      <Label htmlFor="email-delay">Time Between Emails (minutes)</Label>
                      <Input
                        id="email-delay"
                        type="number"
                        value={campaignData.emailDelay}
                        onChange={(e) => setCampaignData(prev => ({ ...prev, emailDelay: parseInt(e.target.value) || 5 }))}
                        min="1"
                        max="60"
                        placeholder="5"
                        className="mt-2"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Recommended: 3-10 minutes for best deliverability
                      </p>
                    </div>
                    {/* Only show Emails Per Account for paid plans */}
                    {user?.plan !== 'demo' && (
                      <div>
                        <Label htmlFor="emails-per-account">Emails Per Account (if rotating)</Label>
                        <Input
                          id="emails-per-account"
                          type="number"
                          value={campaignData.emailsPerAccount}
                          onChange={(e) => setCampaignData(prev => ({ ...prev, emailsPerAccount: parseInt(e.target.value) || 30 }))}
                          min="1"
                          max="100"
                          placeholder="30"
                          className="mt-2"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Number of emails before switching accounts
                        </p>
                      </div>
                    )}
                  </div>
                  <Alert className="mt-3">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Auto-optimization:</strong> If left at default values, our system will automatically choose the best timing based on your recipient count and plan limits for optimal deliverability.
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
            )}

            {/* Step 4: Sending Settings */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <Label className="text-base font-medium">Email Account Selection</Label>
                  <div className="mt-3 space-y-2">
                    {verifiedIntegrations.map((integration: EmailIntegration) => (
                      <div
                        key={integration.id}
                        className="flex items-center space-x-2 p-3 border rounded-lg"
                      >
                        <Checkbox
                          id={`email-${integration.id}`}
                          checked={campaignData.emailIntegrationIds.includes(integration.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setCampaignData(prev => ({
                                ...prev,
                                emailIntegrationIds: [...prev.emailIntegrationIds, integration.id]
                              }));
                            } else {
                              setCampaignData(prev => ({
                                ...prev,
                                emailIntegrationIds: prev.emailIntegrationIds.filter(id => id !== integration.id)
                              }));
                            }
                          }}
                        />
                        <Label htmlFor={`email-${integration.id}`} className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{integration.email}</p>
                              <p className="text-sm text-gray-500">{integration.name}</p>
                            </div>
                            <Badge variant="outline">{integration.provider}</Badge>
                          </div>
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {planLimits.emailAccounts > 1 && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="rotate-emails"
                          checked={campaignData.rotateEmails}
                          onCheckedChange={(checked) => setCampaignData(prev => ({ ...prev, rotateEmails: checked as boolean }))}
                        />
                        <Label htmlFor="rotate-emails" className="flex items-center gap-2">
                          <RotateCw className="w-4 h-4" />
                          Rotate between sending emails
                        </Label>
                      </div>
                      <p className="text-sm text-gray-500 mt-1 ml-6">
                        Distribute emails across selected accounts for better deliverability
                      </p>
                    </div>
                    
                    {campaignData.rotateEmails && (
                      <div className="ml-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg space-y-4">
                        <div className={`grid gap-4 ${user?.plan !== 'demo' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                          {/* Only show Emails per Account for paid plans */}
                          {user?.plan !== 'demo' && (
                            <div>
                              <Label className="text-sm font-medium">Emails per Account</Label>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                Number of emails to send from each account before switching
                              </p>
                              <Input
                                type="number"
                                value={campaignData.emailsPerAccount}
                                onChange={(e) => setCampaignData(prev => ({ ...prev, emailsPerAccount: parseInt(e.target.value) || 30 }))}
                                min="1"
                                max="100"
                                className="w-full"
                              />
                            </div>
                          )}
                          <div>
                            <Label className="text-sm font-medium">Delay Between Emails (minutes)</Label>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                              Time to wait between sending each email
                            </p>
                            <Input
                              type="number"
                              value={campaignData.emailDelay}
                              onChange={(e) => setCampaignData(prev => ({ ...prev, emailDelay: parseInt(e.target.value) || 5 }))}
                              min="1"
                              max="60"
                              className="w-full"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <Separator />

                {/* Follow-up Configuration */}
                <div className="border-t pt-4">
                  <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Follow-up Email Settings
                    {(!planLimits.followUps || planLimits.followUps === 0) && (
                      <Badge variant="outline" className="text-xs">
                        Upgrade Required
                      </Badge>
                    )}
                  </h3>
                  
                  {(planLimits.followUps && planLimits.followUps > 0) ? (
                    <div>
                      <div className="flex items-center space-x-2 mb-4">
                        <Checkbox
                          id="follow-up-enabled"
                          checked={campaignData.followUpEnabled}
                          onCheckedChange={(checked) => setCampaignData(prev => ({ ...prev, followUpEnabled: checked as boolean }))}
                        />
                        <Label htmlFor="follow-up-enabled" className="text-base font-medium">
                          Enable Follow-up Emails
                        </Label>
                      </div>

                      {campaignData.followUpEnabled && (
                        <div className="space-y-4 ml-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <div>
                            <Label htmlFor="follow-up-subject">Follow-up Subject *</Label>
                            <Input
                              id="follow-up-subject"
                              value={campaignData.followUpSubject}
                              onChange={(e) => setCampaignData(prev => ({ ...prev, followUpSubject: e.target.value }))}
                              placeholder="Re: {original subject}"
                              className="mt-2"
                            />
                          </div>
                          <div>
                            <Label htmlFor="follow-up-body">Follow-up Email Body *</Label>
                            <div className="mt-2">
                              <RichTextEditor
                                value={campaignData.followUpBody}
                                onChange={(value) => setCampaignData(prev => ({ ...prev, followUpBody: value }))}
                                placeholder="Write your follow-up email..."
                                minHeight="200px"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="follow-up-condition">Send follow-up if:</Label>
                              <Select
                                value={campaignData.followUpCondition}
                                onValueChange={(value: 'not_opened' | 'no_reply') => 
                                  setCampaignData(prev => ({ ...prev, followUpCondition: value }))
                                }
                              >
                                <SelectTrigger className="mt-2">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="not_opened">Email Not Opened</SelectItem>
                                  <SelectItem value="no_reply">No Reply Received</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="follow-up-days">Days to Wait</Label>
                              <Input
                                id="follow-up-days"
                                type="number"
                                value={campaignData.followUpDays}
                                onChange={(e) => setCampaignData(prev => ({ ...prev, followUpDays: parseInt(e.target.value) || 3 }))}
                                min="1"
                                max="30"
                                placeholder="3"
                                className="mt-2"
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Recommended: 3-7 days for optimal response
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Follow-up emails are available on Starter plans and above. <a href="/upgrade" className="text-blue-600 hover:underline">Upgrade your plan</a> to enable automatic follow-up sequences.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Campaign Summary:</strong> This campaign will send {selectedRecipientList?.recipientCount || 0} emails using {campaignData.emailIntegrationIds.length} email account(s) at a rate of {campaignData.dailyLimit} emails per day between {campaignData.timeWindowStart} and {campaignData.timeWindowEnd}.
                    {campaignData.rotateEmails && (
                      <> Email rotation is enabled with {user?.plan !== 'demo' ? `${campaignData.emailsPerAccount} emails per account and ` : ''}{campaignData.emailDelay} minute(s) delay between sends.</>
                    )}
                    {campaignData.followUpEnabled && (
                      <> Follow-up emails will be sent after {campaignData.followUpDays} days for recipients who haven't {campaignData.followUpCondition === 'not_opened' ? 'opened' : 'replied to'} the email.</>
                    )}
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Previous
          </Button>
          
          {currentStep < 4 ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex items-center gap-2"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || createCampaignMutation.isPending}
              className="flex items-center gap-2"
            >
              {createCampaignMutation.isPending ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Create Campaign
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    
  );
}