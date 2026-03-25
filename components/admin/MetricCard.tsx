interface MetricCardProps {
  title: string;
  value: string;
  change?: number;
  icon: string;
  highlight?: boolean;
}

export function MetricCard({ title, value, change, icon, highlight }: MetricCardProps) {
  return (
    <div className={`bg-white rounded-xl p-6 border ${highlight ? 'border-green-500 bg-green-50' : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className={`text-3xl font-bold ${highlight ? 'text-green-600' : ''}`}>
            {value}
          </p>
          {change !== undefined && change !== 0 && (
            <p className={`text-sm mt-1 ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change > 0 ? '↑' : '↓'} {Math.abs(change)}% vs last period
            </p>
          )}
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}
