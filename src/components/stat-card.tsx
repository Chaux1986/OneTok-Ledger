interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  subtext?: string;
  color?: string;
}

export default function StatCard({ icon, label, value, subtext, color = "indigo" }: StatCardProps) {
  const colorMap: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-600",
    green: "bg-green-50 text-green-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
    blue: "bg-blue-50 text-blue-600",
    purple: "bg-purple-50 text-purple-600",
    teal: "bg-teal-50 text-teal-600",
    pink: "bg-pink-50 text-pink-600",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg ${colorMap[color] || colorMap.indigo}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="text-xl font-bold text-slate-900">{value}</p>
          {subtext && <p className="text-xs text-slate-400">{subtext}</p>}
        </div>
      </div>
    </div>
  );
}
