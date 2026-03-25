interface BudgetMeterProps {
  spent: number;
  cap?: number;
}

export function BudgetMeter({ spent, cap }: BudgetMeterProps) {
  const percentage = cap ? Math.min(100, (spent / cap) * 100) : 0;
  const isWarning = percentage > 80;
  const isCritical = percentage > 95;

  return (
    <div className="bg-white rounded-xl p-6 border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold">Budget Usage</h3>
        <span className={`text-sm font-medium ${isCritical ? 'text-red-600' : isWarning ? 'text-orange-600' : 'text-gray-600'}`}>
          {percentage.toFixed(1)}%
        </span>
      </div>
      
      <div className="h-4 bg-gray-100 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full transition-all duration-500 ${
            isCritical ? 'bg-red-500' : isWarning ? 'bg-orange-500' : 'bg-blue-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      <div className="flex justify-between text-sm text-gray-500">
        <span>${spent.toLocaleString()} spent</span>
        {cap && <span>${cap.toLocaleString()} cap</span>}
      </div>
      
      {!cap && (
        <p className="text-sm text-gray-400 mt-2">No budget cap set</p>
      )}
    </div>
  );
}
