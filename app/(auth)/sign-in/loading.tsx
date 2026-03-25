import { Loader2, Shield } from "lucide-react";

const SignInLoading = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-shop_light_bg via-white to-shop_light_pink">
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8 min-h-[80vh]">
          {/* Left Panel - Welcome Content */}
          <div className="flex flex-col justify-center space-y-8 lg:pr-12">
            <div className="space-y-6">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded-lg w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>

              <div className="space-y-4">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="flex items-center space-x-3 animate-pulse"
                  >
                    <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel - Sign-in Form */}
          <div className="flex flex-col justify-center lg:border-l border-gray-200 lg:pl-12">
            <div className="max-w-md mx-auto w-full space-y-6">
              <div className="text-center space-y-2">
                <div className="relative mx-auto w-16 h-16 bg-shop_light_green/20 rounded-full flex items-center justify-center mb-6">
                  <Shield className="w-8 h-8 text-shop_dark_green" />
                  <Loader2 className="absolute inset-0 w-16 h-16 text-shop_dark_green animate-spin" />
                </div>
                <div className="animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-32 mx-auto mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-48 mx-auto"></div>
                </div>
              </div>

              {/* Form Skeleton */}
              <div className="space-y-4">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                  <div className="h-12 bg-gray-200 rounded-lg"></div>
                </div>
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                  <div className="h-12 bg-gray-200 rounded-lg"></div>
                </div>
                <div className="animate-pulse">
                  <div className="h-12 bg-gray-200 rounded-lg"></div>
                </div>
              </div>

              <div className="text-center animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-40 mx-auto"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignInLoading;
