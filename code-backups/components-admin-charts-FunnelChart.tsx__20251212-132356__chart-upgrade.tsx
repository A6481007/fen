'use client';

interface FunnelData {
  stage: string;
  value: number;
}

interface FunnelChartProps {
  data: FunnelData[];
}

export function FunnelChart({ data }: FunnelChartProps) {
  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div className="space-y-4">
      {data.map((item, index) => {
        const width = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
        const dropOff = index > 0 && data[index - 1].value > 0
          ? (((data[index - 1].value - item.value) / data[index - 1].value) * 100).toFixed(1)
          : null;

        return (
          <div key={item.stage} className="relative">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium">{item.stage}</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-900 font-bold">{item.value.toLocaleString()}</span>
                {dropOff && (
                  <span className="text-red-500 text-sm">
                    (-{dropOff}%)
                  </span>
                )}
              </div>
            </div>
            <div className="h-8 bg-gray-100 rounded-lg overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
