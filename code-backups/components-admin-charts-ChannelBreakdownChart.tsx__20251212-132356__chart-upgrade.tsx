'use client';

interface ChannelBreakdownItem {
  channel: string;
  value: number;
}

interface ChannelBreakdownChartProps {
  data: ChannelBreakdownItem[];
}

const channelColors = ["bg-blue-500", "bg-emerald-500", "bg-indigo-500", "bg-amber-500", "bg-rose-500"];

export function ChannelBreakdownChart({ data }: ChannelBreakdownChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="bg-white rounded-xl border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Channel Breakdown</h3>
        <span className="text-xs text-gray-500">{total.toLocaleString()} total</span>
      </div>

      {total === 0 ? (
        <p className="text-sm text-gray-500">No channel data available.</p>
      ) : (
        <div className="space-y-3">
          {data.map((item, index) => {
            const percentage = total > 0 ? (item.value / total) * 100 : 0;
            const color = channelColors[index % channelColors.length];

            return (
              <div key={item.channel} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-800">{item.channel}</span>
                  <span className="text-gray-600">
                    {item.value.toLocaleString()} ({percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full ${color} transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
