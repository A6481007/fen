interface OrderPlacementSkeletonProps {
  step?: "validating" | "creating" | "emailing" | "redirecting";
  isCheckoutRedirect?: boolean;
}

export function OrderPlacementSkeleton({
  step = "creating",
  isCheckoutRedirect = false,
}: OrderPlacementSkeletonProps) {
  const getStepStatus = (currentStep: string) => {
    const steps = ["validating", "creating", "emailing", "redirecting"];
    const currentIndex = steps.indexOf(step);
    const stepIndex = steps.indexOf(currentStep);

    if (stepIndex < currentIndex) return "completed";
    if (stepIndex === currentIndex) return "active";
    return "pending";
  };

  const getStepDisplay = (stepName: string) => {
    const status = getStepStatus(stepName);
    return {
      completed: "text-success-base font-medium",
      active:
        "text-success-base font-medium flex items-center justify-center gap-2",
      pending: "text-gray-400",
    }[status];
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-white border border-gray-200 rounded-xl shadow-lg mx-auto w-full">
      <div className="text-center space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="space-y-3 sm:space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800">
              {isCheckoutRedirect &&
                step === "redirecting" &&
                "Redirecting to Checkout"}
              {!isCheckoutRedirect &&
                step === "validating" &&
                "Validating Your Order"}
              {!isCheckoutRedirect &&
                step === "creating" &&
                "Processing Your Order"}
              {!isCheckoutRedirect &&
                step === "emailing" &&
                "Sending Confirmation"}
              {!isCheckoutRedirect &&
                step === "redirecting" &&
                "Order Confirmed!"}
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 max-w-xs sm:max-w-sm mx-auto px-2">
              {isCheckoutRedirect &&
                step === "redirecting" &&
                "Taking you to the secure checkout page where you can complete your payment"}
              {!isCheckoutRedirect &&
                step === "validating" &&
                "We're verifying your order details and checking product availability"}
              {!isCheckoutRedirect &&
                step === "creating" &&
                "Your order is being securely processed and saved to our system"}
              {!isCheckoutRedirect &&
                step === "emailing" &&
                "We're sending your order confirmation and receipt via email"}
              {!isCheckoutRedirect &&
                step === "redirecting" &&
                "Taking you to the order confirmation page"}
            </p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="space-y-4 sm:space-y-6">
          <div className="flex justify-center items-center space-x-2 sm:space-x-3 px-2">
            {[1, 2, 3, 4].map((stepNum, index) => {
              const stepName = [
                "validating",
                "creating",
                "emailing",
                "redirecting",
              ][index];
              const status = getStepStatus(stepName);

              return (
                <div key={stepNum} className="flex items-center">
                  <div
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all duration-300 ${
                      status === "completed"
                        ? "bg-success-base text-white scale-110"
                        : status === "active"
                        ? "bg-blue-600 text-white animate-pulse scale-110"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {status === "completed" ? "✓" : stepNum}
                  </div>
                  {index < 3 && (
                    <div
                      className={`w-6 sm:w-8 h-1 mx-1 sm:mx-2 rounded transition-all duration-500 ${
                        getStepStatus(
                          ["validating", "creating", "emailing", "redirecting"][
                            index + 1
                          ]
                        ) === "completed" ||
                        getStepStatus(
                          ["validating", "creating", "emailing", "redirecting"][
                            index + 1
                          ]
                        ) === "active"
                          ? "bg-success-base"
                          : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="space-y-3 sm:space-y-4 max-w-xs sm:max-w-sm mx-auto px-2">
            <div className={getStepDisplay("validating")}>
              {getStepStatus("validating") === "completed" && (
                <span className="text-success-base font-bold">✓</span>
              )}
              {getStepStatus("validating") === "active" && (
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              )}
              <span className="ml-2">Verifying Order Details</span>
            </div>

            <div className={getStepDisplay("creating")}>
              {getStepStatus("creating") === "completed" && (
                <span className="text-success-base font-bold">✓</span>
              )}
              {getStepStatus("creating") === "active" && (
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              )}
              <span className="ml-2">Processing Payment & Order</span>
            </div>

            <div className={getStepDisplay("emailing")}>
              {getStepStatus("emailing") === "completed" && (
                <span className="text-success-base font-bold">✓</span>
              )}
              {getStepStatus("emailing") === "active" && (
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              )}
              <span className="ml-2">Sending Email Confirmation</span>
            </div>

            <div className={getStepDisplay("redirecting")}>
              {getStepStatus("redirecting") === "completed" && (
                <span className="text-success-base font-bold">✓</span>
              )}
              {getStepStatus("redirecting") === "active" && (
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              )}
              <span className="ml-2">Redirecting to Confirmation</span>
            </div>
          </div>
        </div>

        {/* Order Summary Skeleton */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 sm:p-6 space-y-3 sm:space-y-4 border border-blue-100 mx-2 sm:mx-0">
          <div className="text-base font-semibold text-gray-800 mb-4 text-center">
            📦 Order Summary
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="h-4 bg-blue-200 rounded-full w-28 animate-pulse" />
              <div className="h-4 bg-blue-200 rounded-full w-20 animate-pulse" />
            </div>
            <div className="flex justify-between items-center">
              <div className="h-4 bg-blue-200 rounded-full w-24 animate-pulse" />
              <div className="h-4 bg-blue-200 rounded-full w-16 animate-pulse" />
            </div>
            <div className="flex justify-between items-center">
              <div className="h-4 bg-blue-200 rounded-full w-20 animate-pulse" />
              <div className="h-4 bg-blue-200 rounded-full w-14 animate-pulse" />
            </div>
            <div className="border-t border-blue-200 pt-3 mt-4">
              <div className="flex justify-between items-center">
                <div className="h-5 bg-blue-300 rounded-full w-24 animate-pulse font-bold" />
                <div className="h-5 bg-blue-300 rounded-full w-20 animate-pulse font-bold" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Message */}
        <div className="text-xs sm:text-sm text-gray-600 space-y-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4 mx-2 sm:mx-0">
          <p className="flex items-center justify-center gap-2 font-medium">
            🔒 <span>Secure Processing</span>
          </p>
          <p className="text-xs text-center text-gray-500">
            Please keep this window open until the process completes
          </p>
        </div>
      </div>
    </div>
  );
}

export function OrderPlacementOverlay({
  step = "creating",
  isCheckoutRedirect = false,
}: OrderPlacementSkeletonProps) {
  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 md:p-8"
      style={{ zIndex: 9999 }}
    >
      <div className="w-full max-w-md max-h-[90vh] sm:max-w-lg animate-in fade-in-0 zoom-in-95 duration-300 overflow-y-auto">
        <OrderPlacementSkeleton
          step={step}
          isCheckoutRedirect={isCheckoutRedirect}
        />
      </div>
    </div>
  );
}
