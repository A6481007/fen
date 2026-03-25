"use client";

import "@/app/i18n";
import { motion } from "motion/react";
import {
  FileText,
  ShoppingCart,
  Shield,
  CreditCard,
  Truck,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Mail,
  Scale,
} from "lucide-react";
import Container from "@/components/Container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Link from "next/link";
import { useTranslation } from "react-i18next";

type QuickLink = {
  title: string;
  href: string;
  icon: "orders" | "payment" | "shipping" | "privacy" | "legal";
};

type TermsSection = {
  id: string;
  title: string;
  icon: "acceptance" | "orders" | "payment" | "shipping" | "privacy" | "conduct" | "intellectual" | "legal";
  content: string[];
};

const iconMap = {
  orders: ShoppingCart,
  payment: CreditCard,
  shipping: Truck,
  privacy: Shield,
  legal: Scale,
  acceptance: CheckCircle2,
  conduct: AlertCircle,
  intellectual: FileText,
};

type TermsPageClientProps = {
  showHeroSection?: boolean;
};

const TermsPageClient = ({ showHeroSection = true }: TermsPageClientProps) => {
  const { t } = useTranslation();

  const quickLinks = t("client.terms.quickLinks", { returnObjects: true }) as QuickLink[];
  const termsData = t("client.terms.sections", { returnObjects: true }) as TermsSection[];

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
              <FileText className="w-16 h-16 mx-auto mb-6 opacity-90" />
              <h1 className="text-4xl lg:text-5xl font-bold mb-4">
                {t("client.terms.hero.title")}
              </h1>
              <p className="text-xl text-white/90 max-w-3xl mx-auto">
                {t("client.terms.hero.subtitle")}
              </p>
              <Badge className="mt-6 bg-white/20 text-white border-white/30">
                {t("client.terms.hero.updated")}
              </Badge>
            </motion.div>
          </Container>
        </section>
      ) : null}

      {/* Quick Navigation */}
      <section className="py-12 -mt-8">
        <Container className="max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="text-center text-shop_dark_green">
                  {t("client.terms.quick.title")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {quickLinks.map((link, index) => {
                    const Icon = iconMap[link.icon];
                    return (
                      <motion.a
                        key={index}
                        href={link.href}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * index }}
                        className="flex flex-col items-center p-4 rounded-lg hover:bg-shop_light_green/5 transition-colors group"
                      >
                        <Icon className="w-8 h-8 text-shop_light_green mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-sm font-medium text-center text-dark-text group-hover:text-shop_dark_green">
                          {link.title}
                        </span>
                      </motion.a>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </Container>
      </section>

      {/* Main Content */}
      <section className="py-12">
        <Container className="max-w-4xl">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="space-y-8"
          >
            <Accordion type="single" collapsible className="space-y-4">
              {termsData.map((section, index) => {
                const Icon = iconMap[section.icon];
                return (
                  <motion.div
                    key={section.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                  >
                    <AccordionItem value={section.id} id={section.id}>
                      <Card className="overflow-hidden">
                        <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-shop_light_bg/50 transition-colors">
                          <div className="flex items-center gap-4 text-left">
                            <div className="p-2 bg-shop_light_green/10 rounded-lg">
                              <Icon className="w-5 h-5 text-shop_dark_green" />
                            </div>
                            <div>
                              <h3 className="text-xl font-semibold text-shop_dark_green">
                                {index + 1}. {section.title}
                              </h3>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-6">
                          <Separator className="mb-4" />
                          <div className="space-y-4">
                            {section.content.map((paragraph, pIndex) => (
                              <p
                                key={pIndex}
                                className="text-dark-text leading-relaxed"
                              >
                                {paragraph}
                              </p>
                            ))}
                          </div>
                        </AccordionContent>
                      </Card>
                    </AccordionItem>
                  </motion.div>
                );
              })}
            </Accordion>
          </motion.div>
        </Container>
      </section>

      {/* Contact Section */}
      <section className="py-16 bg-shop_light_bg">
        <Container className="max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Card className="text-center">
              <CardContent className="p-8">
                <Mail className="w-12 h-12 mx-auto mb-4 text-shop_light_green" />
                <h3 className="text-2xl font-bold text-shop_dark_green mb-4">
                  {t("client.terms.contact.title")}
                </h3>
                <p className="text-dark-text mb-6 max-w-2xl mx-auto">
                  {t("client.terms.contact.subtitle")}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    asChild
                    className="bg-shop_dark_green hover:bg-shop_btn_dark_green"
                  >
                    <Link href="/contact">{t("client.terms.contact.primary")}</Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="border-shop_light_green text-shop_light_green hover:bg-shop_light_green/5"
                  >
                    <Link href="/faq">{t("client.terms.contact.secondary")}</Link>
                  </Button>
                </div>
                <p className="text-sm text-light-text mt-6">
                  {t("client.terms.contact.emailLead")}{" "}
                  <a
                    href="mailto:legal@shopcart.com"
                    className="text-shop_light_green hover:underline"
                  >
                    legal@shopcart.com
                  </a>
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </Container>
      </section>

      {/* Footer Note */}
      <section className="py-8 border-t border-gray-200">
        <Container className="max-w-4xl">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-shop_light_green" />
              <p className="text-sm text-light-text">
                {t("client.terms.footer.updated")}
              </p>
            </div>
            <p className="text-xs text-light-text">
              {t("client.terms.footer.note")}
            </p>
          </div>
        </Container>
      </section>
    </div>
  );
};

export default TermsPageClient;
