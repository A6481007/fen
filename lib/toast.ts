import { toast } from "sonner";

// Enhanced toast utilities with theme-aware styling and better UX
export const showToast = {
  // Success toast with custom styling
  success: (message: string, description?: string) => {
    toast.success(message, {
      description,
      duration: 4000,
      action: {
        label: "✓",
        onClick: () => {},
      },
    });
  },

  // Error toast with enhanced styling
  error: (message: string, description?: string) => {
    toast.error(message, {
      description,
      duration: 6000,
      action: {
        label: "Retry",
        onClick: () => {
          // You can customize retry logic here
        },
      },
    });
  },

  // Warning toast
  warning: (message: string, description?: string) => {
    toast.warning(message, {
      description,
      duration: 5000,
    });
  },

  // Info toast
  info: (message: string, description?: string) => {
    toast.info(message, {
      description,
      duration: 4000,
    });
  },

  // Loading toast for async operations
  loading: (message: string) => {
    return toast.loading(message, {
      duration: Infinity,
    });
  },

  // Promise toast for handling async operations
  promise: function <T>(
    promise: Promise<T>,
    options: {
      loading?: string;
      success?: string | ((data: T) => string);
      error?: string | ((error: Error) => string);
    }
  ) {
    return toast.promise(promise, {
      loading: options.loading || "Loading...",
      success: options.success || "Success!",
      error: options.error || "Something went wrong!",
    });
  },

  // Custom toast with action
  custom: (message: string, action: { label: string; onClick: () => void }) => {
    toast(message, {
      action,
      duration: 5000,
    });
  },

  // Dismiss all toasts
  dismiss: () => {
    toast.dismiss();
  },
};

// Theme-aware toast colors (you can use these in components)
export const toastColors = {
  success: "#10b981", // emerald-500
  error: "#ef4444", // red-500
  warning: "#f59e0b", // amber-500
  info: "#3b82f6", // blue-500
  dark: "#1f2937", // gray-800
  light: "#ffffff", // white
};
