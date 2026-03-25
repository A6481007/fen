# Actions and Libs Inventory

This file lists server actions and library modules used by admin/employee and content flows.

## Server Actions (actions/*.ts)

- File: actions/adminWithdrawalActions.ts
  Exports: getAllWithdrawalRequests, approveWithdrawal, completeWithdrawal, rejectWithdrawal
- File: actions/emailUserActions.ts
  Exports: createAddressForUser, updateAddressForUser, deleteAddressForUser, simulateAddToCart, getUserEmailFromClerk
- File: actions/employeeActions.ts
  Exports: assignEmployeeRole, removeEmployeeRole, updateEmployeeStatus, getAllEmployees, getEmployeesByRole, getCurrentEmployee, getAllUsers, updateEmployeePerformance
- File: actions/employeeSalesContactActions.ts
  Exports: getEmployeeSalesContact, updateEmployeeSalesContact
- File: actions/orderCancellationActions.ts
  Exports: approveCancellationRequest, rejectCancellationRequest, cancelOrder, requestOrderCancellation
- File: actions/orderEmployeeActions.ts
  Exports: confirmAddress, updateShippingAddress, confirmOrder, updateQuotationDetails, confirmQuotationSelection, markAsPacked, assignDeliveryman, markAsDelivered, collectCash, startDelivery, rescheduleDelivery, markDeliveryFailed, receivePaymentFromDeliveryman, submitCashToAccounts, rejectCashSubmission, getOrdersForEmployee, getOrdersForAccounts, getAccountsPaymentStats, getActiveAccountsEmployees
- File: actions/reviewActions.ts
  Exports: submitReview, getProductReviews, markReviewHelpful, canUserReviewProduct, approveReview, rejectReview, getPendingReviews
- File: actions/subscriptionActions.ts
  Exports: subscribeToNewsletter, unsubscribeFromNewsletter, checkSubscriptionStatus
- File: actions/userActions.ts
  Exports: createOrUpdateUser, addToCart, updateCartItem, removeFromCart, clearCart, addToWishlist, removeFromWishlist, createAddress, updateAddress, deleteAddress
- File: actions/walletActions.ts
  Exports: getUserWalletBalance, getWalletTransactions, addWalletCredit, deductWalletBalance, requestWithdrawal, getWithdrawalRequests, cancelWithdrawalRequest
- File: actions/wishlistActions.ts
  Exports: (none detected)

## Libraries (lib/)

- lib/.DS_Store
- lib/address.ts
- lib/addressBookSync.ts
- lib/adminReviewAPI.ts
- lib/adminUtils.ts
- lib/analytics/pixels.ts
- lib/analytics.ts
- lib/cache.ts
- lib/cart/actions.ts
- lib/cart/client.ts
- lib/cart/discountBreakdown.ts
- lib/cart/grouping.ts
- lib/cart/types.ts
- lib/cart/viewModel.ts
- lib/customerCode.ts
- lib/emailImageUtils.ts
- lib/emailService.ts
- lib/featureFlags.ts
- lib/firebase.ts
- lib/firebaseAdmin.ts
- lib/hooks/useDealerPricing.ts
- lib/hooks/usePricingSettings.ts
- lib/hooks/useSolutionCart.ts
- lib/hooks/useTaxRate.ts
- lib/notificationService.ts
- lib/orderStatus.ts
- lib/pointsCalculation.ts
- lib/promotions/analytics.ts
- lib/promotions/anomalyDetection.ts
- lib/promotions/churnPrediction.ts
- lib/promotions/discountOptimizer.ts
- lib/promotions/fraudGateway.ts
- lib/promotions/promotionEngine.ts
- lib/promotions/promotionMessaging.ts
- lib/promotions/pushAdapter.ts
- lib/promotions/sessionAnalytics.ts
- lib/promotions/smsAdapter.ts
- lib/queue/analytics-queue.ts
- lib/queue/fallback-queue.ts
- lib/quotationService.ts
- lib/rate-limit/redis-rate-limiter.ts
- lib/rateLimit.ts
- lib/reviewAPI.ts
- lib/sanity/category.utils.ts
- lib/segmentation/rules.ts
- lib/seo/structured-data.ts
- lib/seo.ts
- lib/stripe.ts
- lib/taxRate.ts
- lib/toast.ts
- lib/utils.ts