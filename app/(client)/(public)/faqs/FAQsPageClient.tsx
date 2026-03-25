"use client";

import "@/app/i18n";
import { motion } from "motion/react";
import { HelpCircle, MessageCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Container from "@/components/Container";
import Link from "next/link";
import { useTranslation } from "react-i18next";

type FAQsPageClientProps = {
  showHeroSection?: boolean;
};

const FAQsPageClient = ({ showHeroSection = true }: FAQsPageClientProps) => {
  const { t } = useTranslation();
  const faqs = [
    {
      question: t("client.faqs.items.0.question"),
      answer: t("client.faqs.items.0.answer"),
    },
    {
      question: t("client.faqs.items.1.question"),
      answer: t("client.faqs.items.1.answer"),
    },
    {
      question: t("client.faqs.items.2.question"),
      answer: t("client.faqs.items.2.answer"),
    },
    {
      question: t("client.faqs.items.3.question"),
      answer: t("client.faqs.items.3.answer"),
    },
    {
      question: t("client.faqs.items.4.question"),
      answer: t("client.faqs.items.4.answer"),
    },
  ];
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
                {t("client.faqs.hero.title")}
              </h1>
              <p className="text-xl text-white/90 max-w-3xl mx-auto mb-6">
                {t("client.faqs.hero.subtitle")}
              </p>
              <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                {t("client.faqs.hero.badge")}
              </Badge>
            </motion.div>
          </Container>
        </section>
      ) : null}

      {/* Main Content */}
      <Container className="py-12 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-center text-shop_dark_green">
                {t("client.faqs.section.title")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion
                type="single"
                collapsible
                className="w-full space-y-4"
                defaultValue="item-0"
              >
                {faqs.map((faq, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                  >
                    <AccordionItem
                      value={`item-${index}`}
                      className="bg-white/70 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 px-6 py-2 hover:shadow-md transition-shadow"
                    >
                      <AccordionTrigger className="text-left text-lg font-semibold text-shop_dark_green hover:text-shop_light_green transition-colors hover:no-underline">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-dark-text leading-relaxed pt-4">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  </motion.div>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-gradient-to-r from-shop_light_green to-shop_dark_green text-white shadow-xl">
              <CardContent className="p-8 text-center">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-90" />
                <h3 className="text-2xl font-bold mb-4">
                  {t("client.faqs.cta.title")}
                </h3>
                <p className="text-white/90 mb-6 max-w-2xl mx-auto">
                  {t("client.faqs.cta.subtitle")}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    asChild
                    size="lg"
                    className="bg-white text-shop_dark_green hover:bg-white/90"
                  >
                    <Link href="/faq">
                      <HelpCircle className="w-4 h-4 mr-2" />
                      {t("client.faqs.cta.primary")}
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="border-white text-white hover:bg-white/10"
                  >
                    <Link href="/contact">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      {t("client.faqs.cta.secondary")}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </Container>
    </div>
  );
};

export default FAQsPageClient;
