import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface EmailIntegration {
  id: number;
  email: string;
  warmupEnabled: boolean;
  isVerified: boolean;
}

interface WarmupStatusProps {
  integrations: EmailIntegration[];
}

export default function WarmupStatus({ integrations }: WarmupStatusProps) {
  const { data: warmupStats } = useQuery({
    queryKey: ["/api/warmup/stats"],
    retry: false,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const getStatusInfo = (integration: EmailIntegration) => {
    if (!integration.isVerified) {
      return { status: "Not Verified", color: "bg-slate-50", badgeColor: "text-slate-500", dotColor: "bg-slate-300" };
    }
    if (!integration.warmupEnabled) {
      return { status: "Paused", color: "bg-slate-50", badgeColor: "text-slate-500", dotColor: "bg-slate-300" };
    }
    
    // Check if warmup stats exist for this integration
    const stats = warmupStats?.find((stat: any) => stat.integration.id === integration.id);
    if (stats) {
      if (stats.isActive) {
        return { status: "Active", color: "bg-green-50", badgeColor: "text-green-600", dotColor: "bg-green-500" };
      } else {
        return { status: "Paused", color: "bg-yellow-50", badgeColor: "text-yellow-600", dotColor: "bg-yellow-500" };
      }
    }
    
    return { status: "Not Started", color: "bg-slate-50", badgeColor: "text-slate-500", dotColor: "bg-slate-300" };
  };

  // Calculate total daily stats from warmup data
  const totalStats = warmupStats?.reduce((totals: any, stat: any) => {
    totals.sent += stat.emailsSentToday || 0;
    totals.received += stat.emailsReceivedToday || 0;
    totals.score = Math.max(totals.score, stat.reputationScore || 0);
    return totals;
  }, { sent: 0, received: 0, score: 0 }) || { sent: 0, received: 0, score: 0 };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          Warm-up Status
          <Link href="/warm-up">
            <Button variant="ghost" size="sm">
              View All
            </Button>
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {integrations.length > 0 ? (
          <>
            {integrations.slice(0, 3).map((integration) => {
              const statusInfo = getStatusInfo(integration);
              return (
                <div
                  key={integration.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${statusInfo.color}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${statusInfo.dotColor}`} />
                    <span className="text-sm font-medium text-slate-700">
                      {integration.email}
                    </span>
                  </div>
                  <Badge variant="secondary" className={`text-xs ${statusInfo.badgeColor}`}>
                    {statusInfo.status}
                  </Badge>
                </div>
              );
            })}

            {warmupStats && warmupStats.length > 0 && (
              <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-700">Today's Stats</p>
                  <div className="flex justify-between mt-2 text-xs text-slate-600">
                    <span>Sent: {totalStats.sent}</span>
                    <span>Received: {totalStats.received}</span>
                    <span>Score: {totalStats.score}%</span>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-slate-500">No email integrations found</p>
            <p className="text-xs text-slate-400 mt-1">Add an email integration to start warming up</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
