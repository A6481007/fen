"use client";
import Logo from "./common/Logo";
import { motion } from "motion/react";
import { ShoppingBag, Package, Truck, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";

const Loading = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loadingText, setLoadingText] = useState(
    "Preparing your shopping experience..."
  );

  const loadingSteps = [
    {
      icon: ShoppingBag,
      text: "Preparing your shopping experience...",
      color: "text-brand-black-strong",
    },
    {
      icon: Package,
      text: "Loading products...",
      color: "text-brand-text-main",
    },
    {
      icon: Truck,
      text: "Setting up delivery options...",
      color: "text-brand-red-accent",
    },
    {
      icon: CheckCircle,
      text: "Almost ready!",
      color: "text-brand-text-main",
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        const nextStep = (prev + 1) % loadingSteps.length;
        setLoadingText(loadingSteps[nextStep].text);
        return nextStep;
      });
    }, 1200);

    return () => clearInterval(interval);
  }, []);

  const CurrentIcon = loadingSteps[currentStep].icon;

  return (
    <div className="fixed min-h-screen w-full bg-brand-background-subtle left-0 top-0 flex items-center justify-center z-50">
      <div className="flex flex-col justify-center items-center gap-8 max-w-md mx-auto px-6">
        {/* Logo with enhanced animation */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Logo />
        </motion.div>

        {/* Progress Dots */}
        <div className="flex space-x-3">
          {loadingSteps.map((_, index) => (
            <motion.div
              key={index}
              className={`w-3 h-3 rounded-full ${
                index === currentStep
                  ? "bg-brand-red-accent shadow-lg"
                  : index < currentStep
                  ? "bg-brand-text-main"
                  : "bg-gray-300"
              }`}
              animate={{
                scale: index === currentStep ? [1, 1.3, 1] : 1,
                opacity: index <= currentStep ? 1 : 0.5,
              }}
              transition={{
                duration: 0.6,
                repeat: index === currentStep ? Infinity : 0,
                repeatDelay: 0.3,
              }}
            />
          ))}
        </div>

        {/* Main Loading Content */}
        <div className="text-center space-y-6">
          {/* Animated Icon */}
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.5, rotate: 10 }}
            transition={{ duration: 0.5 }}
            className="flex justify-center"
          >
            <div
              className={`p-4 rounded-full bg-white shadow-lg border-2 border-brand-text-main/20`}
            >
              <CurrentIcon
                className={`w-8 h-8 ${loadingSteps[currentStep].color}`}
                strokeWidth={2}
              />
            </div>
          </motion.div>

          {/* Loading Text */}
          <motion.div
            key={loadingText}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="space-y-2"
          >
            <h2 className="text-xl font-semibold text-brand-black-strong">
              {loadingText}
            </h2>
            <p className="text-sm text-gray-600">
              Please wait while we set up everything for you
            </p>
          </motion.div>

          {/* Progress Bar */}
          <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-brand-text-main to-brand-red-accent rounded-full"
              initial={{ width: "0%" }}
              animate={{
                width: `${((currentStep + 1) / loadingSteps.length) * 100}%`,
              }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
            />
          </div>

          {/* Percentage */}
          <motion.p
            className="text-sm font-medium text-brand-black-strong"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {Math.round(((currentStep + 1) / loadingSteps.length) * 100)}%
            Complete
          </motion.p>
        </div>
      </div>
    </div>
  );
};

export default Loading;
