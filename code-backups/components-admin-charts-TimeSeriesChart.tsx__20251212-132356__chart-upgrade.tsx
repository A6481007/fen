'use client';

interface TimeSeriesPoint {
  label: string;
  value: number;
}

interface TimeSeriesChartProps {
  data: TimeSeriesPoint[];
  title?: string;
}

export function TimeSeriesChart({ data, title = "Time Series" }: TimeSeriesChartProps) {
  if (!data.length) {
    return (
      <div className="bg-white rounded-xl border p-6 text-sm text-gray-500">
        No data available.
      </div>
    );
  }

  const width = 100;
  const height = 60;
  const maxValue = Math.max(...data.map(point => point.value));
  const safeMax = maxValue > 0 ? maxValue : 1;
  const step = data.length > 1 ? width / (data.length - 1) : 0;
  const linePoints = data
    .map((point, index) => {
      const x = index * step;
      const y = height - (point.value / safeMax) * height;
      return `${x},${y}`;
    })
    .join(" ");
  const areaPoints = `0,${height} ${linePoints} ${width},${height}`;
  const currentValue = data[data.length - 1].value;
  const firstValue = data[0].value;
  const change = firstValue ? ((currentValue - firstValue) / firstValue) * 100 : null;

  return (
    <div className="bg-white rounded-xl border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{currentValue.toLocaleString()}</p>
          {change !== null && (
            <p className={`text-xs ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change >= 0 ? '+' : '-'}
              {Math.abs(change).toFixed(1)}% vs start
            </p>
          )}
        </div>
        <span className="text-xs text-gray-500">{data.length} points</span>
      </div>

      <div className="h-32">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          <defs>
            <linearGradient id="tsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <polygon
            points={areaPoints}
            fill="url(#tsGradient)"
            stroke="none"
            opacity={0.8}
          />
          <polyline
            points={linePoints}
            fill="none"
            stroke="#2563eb"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{data[0].label}</span>
        <span>{data[data.length - 1].label}</span>
      </div>
    </div>
  );
}
