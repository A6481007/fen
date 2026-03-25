"use client";

import "@/app/i18n";
import { useState } from "react";
import { motion } from "motion/react";
import {
  Search,
  HelpCircle,
  ShoppingBag,
  CreditCard,
  Truck,
  RotateCcw,
  User,
  MessageCircle,
} from "lucide-react";
import Container from "@/components/Container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useTranslation } from "react-i18next";

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

type FAQPageClientProps = {
  showHeroSection?: boolean;
};

const FAQPageClient = ({ showHeroSection = true }: FAQPageClientProps) => {
  const { t } = useTranslation();
  const faqs = t("client.faq.items", { returnObjects: true }) as FAQ[];
  const categories = [
    {
      id: "all",
      label: t("client.faq.categories.all"),
      icon: HelpCircle,
      count: faqs.length,
    },
    {
      id: "shopping",
      label: t("client.faq.categories.shopping"),
      icon: ShoppingBag,
      count: faqs.filter((faq) => faq.category === "shopping").length,
    },
    {
      id: "payment",
      label: t("client.faq.categories.payment"),
      icon: CreditCard,
      count: faqs.filter((faq) => faq.category === "payment").length,
    },
    {
      id: "shipping",
      label: t("client.faq.categories.shipping"),
      icon: Truck,
      count: faqs.filter((faq) => faq.category === "shipping").length,
    },
    {
      id: "returns",
      label: t("client.faq.categories.returns"),
      icon: RotateCcw,
      count: faqs.filter((faq) => faq.category === "returns").length,
    },
    {
      id: "account",
      label: t("client.faq.categories.account"),
      icon: User,
      count: faqs.filter((faq) => faq.category === "account").length,
    },
  ];
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const filteredFAQs = faqs.filter((faq) => {
    const matchesSearch =
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      activeCategory === "all" || faq.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="bg-gradient-to-b from-shop_light_bg to-white min-h-screen">
      {/* Hero Section */}
      {showHeroSection ? (
        <section className="py-16 bg-gradient-to-r from-shop_dark_green to-shop_light_green text-white">
          <Container className="max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <HelpCircle className="w-16 h-16 mx-auto mb-6 opacity-90" />
              <h1 className="text-4xl lg:text-5xl font-bold mb-4">
                {t("client.faq.hero.title")}
              </h1>
              <p className="text-xl text-white/90 max-w-3xl mx-auto mb-6">
                {t("client.faq.hero.subtitle")}
              </p>
              <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                {t("client.faq.hero.badge")}
              </Badge>
            </motion.div>
          </Container>
        </section>
      ) : null}

      {/* Main Content */}
      <Container className="py-12 max-w-6xl">
        {/* Search Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-2xl mx-auto mb-12"
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder={t("client.faq.search.placeholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 py-4 text-lg border-2 border-gray-200 focus:border-shop_light_green rounded-xl shadow-sm"
            />
          </div>
          {searchTerm && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-gray-600 mt-2"
            >
              {filteredFAQs.length === 1
                ? t("client.faq.search.results.single", {
                    count: filteredFAQs.length,
                    term: searchTerm,
                  })
                : t("client.faq.search.results.plural", {
                    count: filteredFAQs.length,
                    term: searchTerm,
                  })}
            </motion.p>
          )}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Categories Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="lg:col-span-1"
          >
            <Card className="sticky top-8 shadow-lg border-0 bg-white/70 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-shop_dark_green flex items-center gap-2">
                  <HelpCircle className="w-5 h-5" />
                  {t("client.faq.sidebar.title")}
                </CardTitle>
                <CardDescription>{t("client.faq.sidebar.subtitle")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {categories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setActiveCategory(category.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200 ${
                        activeCategory === category.id
                          ? "bg-shop_light_green text-white shadow-md"
                          : "hover:bg-shop_light_green/10 text-gray-700 hover:text-shop_dark_green"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        <span className="font-medium">{category.label}</span>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          activeCategory === category.id
                            ? "bg-white/20"
                            : "bg-gray-200"
                        }`}
                      >
                        {category.count}
                      </span>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>

          {/* FAQ Content */}
          <div className="lg:col-span-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              {filteredFAQs.length > 0 ? (
                <Accordion type="single" collapsible className="space-y-4">
                  {filteredFAQs.map((faq, index) => (
                    <motion.div
                      key={faq.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.05 }}
                    >
                      <AccordionItem
                        value={faq.id}
                        className="bg-white/70 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 px-6 py-2 hover:shadow-md transition-shadow"
                      >
                        <AccordionTrigger className="text-left text-shop_dark_green font-semibold hover:text-shop_light_green transition-colors">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-gray-700 leading-relaxed pt-4">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    </motion.div>
                  ))}
                </Accordion>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12"
                >
                  <HelpCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">
                    {t("client.faq.empty.title")}
                  </h3>
                  <p className="text-gray-500 mb-6">
                    {t("client.faq.empty.subtitle")}
                  </p>
                  <Button
                    onClick={() => {
                      setSearchTerm("");
                      setActiveCategory("all");
                    }}
                    variant="outline"
                    className="border-shop_light_green text-shop_light_green hover:bg-shop_light_green hover:text-white"
                  >
                    {t("client.faq.empty.cta")}
                  </Button>
                </motion.div>
              )}
            </motion.div>
          </div>
        </div>

        {/* Contact Support Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-16"
        >
          <Card className="bg-gradient-to-r from-shop_light_green to-shop_dark_green text-white shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl mb-2 flex items-center justify-center gap-2">
                <MessageCircle className="w-6 h-6" />
                {t("client.faq.cta.title")}
              </CardTitle>
              <CardDescription className="text-white/80">
                {t("client.faq.cta.subtitle")}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center pb-8">
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link href="/contact">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="bg-white text-shop_dark_green hover:bg-gray-100"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    {t("client.faq.cta.contact")}
                  </Button>
                </Link>
                <Link href="/help">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white text-white hover:bg-white/10"
                  >
                    <HelpCircle className="w-4 h-4 mr-2" />
                    {t("client.faq.cta.help")}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </Container>
    </div>
  );
};

export default FAQPageClient;
