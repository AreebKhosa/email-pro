import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, CheckCircle, AlertTriangle, XCircle, Trash, RotateCcw, Download, TrendingUp, BarChart3, FileDown, PieChart } from "lucide-react";
// Simple chart visualization without external dependencies

export default function Deliverability() {
  const { toast } = useToast();
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [checkResults, setCheckResults] = useState<any>(null);
  const [validationDetails, setValidationDetails] = useState<any>(null);

  const { data: recipientLists } = useQuery({
    queryKey: ["/api/recipient-lists"],
    retry: false,
  });

  const { data: recipients } = useQuery({
    queryKey: ["/api/recipient-lists", parseInt(selectedListId), "recipients"],
    enabled: !!selectedListId,
    retry: false,
  });

  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const { data: userStats } = useQuery({
    queryKey: ["/api/user/stats"],
    retry: false,
  });

  // Get validation stats for selected list
  const { data: validationStats } = useQuery({
    queryKey: ["/api/recipient-lists", parseInt(selectedListId), "validation-stats"],
    enabled: !!selectedListId,
    retry: false,
  });

  const checkDeliverabilityMutation = useMutation({
    mutationFn: async (listId: string) => {
      const response = await apiRequest("POST", `/api/recipient-lists/${listId}/check-deliverability`);
      return response.json();
    },
    onSuccess: (results) => {
      setCheckResults(results);
      toast({
        title: "Success",
        description: "Deliverability check completed",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/recipient-lists", parseInt(selectedListId), "recipients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recipient-lists", parseInt(selectedListId), "validation-stats"] });
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

  const checkSingleEmailMutation = useMutation({
    mutationFn: async (recipientId: number) => {
      const response = await apiRequest("POST", `/api/recipients/${recipientId}/check-deliverability`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Email checked successfully",
      });
      if (data.details) {
        setValidationDetails(data);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/recipient-lists", parseInt(selectedListId), "recipients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recipient-lists", parseInt(selectedListId), "validation-stats"] });
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

  const handleCheckList = () => {
    if (selectedListId) {
      checkDeliverabilityMutation.mutate(selectedListId);
    }
  };

  const handleCheckSingle = (recipientId: number) => {
    checkSingleEmailMutation.mutate(recipientId);
  };

  // Remove invalid emails mutation
  const removeInvalidMutation = useMutation({
    mutationFn: async (listId: string) => {
      const response = await apiRequest("POST", `/api/recipient-lists/${listId}/remove-invalid`);
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate all relevant queries to update counts and lists
      queryClient.invalidateQueries({ queryKey: ["/api/recipient-lists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recipients/recent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recipient-lists", parseInt(selectedListId), "recipients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recipient-lists", parseInt(selectedListId), "validation-stats"] });
      toast({
        title: "Invalid emails removed",
        description: `${data.removedCount} invalid emails were removed from the list`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to remove invalid emails",
        variant: "destructive",
      });
    },
  });

  // Delete recipient mutation
  const deleteRecipientMutation = useMutation({
    mutationFn: async (recipientId: number) => {
      const response = await apiRequest("DELETE", `/api/recipients/${recipientId}`);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all relevant queries to update counts and lists
      queryClient.invalidateQueries({ queryKey: ["/api/recipient-lists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recipients/recent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recipient-lists", parseInt(selectedListId), "recipients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recipient-lists", parseInt(selectedListId), "validation-stats"] });
      toast({
        title: "Recipient deleted",
        description: "The recipient has been removed from the list",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete recipient",
        variant: "destructive",
      });
    },
  });

  // Handle export clean list
  const handleExportClean = async () => {
    if (selectedListId) {
      try {
        const response = await fetch(`/api/recipient-lists/${selectedListId}/export-clean`);
        if (!response.ok) throw new Error('Failed to export');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `clean-list-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        toast({
          title: "Export successful",
          description: "Clean list exported successfully",
        });
      } catch (error) {
        toast({
          title: "Export failed",
          description: "Failed to export clean list",
          variant: "destructive",
        });
      }
    }
  };

  // Handle remove invalid emails
  const handleRemoveInvalid = () => {
    if (selectedListId) {
      removeInvalidMutation.mutate(selectedListId);
    }
  };

  // Handle delete recipient
  const handleDeleteRecipient = (recipientId: number) => {
    deleteRecipientMutation.mutate(recipientId);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'risky':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'invalid':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Shield className="h-4 w-4 text-slate-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const configs = {
      valid: { className: "bg-green-100 text-green-800", label: "Valid" },
      risky: { className: "bg-yellow-100 text-yellow-800", label: "Risky" },
      invalid: { className: "bg-red-100 text-red-800", label: "Invalid" },
    };

    const config = configs[status as keyof typeof configs];
    if (!config) {
      return <Badge variant="outline">Unchecked</Badge>;
    }

    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const checkedRecipients = recipients?.filter((r: any) => r.deliverabilityStatus) || [];
  const validCount = validationStats?.valid || checkedRecipients.filter((r: any) => r.deliverabilityStatus === 'valid').length;
  const riskyCount = validationStats?.risky || checkedRecipients.filter((r: any) => r.deliverabilityStatus === 'risky').length;
  const invalidCount = validationStats?.invalid || checkedRecipients.filter((r: any) => r.deliverabilityStatus === 'invalid').length;
  const totalChecked = validCount + riskyCount + invalidCount;

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Deliverability Checker</h1>
            <p className="text-slate-600 mt-1">Verify email addresses and improve campaign success rates</p>
          </div>
        </div>

        {/* Usage Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Checks Done</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(() => {
                  const planLimits = {
                    demo: { deliverabilityChecks: 150 },
                    starter: { deliverabilityChecks: 2500 },
                    pro: { deliverabilityChecks: 10000 },
                    premium: { deliverabilityChecks: Infinity }
                  };
                  const currentPlan = user?.plan || 'demo';
                  const maxChecks = planLimits[currentPlan as keyof typeof planLimits]?.deliverabilityChecks || 150;
                  const checksUsed = userStats?.deliverabilityChecksUsed || 0;
                  return checksUsed.toLocaleString();
                })()}
              </div>
              <p className="text-xs text-muted-foreground">
                Total deliverability checks
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Remaining Checks</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(() => {
                  const planLimits = {
                    demo: { deliverabilityChecks: 150 },
                    starter: { deliverabilityChecks: 2500 },
                    pro: { deliverabilityChecks: 10000 },
                    premium: { deliverabilityChecks: Infinity }
                  };
                  const currentPlan = user?.plan || 'demo';
                  const maxChecks = planLimits[currentPlan as keyof typeof planLimits]?.deliverabilityChecks || 150;
                  const checksUsed = userStats?.deliverabilityChecksUsed || 0;
                  const remainingChecks = maxChecks === Infinity ? 'Unlimited' : Math.max(0, maxChecks - checksUsed);
                  return typeof remainingChecks === 'number' ? remainingChecks.toLocaleString() : remainingChecks;
                })()}
              </div>
              <p className="text-xs text-muted-foreground">
                Available checks this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Quota</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(() => {
                  const planLimits = {
                    demo: { deliverabilityChecks: 150 },
                    starter: { deliverabilityChecks: 2500 },
                    pro: { deliverabilityChecks: 10000 },
                    premium: { deliverabilityChecks: Infinity }
                  };
                  const currentPlan = user?.plan || 'demo';
                  const maxChecks = planLimits[currentPlan as keyof typeof planLimits]?.deliverabilityChecks || 150;
                  return maxChecks === Infinity ? 'Unlimited' : maxChecks.toLocaleString();
                })()}
              </div>
              <div className="mt-2">
                {(() => {
                  const planLimits = {
                    demo: { deliverabilityChecks: 150 },
                    starter: { deliverabilityChecks: 2500 },
                    pro: { deliverabilityChecks: 10000 },
                    premium: { deliverabilityChecks: Infinity }
                  };
                  const currentPlan = user?.plan || 'demo';
                  const maxChecks = planLimits[currentPlan as keyof typeof planLimits]?.deliverabilityChecks || 150;
                  const checksUsed = userStats?.deliverabilityChecksUsed || 0;
                  const usagePercentage = maxChecks === Infinity ? 0 : Math.min(100, (checksUsed / maxChecks) * 100);
                  
                  if (maxChecks !== Infinity) {
                    return (
                      <>
                        <Progress value={usagePercentage} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">
                          {usagePercentage.toFixed(1)}% of quota used
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

        {/* List Selection and Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Email Verification</CardTitle>
            <CardDescription>Select a recipient list to check email deliverability</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Select value={selectedListId} onValueChange={setSelectedListId}>
                  <SelectTrigger>
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
              </div>
              <Button 
                onClick={handleCheckList}
                disabled={!selectedListId || checkDeliverabilityMutation.isPending}
                className="bg-primary hover:bg-primary/90"
              >
                <Shield className="h-4 w-4 mr-2" />
                {checkDeliverabilityMutation.isPending ? "Checking..." : "Check All Emails"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Overview */}
        {(checkResults || totalChecked > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Valid Emails</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">
                      {checkResults?.valid ?? validCount}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <Progress 
                    value={totalChecked > 0 ? (validCount / totalChecked) * 100 : 0} 
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Risky Emails</p>
                    <p className="text-2xl font-bold text-yellow-600 mt-1">
                      {checkResults?.risky ?? riskyCount}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <Progress 
                    value={totalChecked > 0 ? (riskyCount / totalChecked) * 100 : 0} 
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Invalid Emails</p>
                    <p className="text-2xl font-bold text-red-600 mt-1">
                      {checkResults?.invalid ?? invalidCount}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <XCircle className="h-6 w-6 text-red-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <Progress 
                    value={totalChecked > 0 ? (invalidCount / totalChecked) * 100 : 0} 
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Validation Stats Chart */}
        {validationStats && selectedListId && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Validation Breakdown
              </CardTitle>
              <CardDescription>
                Visual breakdown of email validation results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-2xl font-bold text-green-600">{validationStats.valid || 0}</div>
                    <div className="text-sm text-green-700">Valid Emails</div>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="text-2xl font-bold text-yellow-600">{validationStats.risky || 0}</div>
                    <div className="text-sm text-yellow-700">Risky Emails</div>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="text-2xl font-bold text-red-600">{validationStats.invalid || 0}</div>
                    <div className="text-sm text-red-700">Invalid Emails</div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-2xl font-bold text-slate-600">{validationStats.pending || 0}</div>
                    <div className="text-sm text-slate-700">Not Checked</div>
                  </div>
                </div>

                {/* Simple Chart Visualization */}
                <div className="h-64 flex flex-col justify-between p-4 bg-slate-50 rounded-lg">
                  <h4 className="text-sm font-medium text-slate-700 mb-4">Email Status Distribution</h4>
                  <div className="flex-1 flex items-end justify-between gap-2">
                    {[
                      { label: 'Valid', value: validationStats?.valid || 0, color: 'bg-green-500', bgColor: 'bg-green-100' },
                      { label: 'Risky', value: validationStats?.risky || 0, color: 'bg-yellow-500', bgColor: 'bg-yellow-100' },
                      { label: 'Invalid', value: validationStats?.invalid || 0, color: 'bg-red-500', bgColor: 'bg-red-100' },
                      { label: 'Pending', value: validationStats?.pending || 0, color: 'bg-slate-500', bgColor: 'bg-slate-100' },
                    ].map((item, index) => {
                      const total = (validationStats?.valid || 0) + (validationStats?.risky || 0) + (validationStats?.invalid || 0) + (validationStats?.pending || 0);
                      const percentage = total > 0 ? (item.value / total) * 100 : 0;
                      const height = Math.max(percentage * 1.5, 8); // Minimum height of 8px
                      
                      return (
                        <div key={index} className="flex-1 flex flex-col items-center">
                          <div className={`w-full ${item.bgColor} rounded-t flex items-end justify-center`} style={{ height: '150px' }}>
                            <div 
                              className={`w-3/4 ${item.color} rounded-t transition-all duration-500`}
                              style={{ height: `${height}px` }}
                            />
                          </div>
                          <div className="mt-2 text-center">
                            <div className="text-xs font-medium text-slate-700">{item.label}</div>
                            <div className="text-xs text-slate-500">{item.value}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recipients Table */}
        {selectedListId && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Email Verification Results</CardTitle>
                  <CardDescription>View and manage deliverability status for each email</CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleExportClean}
                    disabled={!validationStats || validationStats.valid === 0}
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    Export Clean List
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleRemoveInvalid}
                    disabled={removeInvalidMutation.isPending || !validationStats || validationStats.invalid === 0}
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    {removeInvalidMutation.isPending ? "Removing..." : "Remove Invalid"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {recipients && recipients.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Company</TableHead>
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
                        <TableCell className="text-sm font-mono">
                          {recipient.email}
                        </TableCell>
                        <TableCell className="text-sm">
                          {recipient.companyName || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(recipient.deliverabilityStatus)}
                            {getStatusBadge(recipient.deliverabilityStatus)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleCheckSingle(recipient.id)}
                              disabled={checkSingleEmailMutation.isPending}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-red-600 hover:bg-red-50"
                              onClick={() => handleDeleteRecipient(recipient.id)}
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
                  <Shield className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No recipients in this list</h3>
                  <p className="text-slate-600">Add recipients to start checking deliverability</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Deliverability Tips */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">Deliverability Best Practices</CardTitle>
          </CardHeader>
          <CardContent className="text-blue-800">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <strong>Valid Emails:</strong> These are safe to send to and will help maintain your sender reputation.
                </div>
                <div>
                  <strong>Risky Emails:</strong> Use caution - these might bounce or mark emails as spam.
                </div>
                <div>
                  <strong>Invalid Emails:</strong> Remove these immediately to protect your sender reputation.
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <strong>Regular Cleaning:</strong> Check your lists monthly to maintain good deliverability.
                </div>
                <div>
                  <strong>Double Opt-in:</strong> Use confirmation emails when collecting new subscribers.
                </div>
                <div>
                  <strong>Bounce Management:</strong> Automatically remove emails that hard bounce.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Validation Details Modal */}
        {validationDetails && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Email Validation Details
              </CardTitle>
              <CardDescription>
                Comprehensive validation results for {validationDetails.details?.email}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Validation Checks */}
                <div className="space-y-4">
                  <h4 className="font-semibold">Validation Checks</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span>Syntax Check</span>
                      {validationDetails.details?.checks?.syntax ? (
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Passed
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" />
                          Failed
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span>DNS/MX Check</span>
                      {validationDetails.details?.checks?.dns ? (
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Passed
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" />
                          Failed
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span>SMTP Check</span>
                      {validationDetails.details?.checks?.smtp ? (
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Passed
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Failed
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Technical Details */}
                <div className="space-y-4">
                  <h4 className="font-semibold">Technical Details</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Status:</span> {validationDetails.status}
                    </div>
                    <div>
                      <span className="font-medium">Reason:</span> {validationDetails.reason}
                    </div>
                    {validationDetails.details?.mx_records && validationDetails.details.mx_records.length > 0 && (
                      <div>
                        <span className="font-medium">MX Records:</span>
                        <ul className="mt-1 ml-4">
                          {validationDetails.details.mx_records.map((mx: any, idx: number) => (
                            <li key={idx} className="text-xs text-muted-foreground">
                              Priority {mx.priority}: {mx.exchange}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {validationDetails.details?.smtp?.mx_server && (
                      <div>
                        <span className="font-medium">SMTP Server:</span> {validationDetails.details.smtp.mx_server}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <Button variant="outline" onClick={() => setValidationDetails(null)}>
                  Close Details
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
