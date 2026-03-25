"use client";

import "@/app/i18n";
import { useState } from "react";
import { motion } from "motion/react";
import {
  Mail,
  Phone,
  MessageSquare,
  Clock,
  ChevronRight,
  Search,
  ShoppingBag,
  CreditCard,
  Truck,
  RotateCcw,
  Shield,
  BookOpen,
  Video,
} from "lucide-react";
import Link from "next/link";
import Container from "@/components/Container";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";

type HelpPageClientProps = {
  showHeroSection?: boolean;
};

const HelpPageClient = ({ showHeroSection = true }: HelpPageClientProps) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");

  const helpCategories = [
    {
      title: t("client.help.categories.gettingStarted.title"),
      icon: BookOpen,
      description: t("client.help.categories.gettingStarted.description"),
      color: "from-shop_light_green to-shop_dark_green",
      links: [
        { title: t("client.help.categories.gettingStarted.links.account"), href: "/faq#account-1" },
        { title: t("client.help.categories.gettingStarted.links.firstOrder"), href: "/faq#shopping-1" },
        { title: t("client.help.categories.gettingStarted.links.payments"), href: "/faq#payment-1" },
        { title: t("client.help.categories.gettingStarted.links.profile"), href: "/faq#account-3" },
      ],
    },
    {
      title: t("client.help.categories.orders.title"),
      icon: ShoppingBag,
      description: t("client.help.categories.orders.description"),
      color: "from-shop_orange to-shop_light_orange",
      links: [
        { title: t("client.help.categories.orders.links.placeOrder"), href: "/faq#shopping-1" },
        { title: t("client.help.categories.orders.links.modifyOrder"), href: "/faq#shopping-2" },
        { title: t("client.help.categories.orders.links.tracking"), href: "/faq#shopping-3" },
        { title: t("client.help.categories.orders.links.outOfStock"), href: "/faq#shopping-4" },
      ],
    },
    {
      title: t("client.help.categories.payments.title"),
      icon: CreditCard,
      description: t("client.help.categories.payments.description"),
      color: "from-light-blue to-dark-blue",
      links: [
        { title: t("client.help.categories.payments.links.methods"), href: "/faq#payment-1" },
        { title: t("client.help.categories.payments.links.security"), href: "/faq#payment-2" },
        { title: t("client.help.categories.payments.links.charged"), href: "/faq#payment-3" },
        { title: t("client.help.categories.payments.links.refunds"), href: "/faq#payment-4" },
      ],
    },
    {
      title: t("client.help.categories.shipping.title"),
      icon: Truck,
      description: t("client.help.categories.shipping.description"),
      color: "from-shop_light_green to-light-green",
      links: [
        { title: t("client.help.categories.shipping.links.costs"), href: "/faq#shipping-1" },
        { title: t("client.help.categories.shipping.links.delivery"), href: "/faq#shipping-2" },
        { title: t("client.help.categories.shipping.links.international"), href: "/faq#shipping-3" },
        { title: t("client.help.categories.shipping.links.lostDamaged"), href: "/faq#shipping-4" },
      ],
    },
    {
      title: t("client.help.categories.returns.title"),
      icon: RotateCcw,
      description: t("client.help.categories.returns.description"),
      color: "from-dark-red to-light-orange",
      links: [
        { title: t("client.help.categories.returns.links.policy"), href: "/faq#returns-1" },
        { title: t("client.help.categories.returns.links.howTo"), href: "/faq#returns-2" },
        { title: t("client.help.categories.returns.links.timeline"), href: "/faq#returns-3" },
        { title: t("client.help.categories.returns.links.exchanges"), href: "/faq#returns-4" },
      ],
    },
    {
      title: t("client.help.categories.account.title"),
      icon: Shield,
      description: t("client.help.categories.account.description"),
      color: "from-shop_dark_green to-shop_btn_dark_green",
      links: [
        { title: t("client.help.categories.account.links.security"), href: "/faq#account-1" },
        { title: t("client.help.categories.account.links.reset"), href: "/faq#account-2" },
        { title: t("client.help.categories.account.links.update"), href: "/faq#account-3" },
        { title: t("client.help.categories.account.links.delete"), href: "/faq#account-4" },
      ],
    },
  ];

  const quickActions = [
    {
      title: t("client.help.quickActions.track.title"),
      description: t("client.help.quickActions.track.description"),
      icon: Search,
      action: t("client.help.quickActions.track.action"),
      href: "/orders",
      color: "bg-shop_light_green",
    },
    {
      title: t("client.help.quickActions.contact.title"),
      description: t("client.help.quickActions.contact.description"),
      icon: MessageSquare,
      action: t("client.help.quickActions.contact.action"),
      href: "/contact",
      color: "bg-shop_orange",
    },
    {
      title: t("client.help.quickActions.return.title"),
      description: t("client.help.quickActions.return.description"),
      icon: RotateCcw,
      action: t("client.help.quickActions.return.action"),
      href: "/orders",
      color: "bg-dark-blue",
    },
  ];

  const supportChannels = [
    {
      title: t("client.help.support.liveChat.title"),
      description: t("client.help.support.liveChat.description"),
      icon: MessageSquare,
      availability: t("client.help.support.liveChat.availability"),
      response: t("client.help.support.liveChat.response"),
      action: t("client.help.support.liveChat.action"),
      color:
        "border-shop_light_green text-shop_light_green hover:bg-shop_light_green",
    },
    {
      title: t("client.help.support.email.title"),
      description: t("client.help.support.email.description"),
      icon: Mail,
      availability: t("client.help.support.email.availability"),
      response: t("client.help.support.email.response"),
      action: t("client.help.support.email.action"),
      color: "border-shop_orange text-shop_orange hover:bg-shop_orange",
      href: "/contact",
    },
    {
      title: t("client.help.support.phone.title"),
      description: t("client.help.support.phone.description"),
      icon: Phone,
      availability: t("client.help.support.phone.availability"),
      response: t("client.help.support.phone.response"),
      action: t("client.help.support.phone.action"),
      color: "border-dark-blue text-dark-blue hover:bg-dark-blue",
      phone: "+1 (555) 123-4567",
    },
  ];

  return (
    <div className="bg-gradient-to-b from-shop_light_bg to-white min-h-screen">
      {/* Hero Banner Section */}
      {showHeroSection ? (
        <section className="py-20 bg-gradient-to-r from-shop_dark_green to-shop_light_green text-white">
          <Container className="max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <Badge className="mb-6 bg-white/20 text-white border-white/30 hover:bg-white/30">
                {t("client.help.hero.badge")}
              </Badge>
              <h1 className="text-5xl lg:text-6xl font-bold mb-6">
                {t("client.help.hero.title")}
              </h1>
              <p className="text-xl lg:text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed">
                {t("client.help.hero.subtitle")}
              </p>
            </motion.div>
          </Container>
        </section>
      ) : null}

      {/* Main Content */}
      <Container className="py-12 lg:py-16">
        {/* Search Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-2xl mx-auto mb-16"
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-6 h-6" />
            <Input
              type="text"
              placeholder={t("client.help.search.placeholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-14 py-6 text-lg border-2 border-gray-200 focus:border-shop_light_green rounded-xl shadow-sm"
            />
            <Button
              className="absolute right-2 top-2 bg-shop_light_green hover:bg-shop_dark_green"
              size="lg"
            >
              {t("client.help.search.action")}
            </Button>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-shop_dark_green mb-8 text-center">
            {t("client.help.quickActions.title")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <motion.div
                  key={action.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 * index }}
                >
                  <Link href={action.href}>
                    <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer border-0 bg-white/70 backdrop-blur-sm">
                      <CardContent className="p-6 text-center">
                        <div
                          className={`inline-flex items-center justify-center w-16 h-16 ${action.color} rounded-full mb-4`}
                        >
                          <Icon className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-lg font-semibold text-shop_dark_green mb-2">
                          {action.title}
                        </h3>
                        <p className="text-gray-600 mb-4">
                          {action.description}
                        </p>
                        <Button
                          variant="outline"
                          className="border-shop_light_green text-shop_light_green hover:bg-shop_light_green hover:text-white"
                        >
                          {action.action}
                        </Button>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Help Categories */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-shop_dark_green mb-8 text-center">
            {t("client.help.categories.title")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {helpCategories.map((category, index) => {
              const Icon = category.icon;
              return (
                <motion.div
                  key={category.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.05 * index }}
                >
                  <Card className="h-full hover:shadow-lg transition-all duration-300 border-0 bg-white/70 backdrop-blur-sm">
                    <CardHeader>
                      <div
                        className={`inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r ${category.color} rounded-lg mb-3`}
                      >
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <CardTitle className="text-shop_dark_green">
                        {category.title}
                      </CardTitle>
                      <CardDescription>{category.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {category.links.map((link, linkIndex) => (
                        <Link
                          key={linkIndex}
                          href={link.href}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 transition-colors group"
                        >
                          <span className="text-sm text-gray-700 group-hover:text-shop_dark_green">
                            {link.title}
                          </span>
                          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-shop_light_green" />
                        </Link>
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Support Channels */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-shop_dark_green mb-8 text-center">
            {t("client.help.support.title")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {supportChannels.map((channel, index) => {
              const Icon = channel.icon;
              return (
                <motion.div
                  key={channel.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 * index }}
                >
                  <Card className="h-full text-center hover:shadow-lg transition-all duration-300 border-0 bg-white/70 backdrop-blur-sm">
                    <CardHeader>
                      <div className="inline-flex items-center justify-center w-14 h-14 bg-gray-100 rounded-full mb-4 mx-auto">
                        <Icon className="w-7 h-7 text-gray-600" />
                      </div>
                      <CardTitle className="text-shop_dark_green">
                        {channel.title}
                      </CardTitle>
                      <CardDescription className="mb-4">
                        {channel.description}
                      </CardDescription>
                      <div className="space-y-1">
                        <div className="text-sm text-gray-600">
                          <Clock className="w-4 h-4 inline mr-1" />
                          {channel.availability}
                        </div>
                        <div className="text-sm text-gray-600">
                          {t("client.help.support.responseLabel")}: {channel.response}
                        </div>
                      </div>
                    </CardHeader>
                    <CardFooter>
                      <Link
                        href={channel.href || "/contact"}
                        className="w-full"
                      >
                        <Button
                          variant="outline"
                          className={`w-full ${channel.color} hover:text-white transition-all duration-200`}
                        >
                          {channel.action}
                        </Button>
                      </Link>
                    </CardFooter>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Additional Resources */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <Card className="bg-gradient-to-r from-shop_light_green to-shop_dark_green text-white shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl mb-2">
                {t("client.help.resources.title")}
              </CardTitle>
              <CardDescription className="text-white/80">
                {t("client.help.resources.subtitle")}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center pb-8">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                <Link href="/faq">
                  <Button
                    variant="secondary"
                    className="w-full bg-white text-shop_dark_green hover:bg-gray-100"
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    {t("client.help.resources.faq")}
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button
                    variant="outline"
                    className="w-full border-white text-white hover:bg-white/10"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    {t("client.help.resources.contact")}
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="w-full border-white text-white hover:bg-white/10"
                >
                  <Video className="w-4 h-4 mr-2" />
                    {t("client.help.resources.videos")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </Container>
    </div>
  );
};
export default HelpPageClient;
