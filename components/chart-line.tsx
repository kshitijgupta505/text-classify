"use client"

import { TrendingUp } from "lucide-react"
import { CartesianGrid, Line, LineChart, XAxis } from "recharts"
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

export function ChartLine() {
  const { userId } = useAuth();
  const [trendPercentage, setTrendPercentage] = useState(0);
  const [totalStats, setTotalStats] = useState({ legitimate: 0, spam: 0, phishing: 0 });
  
  const classificationData = useQuery(
    api.classifications.getRecentStats, 
    userId ? { userId, days: 30 } : "skip"
  );
  
  const isLoading = classificationData === undefined;
  const error = classificationData === null ? "Failed to load classification data" : null;
  
  const chartData = (!isLoading && !error && classificationData) ? classificationData : initialData;

  useEffect(() => {
    if (classificationData && Array.isArray(classificationData) && classificationData.length > 0) {
      if (classificationData.length >= 2) {
        const lastDay = classificationData[classificationData.length - 1].legitimate;
        const previousDay = classificationData[classificationData.length - 2].legitimate;
        
        if (previousDay !== 0) {
          const percentChange = ((lastDay - previousDay) / previousDay) * 100;
          setTrendPercentage(Math.round(percentChange * 10) / 10);
        } else if (lastDay > 0) {
          setTrendPercentage(100);
        } else {
          setTrendPercentage(0);
        }
      }
      
      const totals = classificationData.reduce((acc, day) => {
        acc.legitimate += day.legitimate;
        acc.spam += day.spam;
        acc.phishing += day.phishing;
        return acc;
      }, { legitimate: 0, spam: 0, phishing: 0 });
      
      setTotalStats(totals);
    }
  }, [classificationData]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getStatusMessage = () => {
    if (trendPercentage > 0) {
      return (
        <>Legitimate email trend up by {trendPercentage}% <TrendingUp className="h-4 w-4 text-green-500" /></>
      );
    } else if (trendPercentage < 0) {
      return (
        <>Legitimate email trend down by {Math.abs(trendPercentage)}% <TrendingUp className="h-4 w-4 text-red-500 transform rotate-180" /></>
      );
    } else {
      return (
        <>Legitimate email trend unchanged <span className="h-4 w-4 text-gray-400">—</span></>
      );
    }
  };

  const totalClassifications = totalStats.legitimate + totalStats.spam + totalStats.phishing;
  const legitimatePercentage = totalStats.legitimate > 0 
    ? Math.round((totalStats.legitimate / totalClassifications) * 100) 
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Classification Trends</CardTitle>
        <CardDescription>Last 30 days classification analysis</CardDescription>
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
            <LineChart
              accessibilityLayer
              data={chartData}
              margin={{
                left: 12,
                right: 12,
                top: 20,
                bottom: 20
              }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={formatDate}
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Line 
                dataKey="legitimate" 
                type="monotone" 
                stroke="var(--color-legitimate)" 
                strokeWidth={2} 
                activeDot={{ r: 6 }}
              />
              <Line 
                dataKey="spam" 
                type="monotone" 
                stroke="var(--color-spam)" 
                strokeWidth={2} 
                activeDot={{ r: 6 }}
              />
              <Line 
                dataKey="phishing" 
                type="monotone" 
                stroke="var(--color-phishing)" 
                strokeWidth={2} 
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter>
        <div className="flex w-full flex-col items-start gap-2 text-sm">
          <div className="flex items-center gap-2 font-medium leading-none">
            {getStatusMessage()}
          </div>
          <div className="flex items-center gap-2 leading-none text-muted-foreground">
            Total classifications: {totalClassifications} ({legitimatePercentage}% legitimate)
          </div>
          <div className="leading-none text-muted-foreground">
            Breakdown: {totalStats.legitimate} legitimate, {totalStats.spam} spam, {totalStats.phishing} phishing
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}
