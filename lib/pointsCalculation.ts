export interface PointsCalculation {
  rewardPoints: number;
  loyaltyPoints: number;
  message: string[];
}

export function calculateRewardPoints(orderTotal: number): number {
  const threshold = parseFloat(process.env.REWARD_POINTS_THRESHOLD || "3000");
  const basePoints = parseInt(process.env.REWARD_POINTS_AMOUNT || "5");

  if (orderTotal < threshold) {
    return 0;
  }

  // Calculate how many thresholds the order amount covers
  const thresholdMultiplier = Math.floor(orderTotal / threshold);

  // For higher amounts, reduce points per threshold (inverse relationship)
  // Base points for first threshold, then decrease by 1 for each additional threshold
  let totalPoints = 0;

  for (let i = 0; i < thresholdMultiplier; i++) {
    const pointsForThisThreshold = Math.max(basePoints - i, 1); // Minimum 1 point
    totalPoints += pointsForThisThreshold;
  }

  return totalPoints;
}

export function calculateLoyaltyPoints(completedOrders: number): number {
  const orderThreshold = parseInt(
    process.env.LOYALTY_POINTS_ORDER_THRESHOLD || "5"
  );
  const pointsAmount = parseInt(process.env.LOYALTY_POINTS_AMOUNT || "100");

  // Calculate how many loyalty point milestones have been reached
  const milestones = Math.floor(completedOrders / orderThreshold);
  return milestones * pointsAmount;
}

export function calculatePointsUpdate(
  orderTotal: number,
  currentCompletedOrders: number,
  currentRewardPoints: number = 0,
  currentLoyaltyPoints: number = 0
): PointsCalculation {
  const newRewardPoints = calculateRewardPoints(orderTotal);
  const newCompletedOrders = currentCompletedOrders + 1;
  const totalLoyaltyPoints = calculateLoyaltyPoints(newCompletedOrders);
  const loyaltyPointsEarned = totalLoyaltyPoints - currentLoyaltyPoints;

  const messages: string[] = [];

  if (newRewardPoints > 0) {
    const threshold = process.env.REWARD_POINTS_THRESHOLD || "3000";
    messages.push(
      `Earned ${newRewardPoints} reward points for order over $${threshold}!`
    );
  }

  if (loyaltyPointsEarned > 0) {
    messages.push(
      `Earned ${loyaltyPointsEarned} loyalty points for completing ${newCompletedOrders} orders!`
    );
  }

  return {
    rewardPoints: currentRewardPoints + newRewardPoints,
    loyaltyPoints: totalLoyaltyPoints,
    message: messages,
  };
}
