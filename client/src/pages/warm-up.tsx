import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useInstructions } from "@/hooks/useInstructions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Zap, TrendingUp, Mail, Target, Clock, CheckCircle, XCircle, Info, Play, Pause } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface EmailIntegration {
  id: number;
  userId: string;
  provider: string;
  email: string;
  name: string;
  warmupEnabled: boolean;
  isVerified: boolean;
  createdAt: string;
}

interface WarmupStats {
  integration: EmailIntegration;
  todayStats: {
    emailsSent: number;
    emailsOpened: number;
    emailsReplied: number;
    emailsSpam: number;
    emailsBounced: number;
    warmupScore: number;
    spamRate: number;
    openRate: number;
    replyRate: number;
    bounceRate: number;
  };
  overallStats: {
    totalSent: number;
    totalOpened: number;
    totalReplied: number;
    totalSpam: number;
    totalBounced: number;
    avgWarmupScore: number;
    avgSpamRate: number;
    avgOpenRate: number;
    avgReplyRate: number;
    avgBounceRate: number;
  };
  progress: Array<{
    id: number;
    day: number;
    targetEmailsPerDay: number;
    actualEmailsSent: number;
    isCompleted: boolean;
  }>;
}

export default function WarmUp() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { shouldShowInstructions, dismissInstructions } = useInstructions();
  const [showInstructions, setShowInstructions] = useState(shouldShowInstructions("warmup"));

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: emailIntegrations, isLoading: integrationsLoading } = useQuery({
    queryKey: ["/api/email-integrations"],
    retry: false,
  });

  const { data: warmupStats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/warmup/stats"],
    retry: false,
  });

  const toggleWarmupMutation = useMutation({
    mutationFn: async ({ integrationId, enabled }: { integrationId: number; enabled: boolean }) => {
      await apiRequest("PUT", `/api/email-integrations/${integrationId}/warmup`, { enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-integrations"] });
      toast({
        title: "Success",
        description: "Warmup setting updated successfully",
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
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to update warmup setting",
        variant: "destructive",
      });
    },
  });

  const initializeWarmupMutation = useMutation({
    mutationFn: async (integrationId: number) => {
      await apiRequest("POST", `/api/warmup/initialize/${integrationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warmup/stats"] });
      toast({
        title: "Success",
        description: "Warmup initialized successfully",
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
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to initialize warmup",
        variant: "destructive",
      });
    },
  });

  const sendWarmupMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/warmup/send");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warmup/stats"] });
      toast({
        title: "Success",
        description: "Warmup emails sent successfully",
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
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to send warmup emails",
        variant: "destructive",
      });
    },
  });

  const handleDismissInstructions = () => {
    dismissInstructions("warmup");
    setShowInstructions(false);
  };

  const handleToggleWarmup = (integrationId: number, enabled: boolean) => {
    toggleWarmupMutation.mutate({ integrationId, enabled });
  };

  const handleInitializeWarmup = (integrationId: number) => {
    initializeWarmupMutation.mutate(integrationId);
  };

  const activeIntegrations = emailIntegrations?.filter((integration: EmailIntegration) => 
    integration.isVerified && integration.warmupEnabled
  ) || [];

  if (isLoading || integrationsLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Zap className="w-8 h-8 text-orange-500" />
            Email Warm-up
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Gradually increase your email sending reputation to improve deliverability
          </p>
        </div>

        {showInstructions && (
          <Card className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-900/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-600" />
                  Email Warm-up Instructions
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={handleDismissInstructions}>
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <p className="mb-2">
                  <strong>Email warm-up</strong> is the process of gradually increasing your email sending volume
                  to build a positive reputation with email providers.
                </p>
                <ul className="space-y-1 ml-4">
                  <li>• Start with 5-10 emails per day and gradually increase to 100 over 15 days</li>
                  <li>• Send emails between verified accounts to simulate real conversations</li>
                  <li>• AI generates natural, professional emails with automated replies</li>
                  <li>• Monitor spam rates, open rates, and bounce rates for each account</li>
                  <li>• Enable warmup for at least 2 email accounts to exchange emails</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Warmup Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {activeIntegrations.length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Active Accounts
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {warmupStats?.reduce((sum: number, stat: WarmupStats) => sum + stat.todayStats.emailsSent, 0) || 0}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Emails Sent Today
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {warmupStats?.reduce((sum: number, stat: WarmupStats) => sum + stat.todayStats.emailsOpened, 0) || 0}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Emails Opened Today
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {warmupStats?.reduce((sum: number, stat: WarmupStats) => sum + stat.todayStats.emailsSpam, 0) || 0}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Spam Reports Today
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={() => sendWarmupMutation.mutate()}
                  disabled={sendWarmupMutation.isPending || activeIntegrations.length < 2}
                  className="flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  {sendWarmupMutation.isPending ? "Sending..." : "Send Warmup Emails"}
                </Button>

                {activeIntegrations.length < 2 && (
                  <Alert className="flex-1">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      You need at least 2 active email accounts to start warmup
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Accounts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {emailIntegrations?.map((integration: EmailIntegration) => (
                  <div key={integration.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <Mail className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium">{integration.email}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          {integration.provider} • {integration.name}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant={integration.isVerified ? "default" : "secondary"}>
                        {integration.isVerified ? "Verified" : "Not Verified"}
                      </Badge>
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`warmup-${integration.id}`} className="text-sm">
                          Warmup
                        </Label>
                        <Switch
                          id={`warmup-${integration.id}`}
                          checked={integration.warmupEnabled}
                          onCheckedChange={(enabled) => handleToggleWarmup(integration.id, enabled)}
                          disabled={!integration.isVerified || toggleWarmupMutation.isPending}
                        />
                      </div>
                      {integration.warmupEnabled && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleInitializeWarmup(integration.id)}
                          disabled={initializeWarmupMutation.isPending}
                        >
                          Initialize
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {warmupStats && warmupStats.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Warmup Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {warmupStats.map((stat: WarmupStats) => (
                    <div key={stat.integration.id} className="border rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-medium text-lg">{stat.integration.email}</h3>
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            Warmup Score: {Math.round(stat.todayStats.warmupScore || 0)}/100
                          </div>
                        </div>
                        <Badge variant={stat.todayStats.warmupScore >= 80 ? "default" : "secondary"}>
                          {stat.todayStats.warmupScore >= 80 ? "Excellent" : "Building"}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center">
                          <div className="text-lg font-bold">{stat.todayStats.emailsSent}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-300">Sent Today</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-green-600">{stat.todayStats.openRate.toFixed(1)}%</div>
                          <div className="text-xs text-gray-600 dark:text-gray-300">Open Rate</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-blue-600">{stat.todayStats.replyRate.toFixed(1)}%</div>
                          <div className="text-xs text-gray-600 dark:text-gray-300">Reply Rate</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-red-600">{stat.todayStats.spamRate.toFixed(1)}%</div>
                          <div className="text-xs text-gray-600 dark:text-gray-300">Spam Rate</div>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span>Warmup Progress</span>
                          <span>{Math.round(stat.todayStats.warmupScore || 0)}/100</span>
                        </div>
                        <Progress value={stat.todayStats.warmupScore || 0} className="h-2" />
                      </div>

                      {stat.progress && stat.progress.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-medium mb-2">15-Day Progress Plan</h4>
                          <div className="grid grid-cols-5 gap-2">
                            {stat.progress.slice(0, 15).map((day) => (
                              <div
                                key={day.day}
                                className={`text-center p-2 rounded text-xs ${
                                  day.isCompleted
                                    ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300"
                                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                                }`}
                              >
                                <div className="font-medium">Day {day.day}</div>
                                <div>{day.actualEmailsSent}/{day.targetEmailsPerDay}</div>
                                {day.isCompleted && <CheckCircle className="w-3 h-3 mx-auto mt-1" />}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <Separator className="my-4" />

                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <div className="font-medium">Total Sent</div>
                            <div>{stat.overallStats.totalSent}</div>
                          </div>
                          <div>
                            <div className="font-medium">Avg Open Rate</div>
                            <div>{stat.overallStats.avgOpenRate.toFixed(1)}%</div>
                          </div>
                          <div>
                            <div className="font-medium">Avg Reply Rate</div>
                            <div>{stat.overallStats.avgReplyRate.toFixed(1)}%</div>
                          </div>
                          <div>
                            <div className="font-medium">Avg Spam Rate</div>
                            <div>{stat.overallStats.avgSpamRate.toFixed(1)}%</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}