import { Loader2 } from "lucide-react";

const AuthLoading = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-shop_light_bg via-white to-shop_light_pink flex items-center justify-center">
      <div className="text-center">
        <div className="relative">
          <Loader2 className="w-12 h-12 text-shop_dark_green animate-spin mx-auto mb-4" />
          <div className="absolute inset-0 w-12 h-12 border-2 border-shop_light_green/30 rounded-full animate-pulse mx-auto"></div>
        </div>
        <h2 className="text-xl font-semibold text-shop_dark_green mb-2">
          Loading Authentication...
        </h2>
        <p className="text-dark-text">
          Please wait while we prepare your sign-in experience.
        </p>
      </div>
    </div>
  );
};

export default AuthLoading;
