"use client";

import { SignIn } from "@clerk/nextjs";
import { motion } from "motion/react";
import Link from "next/link";
import Logo from "@/components/common/Logo";
import { ArrowLeft, Shield, Users, Star } from "lucide-react";
import { contactConfig } from "@/config/contact";
import Container from "@/components/Container";
import { useSearchParams } from "next/navigation";

const SignInPage = () => {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo");

  const features = [
    {
      icon: Shield,
      title: "Secure Authentication",
      description: "Your data is protected with enterprise-grade security",
    },
    {
      icon: Users,
      title: "Trusted by Thousands",
      description: "Join our community of satisfied customers",
    },
    {
      icon: Star,
      title: "Premium Experience",
      description: "Access exclusive deals and personalized recommendations",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-shop_light_green/5 via-shop_light_bg to-shop_light_pink/50 relative overflow-hidden">
      <Container>
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,156,60,0.1)_0%,transparent_50%),radial-gradient(circle_at_80%_80%,rgba(251,108,8,0.08)_0%,transparent_50%),radial-gradient(circle_at_40%_40%,rgba(252,240,228,0.3)_0%,transparent_50%)]"></div>

        {/* Header */}
        <header className="relative z-10 px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 text-shop_dark_green hover:text-shop_light_green transition-colors duration-200 font-medium"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to Home</span>
            </Link>
            <Logo />
          </div>
        </header>

        <div className="flex flex-col lg:flex-row min-h-[calc(100vh-120px)]">
          {/* Left Side - Welcome Content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-8 py-8 lg:py-12"
          >
            <div className="max-w-md mx-auto lg:max-w-lg lg:mx-0">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-shop_dark_green mb-4">
                  Welcome Back!
                </h1>
                <p className="text-lg text-dark-text mb-8 leading-relaxed">
                  Sign in to access your account, track orders, and enjoy
                  personalized shopping experiences at{" "}
                  {contactConfig.company.name}.
                </p>
              </motion.div>

              {/* Features */}
              <div className="space-y-6">
                {features.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                    className="flex items-start gap-4"
                  >
                    <div className="p-2 bg-shop_light_green/10 rounded-lg flex-shrink-0">
                      <feature.icon className="w-5 h-5 text-shop_light_green" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-shop_dark_green mb-1">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-dark-text">
                        {feature.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Contact Support */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                className="mt-8 p-6 bg-white/80 backdrop-blur-sm rounded-xl border border-shop_light_green/20 shadow-sm"
              >
                <p className="text-sm text-dark-text">
                  Need help? Contact our support team at{" "}
                  <a
                    href={`mailto:${contactConfig.emails.support}`}
                    className="text-shop_light_green hover:text-shop_dark_green font-medium transition-colors duration-200"
                  >
                    {contactConfig.emails.support}
                  </a>
                </p>
              </motion.div>
            </div>
          </motion.div>

          {/* Right Side - Sign In Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8 lg:py-12"
          >
            <div className="w-full max-w-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100/50 p-8"
              >
                {/* Clerk Sign In Component */}
                <div className="clerk-sign-in">
                  <SignIn
                    signUpUrl={`/sign-up${
                      redirectTo
                        ? `?redirectTo=${encodeURIComponent(redirectTo)}`
                        : ""
                    }`}
                    forceRedirectUrl={redirectTo || "/user/dashboard"}
                    fallbackRedirectUrl={redirectTo || "/user/dashboard"}
                  />
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </Container>
    </div>
  );
};

export default SignInPage;
