"use client"
import { TrendingUp } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { useEffect, useState } from "react"
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@clerk/clerk-react";

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

export function ChartBar() {
  const { userId } = useAuth();
  const [trendPercentage, setTrendPercentage] = useState(0);
  const [totalStats, setTotalStats] = useState({ legitimate: 0, spam: 0, phishing: 0 });
  
  const classificationData = useQuery(
    api.classifications.getRecentStats, 
    userId ? { userId, days: 7 } : "skip"
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
        <>Legitimate email detection up by {trendPercentage}% today <TrendingUp className="h-4 w-4 text-green-500" /></>
      );
    } else if (trendPercentage < 0) {
      return (
        <>Legitimate email detection down by {Math.abs(trendPercentage)}% today <TrendingUp className="h-4 w-4 text-red-500 transform rotate-180" /></>
      );
    } else {
      return (
        <>Legitimate email detection unchanged today <span className="h-4 w-4 text-gray-400">—</span></>
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Classification Results</CardTitle>
        <CardDescription>Last 3 days classification breakdown</CardDescription>
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
            <BarChart 
              data={chartData}
              margin={{ top: 20, right: 20, left: 0, bottom: 20 }}
              barGap={4}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
              <XAxis 
                dataKey="date" 
                tickLine={false} 
                tickMargin={10} 
                axisLine={false}
                tickFormatter={formatDate}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tickMargin={10}
              />
              <ChartTooltip 
                cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}  
                content={<ChartTooltipContent />} 
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar 
                dataKey="legitimate" 
                stackId="stack"
                fill="var(--color-legitimate)" 
                radius={[0, 0, 0, 0]} 
                name="Legitimate" 
              />
              <Bar 
                dataKey="spam" 
                stackId="stack"
                fill="var(--color-spam)" 
                radius={[0, 0, 0, 0]} 
                name="Spam" 
              />
              <Bar 
                dataKey="phishing" 
                stackId="stack"
                fill="var(--color-phishing)" 
                radius={[4, 4, 0, 0]} 
                name="Phishing" 
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 font-medium leading-none">
          {getStatusMessage()}
        </div>
        <div className="leading-none text-muted-foreground">
          Total classifications: {totalStats.legitimate} legitimate, {totalStats.spam} spam, {totalStats.phishing} phishing
        </div>
      </CardFooter>
    </Card>
  )
}
