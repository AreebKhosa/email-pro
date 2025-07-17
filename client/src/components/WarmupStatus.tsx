import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
  const getStatusInfo = (integration: EmailIntegration) => {
    if (!integration.isVerified) {
      return { status: "Not Verified", color: "bg-slate-50", badgeColor: "text-slate-500", dotColor: "bg-slate-300" };
    }
    if (!integration.warmupEnabled) {
      return { status: "Paused", color: "bg-slate-50", badgeColor: "text-slate-500", dotColor: "bg-slate-300" };
    }
    // Simple logic to show different statuses
    const random = integration.id % 3;
    if (random === 0) {
      return { status: "Active", color: "bg-green-50", badgeColor: "text-green-600", dotColor: "bg-green-500" };
    } else if (random === 1) {
      return { status: "Warming", color: "bg-blue-50", badgeColor: "text-blue-600", dotColor: "bg-blue-500" };
    } else {
      return { status: "Paused", color: "bg-slate-50", badgeColor: "text-slate-500", dotColor: "bg-slate-300" };
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Warm-up Status</CardTitle>
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

            <div className="mt-4 p-3 bg-slate-50 rounded-lg">
              <div className="text-center">
                <p className="text-sm font-medium text-slate-700">Daily Stats</p>
                <div className="flex justify-between mt-2 text-xs text-slate-600">
                  <span>Sent: 45</span>
                  <span>Received: 38</span>
                  <span>Reputation: 96%</span>
                </div>
              </div>
            </div>
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
