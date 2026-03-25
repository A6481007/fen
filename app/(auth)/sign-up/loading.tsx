import { Loader2, Users, Star, Award } from "lucide-react";

const SignUpLoading = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-shop_light_bg via-white to-shop_light_pink">
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8 min-h-[80vh]">
          {/* Left Panel - Benefits */}
          <div className="flex flex-col justify-center space-y-8 lg:pr-12">
            <div className="space-y-6">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded-lg w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>

              {/* Benefits Grid Skeleton */}
              <div className="grid sm:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((item) => (
                  <div
                    key={item}
                    className="p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-shop_light_green/20 animate-pulse"
                  >
                    <div className="w-8 h-8 bg-gray-200 rounded-lg mb-3"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-full"></div>
                  </div>
                ))}
              </div>

              {/* Trust Indicators Skeleton */}
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-shop_light_green/20">
                <div className="grid grid-cols-3 gap-6 text-center">
                  <div className="animate-pulse">
                    <Users className="w-6 h-6 text-shop_dark_green mx-auto mb-2" />
                    <div className="h-6 bg-gray-200 rounded w-12 mx-auto mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-16 mx-auto"></div>
                  </div>
                  <div className="animate-pulse">
                    <Star className="w-6 h-6 text-shop_dark_green mx-auto mb-2" />
                    <div className="h-6 bg-gray-200 rounded w-12 mx-auto mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-20 mx-auto"></div>
                  </div>
                  <div className="animate-pulse">
                    <Award className="w-6 h-6 text-shop_dark_green mx-auto mb-2" />
                    <div className="h-6 bg-gray-200 rounded w-16 mx-auto mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-12 mx-auto"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Sign-up Form */}
          <div className="flex flex-col justify-center lg:border-l border-gray-200 lg:pl-12">
            <div className="max-w-md mx-auto w-full space-y-6">
              <div className="text-center space-y-2">
                <div className="relative mx-auto w-16 h-16 bg-shop_light_green/20 rounded-full flex items-center justify-center mb-6">
                  <Users className="w-8 h-8 text-shop_dark_green" />
                  <Loader2 className="absolute inset-0 w-16 h-16 text-shop_dark_green animate-spin" />
                </div>
                <div className="animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-36 mx-auto mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-52 mx-auto"></div>
                </div>
              </div>

              {/* Form Skeleton */}
              <div className="space-y-4">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-12 bg-gray-200 rounded-lg"></div>
                </div>
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

              <div className="space-y-4">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                </div>
                <div className="text-center animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-44 mx-auto"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUpLoading;
