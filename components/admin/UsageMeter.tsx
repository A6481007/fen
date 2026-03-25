interface UsageMeterProps {
  used: number;
  limit?: number;
  label?: string;
}

export function UsageMeter({ used, limit, label = "Usage" }: UsageMeterProps) {
  const percentage = limit ? Math.min(100, (used / limit) * 100) : 0;
  const isWarning = percentage > 80;
  const isCritical = percentage > 95;
  const remaining = limit ? Math.max(0, limit - used) : null;

  return (
    <div className="bg-white rounded-xl p-6 border">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{used.toLocaleString()}</p>
          {limit ? (
            <p className="text-xs text-gray-500">
              {remaining?.toLocaleString()} remaining of {limit.toLocaleString()}
            </p>
          ) : (
            <p className="text-xs text-gray-400">No usage limit set</p>
          )}
        </div>
        <span className={`text-sm font-medium ${isCritical ? 'text-red-600' : isWarning ? 'text-orange-600' : 'text-blue-600'}`}>
          {limit ? `${percentage.toFixed(1)}%` : "Unlimited"}
        </span>
      </div>

      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${
            isCritical ? 'bg-red-500' : isWarning ? 'bg-orange-500' : 'bg-blue-500'
          }`}
          style={{ width: limit ? `${percentage}%` : "100%" }}
        />
      </div>
    </div>
  );
}
