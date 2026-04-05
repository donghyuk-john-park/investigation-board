"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { ConfidenceSnapshot } from "@/lib/types";

const triggerLabels: Record<string, string> = {
  creation: "Created",
  evidence_added: "Evidence",
  review_completed: "Review",
  manual: "Manual",
};

export default function ConfidenceChart({
  snapshots,
}: {
  snapshots: ConfidenceSnapshot[];
}) {
  if (snapshots.length <= 1) {
    return (
      <div className="text-center py-4 text-xs text-gray-600">
        Confidence trend will appear after updates
      </div>
    );
  }

  const data = snapshots.map((s) => ({
    date: new Date(s.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    confidence: s.confidence,
    trigger: triggerLabels[s.trigger] || s.trigger,
  }));

  return (
    <div className="h-32">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "#666" }}
            axisLine={{ stroke: "#333" }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 10]}
            tick={{ fontSize: 10, fill: "#666" }}
            axisLine={{ stroke: "#333" }}
            tickLine={false}
            width={24}
          />
          <Tooltip
            contentStyle={{
              background: "#1e293b",
              border: "1px solid #334155",
              borderRadius: 6,
              fontSize: 12,
            }}
            formatter={(value, _name, props) => [
              `${value}/10 (${(props as unknown as { payload: { trigger: string } }).payload.trigger})`,
              "Confidence",
            ]}
          />
          <Line
            type="monotone"
            dataKey="confidence"
            stroke="#818cf8"
            strokeWidth={2}
            dot={{ fill: "#818cf8", r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
