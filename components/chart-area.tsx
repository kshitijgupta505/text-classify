"use client"

import { TrendingUp } from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useEffect, useState } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useAuth } from "@clerk/clerk-react"

// Initial data to display while loading
const initialData = Array(7).fill(null).map((_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (6 - i));
  return {
    date: date.toISOString().split('T')[0],
    legitimate: 0,
    spam: 0,
    phishing: 0
  };
});

const chartConfig = {
  legitimate: {
    label: "Legitimate",
    color: "hsl(var(--chart-1))",
  },
  spam: {
    label: "Spam",
    color: "hsl(var(--chart-2))",
  },
  phishing: {
    label: "Phishing",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig

export function ChartArea() {
  const { userId } = useAuth();
  const [trendPercentage, setTrendPercentage] = useState(0);
  const [totalStats, setTotalStats] = useState({ legitimate: 0, spam: 0, phishing: 0 });
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  
  const classificationData = useQuery(
    api.classifications.getRecentStats, 
    userId ? { userId, days: 14 } : "skip"
  );
  
  const isLoading = classificationData === undefined;
  const error = classificationData === null ? "Failed to load classification data" : null;
  
  const chartData = (!isLoading && !error && classificationData) ? classificationData : initialData;

  useEffect(() => {
    if (classificationData && Array.isArray(classificationData) && classificationData.length > 0) {
      // Calculate trend
      if (classificationData.length >= 2) {
        const totalLastDay = classificationData[classificationData.length - 1].legitimate + 
                             classificationData[classificationData.length - 1].spam + 
                             classificationData[classificationData.length - 1].phishing;
                             
        const totalPreviousDay = classificationData[classificationData.length - 2].legitimate + 
                                 classificationData[classificationData.length - 2].spam + 
                                 classificationData[classificationData.length - 2].phishing;
        
        if (totalPreviousDay !== 0) {
          const percentChange = ((totalLastDay - totalPreviousDay) / totalPreviousDay) * 100;
          setTrendPercentage(Math.round(percentChange * 10) / 10);
        } else if (totalLastDay > 0) {
          setTrendPercentage(100);
        } else {
          setTrendPercentage(0);
        }
      }
      
      // Calculate totals
      const totals = classificationData.reduce((acc, day) => {
        acc.legitimate += day.legitimate;
        acc.spam += day.spam;
        acc.phishing += day.phishing;
        return acc;
      }, { legitimate: 0, spam: 0, phishing: 0 });
      
      setTotalStats(totals);
      
      // Set date range
      if (classificationData.length > 0) {
        const startDate = new Date(classificationData[0].date);
        const endDate = new Date(classificationData[classificationData.length - 1].date);
        
        const formatDateForDisplay = (date: Date) => {
          return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
        };
        
        setDateRange({
          start: formatDateForDisplay(startDate),
          end: formatDateForDisplay(endDate)
        });
      }
    }
  }, [classificationData]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getStatusMessage = () => {
    if (trendPercentage > 0) {
      return (
        <>Trending up by {trendPercentage}% this period <TrendingUp className="h-4 w-4 text-green-500" /></>
      );
    } else if (trendPercentage < 0) {
      return (
        <>Trending down by {Math.abs(trendPercentage)}% this period <TrendingUp className="h-4 w-4 text-red-500 transform rotate-180" /></>
      );
    } else {
      return (
        <>No significant trend this period <span className="h-4 w-4 text-gray-400">—</span></>
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Classification Volume - Stacked</CardTitle>
        <CardDescription>Email classification volume over the last 14 days</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[300px]">
            <p>Loading classification data...</p>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-[300px] text-red-500">
            <p>{error}</p>
          </div>
        ) : (
          <ChartContainer config={chartConfig}>
            <AreaChart
              accessibilityLayer
              data={chartData}
              margin={{
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={formatDate}
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
              <Area
                dataKey="phishing"
                type="natural"
                fill="var(--color-phishing)"
                fillOpacity={0.4}
                stroke="var(--color-phishing)"
                stackId="a"
              />
              <Area
                dataKey="spam"
                type="natural"
                fill="var(--color-spam)"
                fillOpacity={0.4}
                stroke="var(--color-spam)"
                stackId="a"
              />
              <Area
                dataKey="legitimate"
                type="natural"
                fill="var(--color-legitimate)"
                fillOpacity={0.4}
                stroke="var(--color-legitimate)"
                stackId="a"
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 font-medium leading-none">
              {getStatusMessage()}
            </div>
            <div className="flex items-center gap-2 leading-none text-muted-foreground">
              {dateRange.start} - {dateRange.end}
            </div>
            <div className="leading-none text-muted-foreground">
              Total: {totalStats.legitimate + totalStats.spam + totalStats.phishing} classifications
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}
