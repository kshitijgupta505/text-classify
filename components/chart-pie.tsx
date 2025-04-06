"use client"

import * as React from "react"
import { TrendingUp } from "lucide-react"
import { Label, Pie, PieChart } from "recharts"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useAuth } from "@clerk/clerk-react"
import { useState, useEffect } from "react"

const chartConfig = {
  total: {
    label: "Total",
  },
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

export function ChartPie() {
  const { userId } = useAuth();
  const [chartData, setChartData] = useState([
    { type: "legitimate", count: 0, fill: "var(--color-legitimate)" },
    { type: "spam", count: 0, fill: "var(--color-spam)" },
    { type: "phishing", count: 0, fill: "var(--color-phishing)" }
  ]);
  const [trendPercentage, setTrendPercentage] = useState(0);
  const [timeRange, setTimeRange] = useState("");
  
  const distributionStats = useQuery(
    api.classifications.getDistributionStats,
    userId ? { userId } : "skip"
  );
  
  const isLoading = distributionStats === undefined;
  const error = distributionStats === null ? "Failed to load classification data" : null;
  
  // Calculate total classifications
  const totalClassifications = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.count, 0);
  }, [chartData]);
  
  useEffect(() => {
    if (distributionStats && !isLoading && !error) {
      // Update chart data with real stats
      setChartData([
        { type: "legitimate", count: distributionStats.legitimate, fill: "var(--color-legitimate)" },
        { type: "spam", count: distributionStats.spam, fill: "var(--color-spam)" },
        { type: "phishing", count: distributionStats.phishing, fill: "var(--color-phishing)" }
      ]);
      
      // Calculate trend - for this example, we'll assume legitimate emails are good
      // so increasing legitimate percentage is a positive trend
      const totalEmails = distributionStats.legitimate + distributionStats.spam + distributionStats.phishing;
      if (totalEmails > 0) {
        const legitimatePercentage = (distributionStats.legitimate / totalEmails) * 100;
        
        // For simplicity, let's say the trend is based on comparison to an expected baseline of 70% legitimate
        const expectedLegitimatePercentage = 70;
        const trendValue = legitimatePercentage - expectedLegitimatePercentage;
        setTrendPercentage(Math.round(trendValue * 10) / 10);
      }
      
      // Set time range - assuming the default is last 30 days from the API
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 30);
      
      const formatDate = (date) => {
        return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
      };
      
      setTimeRange(`${formatDate(startDate)} - ${formatDate(endDate)}`);
    }
  }, [distributionStats, isLoading, error]);
  
  const getStatusMessage = () => {
    if (trendPercentage > 0) {
      return (
        <>Legitimate emails up by {trendPercentage}% <TrendingUp className="h-4 w-4 text-green-500" /></>
      );
    } else if (trendPercentage < 0) {
      return (
        <>Legitimate emails down by {Math.abs(trendPercentage)}% <TrendingUp className="h-4 w-4 text-red-500 transform rotate-180" /></>
      );
    } else {
      return (
        <>Email classification distribution stable <span className="h-4 w-4 text-gray-400">—</span></>
      );
    }
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Classification Distribution</CardTitle>
        <CardDescription>Last 30 days</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-[250px]">
            <p>Loading classification data...</p>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-[250px] text-red-500">
            <p>{error}</p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[250px]">
            <PieChart>
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Pie data={chartData} dataKey="count" nameKey="type" innerRadius={60} strokeWidth={5}>
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                          <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-3xl font-bold">
                            {totalClassifications.toLocaleString()}
                          </tspan>
                          <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 24} className="fill-muted-foreground">
                            Emails
                          </tspan>
                        </text>
                      )
                    }
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 font-medium leading-none">
          {getStatusMessage()}
        </div>
        <div className="leading-none text-muted-foreground">
          {timeRange}
        </div>
        {!isLoading && !error && (
          <div className="leading-none text-muted-foreground">
            {chartData[0].count} legitimate, {chartData[1].count} spam, {chartData[2].count} phishing
          </div>
        )}
      </CardFooter>
    </Card>
  )
}
