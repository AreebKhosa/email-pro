import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: number;
  trendLabel?: string;
  className?: string;
  iconClassName?: string;
}

export default function StatsCard({
  title,
  value,
  icon,
  trend,
  trendLabel,
  className,
  iconClassName
}: StatsCardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      return val.toLocaleString();
    }
    return val;
  };

  return (
    <Card className={cn("border shadow-sm", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">{title}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {formatValue(value)}
            </p>
          </div>
          <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center", iconClassName)}>
            {icon}
          </div>
        </div>
        {trend !== undefined && (
          <div className="flex items-center mt-4 text-sm">
            {trend >= 0 ? (
              <>
                <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                <span className="text-green-600 font-medium">+{trend}%</span>
              </>
            ) : (
              <>
                <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                <span className="text-red-600 font-medium">{trend}%</span>
              </>
            )}
            {trendLabel && (
              <span className="text-slate-500 ml-1">{trendLabel}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
