import React from "react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtext: string;
  icon: React.ReactNode;
  valueColor?: string;
}

export default function MetricCard({
  title,
  value,
  subtext,
  icon,
  valueColor = "text-white",
}: MetricCardProps) {
  return (
    <div className="bg-[#242E3D] p-6 rounded-2xl shadow-lg border border-slate-700/50 flex flex-col justify-between">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-slate-500/10 rounded-lg">{icon}</div>
      </div>
      <div>
        <p className="text-slate-400 text-sm font-medium mb-1">{title}</p>
        <h2 className={`text-3xl font-bold ${valueColor}`}>{value}</h2>
        <p className="text-xs text-slate-500 mt-2">{subtext}</p>
      </div>
    </div>
  );
}
