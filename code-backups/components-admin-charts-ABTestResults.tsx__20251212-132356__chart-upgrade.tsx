'use client';

interface VariantResult {
  name: string;
  conversions: number;
  users: number;
  revenue?: number;
}

interface ABTestResultsProps {
  variants: VariantResult[];
}

export function ABTestResults({ variants }: ABTestResultsProps) {
  if (!variants.length) {
    return (
      <div className="bg-white rounded-xl border p-6 text-sm text-gray-500">
        No A/B test data available.
      </div>
    );
  }

  const variantsWithRate = variants.map((variant) => ({
    ...variant,
    conversionRate: variant.users > 0 ? (variant.conversions / variant.users) * 100 : 0,
  }));

  const baseRate = variantsWithRate[0].conversionRate;
  const bestRate = Math.max(...variantsWithRate.map((variant) => variant.conversionRate));

  return (
    <div className="bg-white rounded-xl border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">A/B Test Results</h3>
          <p className="text-sm text-gray-500">Conversions and rates by variant</p>
        </div>
        <span className="text-xs text-gray-500">{variants.length} variants</span>
      </div>

      <div className="space-y-3">
        {variantsWithRate.map((variant) => {
          const uplift = baseRate ? ((variant.conversionRate - baseRate) / baseRate) * 100 : null;
          const isWinner = variant.conversionRate === bestRate;

          return (
            <div
              key={variant.name}
              className={`rounded-lg border p-3 ${isWinner ? 'border-green-500 bg-green-50' : 'border-gray-100'}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{variant.name}</p>
                  <p className="text-xs text-gray-500">
                    {variant.users.toLocaleString()} users
                  </p>
                </div>
                {isWinner && (
                  <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded-full">
                    Leader
                  </span>
                )}
              </div>

              <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-700">
                <span>
                  Conversions: <strong>{variant.conversions.toLocaleString()}</strong>
                </span>
                <span>
                  Rate: <strong>{variant.conversionRate.toFixed(2)}%</strong>
                </span>
                {variant.revenue !== undefined && (
                  <span>
                    Revenue: <strong>${variant.revenue.toLocaleString()}</strong>
                  </span>
                )}
                {uplift !== null && !Number.isNaN(uplift) && (
                  <span className={`font-medium ${uplift >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {uplift >= 0 ? '+' : '-'}
                    {Math.abs(uplift).toFixed(1)}% vs control
                  </span>
                )}
              </div>

              <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${Math.min(variant.conversionRate, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
