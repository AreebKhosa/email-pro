import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";

interface PlanUsageProps {
  usage: {
    emailsSent?: number;
    recipientsUploaded?: number;
    deliverabilityChecks?: number;
    personalizedEmails?: number;
  };
  limits: {
    emailsPerMonth?: number;
    recipientsPerMonth?: number;
    deliverabilityChecks?: number;
    personalizedEmails?: number;
  };
}

export default function PlanUsage({ usage, limits }: PlanUsageProps) {
  const calculatePercentage = (used: number = 0, limit: number = 0) => {
    if (limit === 0 || limit === Infinity) return 0;
    return Math.min((used / limit) * 100, 100);
  };

  const formatLimit = (limit: number) => {
    if (limit === Infinity) return "Unlimited";
    return limit.toLocaleString();
  };

  const usageItems = [
    {
      label: "Emails Sent",
      used: usage.emailsSent || 0,
      limit: limits.emailsPerMonth || 0,
      color: calculatePercentage(usage.emailsSent, limits.emailsPerMonth) > 80 ? "bg-amber-500" : "bg-blue-500"
    },
    {
      label: "Recipients",
      used: usage.recipientsUploaded || 0,
      limit: limits.recipientsPerMonth || 0,
      color: "bg-green-500"
    },
    {
      label: "Deliverability Checks",
      used: usage.deliverabilityChecks || 0,
      limit: limits.deliverabilityChecks || 0,
      color: "bg-purple-500"
    },
    {
      label: "Personalized Emails",
      used: usage.personalizedEmails || 0,
      limit: limits.personalizedEmails || 0,
      color: "bg-orange-500"
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Plan Usage</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {usageItems.map((item, index) => (
          <div key={index}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">{item.label}</span>
              <span className="text-sm text-slate-500">
                {item.used.toLocaleString()} / {formatLimit(item.limit)}
              </span>
            </div>
            <Progress 
              value={calculatePercentage(item.used, item.limit)} 
              className="h-2"
            />
          </div>
        ))}

        <Link href="/upgrade">
          <Button className="w-full mt-6 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700">
            Upgrade Plan
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
