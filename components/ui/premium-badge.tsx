import { Building2, Crown, Star, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PremiumBadgeProps {
  membershipType?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "outline";
}

export default function PremiumBadge({
  membershipType = "premium",
  size = "md",
  variant = "default",
}: PremiumBadgeProps) {
  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-2",
  };

  const getIcon = () => {
    switch (membershipType) {
      case "vip":
        return (
          <Crown
            className={`${
              size === "sm" ? "h-3 w-3" : size === "md" ? "h-4 w-4" : "h-5 w-5"
            } text-yellow-400`}
          />
        );
      case "premium":
        return (
          <Star
            className={`${
              size === "sm" ? "h-3 w-3" : size === "md" ? "h-4 w-4" : "h-5 w-5"
            } text-yellow-400`}
          />
        );
      case "business":
        return (
          <Building2
            className={`${
              size === "sm" ? "h-3 w-3" : size === "md" ? "h-4 w-4" : "h-5 w-5"
            } text-emerald-400`}
          />
        );
      default:
        return (
          <Zap
            className={`${
              size === "sm" ? "h-3 w-3" : size === "md" ? "h-4 w-4" : "h-5 w-5"
            } text-blue-400`}
          />
        );
    }
  };

  const getBadgeText = () => {
    switch (membershipType) {
      case "vip":
        return "VIP";
      case "premium":
        return "Premium";
      case "business":
        return "Dealer";
      default:
        return "Member";
    }
  };

  const getBadgeColor = () => {
    switch (membershipType) {
      case "vip":
        return "bg-gradient-to-r from-yellow-400 to-yellow-600 text-black";
      case "premium":
        return "bg-gradient-to-r from-purple-500 to-purple-700 text-white";
      case "business":
        return "bg-gradient-to-r from-emerald-500 to-emerald-700 text-white";
      default:
        return "bg-gradient-to-r from-blue-500 to-blue-700 text-white";
    }
  };

  return (
    <Badge
      variant={variant}
      className={`
        ${
          variant === "default"
            ? getBadgeColor()
            : "border-2 border-purple-500 text-purple-700"
        }
        ${sizeClasses[size]} 
        font-semibold 
        flex 
        items-center 
        gap-1 
        shadow-sm
        hover:shadow-md 
        transition-shadow
      `}
    >
      {getIcon()}
      {getBadgeText()}
    </Badge>
  );
}
