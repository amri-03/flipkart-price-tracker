import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { PriceHistoryPoint } from "../hooks/useProducts";

interface PriceChartProps {
  history: PriceHistoryPoint[];
}

export function PriceChart({ history }: PriceChartProps) {
  // 1. Sanitize and format price points for Recharts display
  const chartData = React.useMemo(() => {
    return [...history]
      .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())
      .map((point) => ({
        price: Number(point.price),
        date: new Date(point.recordedAt).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
        }),
        timestamp: new Date(point.recordedAt).getTime(),
      }));
  }, [history]);

  // 2. Format Y-Axis value as clean currency numbers
  const formatYAxis = (value: number) => {
    return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  };

  // 3. Handle empty history logs gracefully
  if (!chartData || chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 dark:bg-gray-800/20 dark:border-gray-800">
        <p className="text-sm text-gray-500 dark:text-gray-400">No price history logged yet.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-64 bg-white dark:bg-gray-900 rounded-xl p-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e5e7eb"
            className="stroke-gray-100 dark:stroke-gray-800/40"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            stroke="#888888"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            dy={8}
            className="text-gray-500"
          />
          <YAxis
            stroke="#888888"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatYAxis}
            domain={["auto", "auto"]}
            dx={-4}
            className="text-gray-500"
          />
          <Tooltip
            contentStyle={{
              background: "#1f2937",
              border: "none",
              borderRadius: "8px",
              color: "#fff",
              fontSize: "12px",
            }}
            formatter={(value: number) => [
              `₹${value.toLocaleString("en-IN")}`,
              "Price",
            ]}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#2563eb" // Clean Indigo/Blue brand line
            strokeWidth={2.5}
            dot={{ r: 4, stroke: "#2563eb", strokeWidth: 1, fill: "#fff" }}
            activeDot={{ r: 6, stroke: "#2563eb", strokeWidth: 1, fill: "#2563eb" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
