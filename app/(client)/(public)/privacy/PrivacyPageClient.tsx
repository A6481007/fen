"use client";

import "@/app/i18n";
import { motion } from "motion/react";
import {
  Shield,
  Eye,
  Lock,
  Cookie,
  Database,
  UserCheck,
  AlertTriangle,
  Download,
  Trash2,
  Settings,
  Mail,
  Clock,
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

type Highlight = {
  title: string;
  description: string;
  color: string;
};

type DataType = {
  category: string;
  items: string[];
  icon: "user" | "database" | "eye" | "settings";
};

type UserRight = {
  right: string;
  description: string;
  action: string;
  icon: "download" | "settings" | "trash" | "mail";
};

type PolicySection = {
  id: string;
  title: string;
  bodyIntro: string;
  bullets?: string[];
  bodyOutro?: string;
  icon: "database" | "shield" | "lock" | "cookie";
};

const iconMap = {
  user: UserCheck,
  database: Database,
  eye: Eye,
  settings: Settings,
  download: Download,
  trash: Trash2,
  mail: Mail,
  shield: Shield,
  lock: Lock,
  cookie: Cookie,
};

type PrivacyPageClientProps = {
  showHeroSection?: boolean;
};

const PrivacyPageClient = ({ showHeroSection = true }: PrivacyPageClientProps) => {
  const { t } = useTranslation();

  const privacyHighlights = t("client.privacy.highlights", {
    returnObjects: true,
  }) as Highlight[];

  const dataTypes = t("client.privacy.dataTypes", {
    returnObjects: true,
  }) as DataType[];

  const userRights = t("client.privacy.userRights", {
    returnObjects: true,
  }) as UserRight[];

  const policySections = t("client.privacy.policySections", {
    returnObjects: true,
  }) as PolicySection[];

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
              <Shield className="w-16 h-16 mx-auto mb-6 opacity-90" />
              <h1 className="text-4xl lg:text-5xl font-bold mb-4">
                {t("client.privacy.hero.title")}
              </h1>
              <p className="text-xl text-white/90 max-w-3xl mx-auto">
                {t("client.privacy.hero.subtitle")}
              </p>
              <Badge className="mt-6 bg-white/20 text-white border-white/30">
                {t("client.privacy.hero.updated")}
              </Badge>
            </motion.div>
          </Container>
        </section>
      ) : null}

      {/* Privacy Highlights */}
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
                  {t("client.privacy.highlightsTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {privacyHighlights.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="text-center group"
                    >
                      <div className="p-3 bg-shop_light_green/10 rounded-lg w-fit mx-auto mb-3 group-hover:bg-shop_light_green/20 transition-colors">
                        {index === 0 && (
                          <Shield className={`w-8 h-8 ${item.color} group-hover:scale-110 transition-transform`} />
                        )}
                        {index === 1 && (
                          <Eye className={`w-8 h-8 ${item.color} group-hover:scale-110 transition-transform`} />
                        )}
                        {index === 2 && (
                          <UserCheck className={`w-8 h-8 ${item.color} group-hover:scale-110 transition-transform`} />
                        )}
                        {index === 3 && (
                          <Lock className={`w-8 h-8 ${item.color} group-hover:scale-110 transition-transform`} />
                        )}
                      </div>
                      <h3 className="font-semibold text-shop_dark_green mb-2">
                        {item.title}
                      </h3>
                      <p className="text-sm text-dark-text">
                        {item.description}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </Container>
      </section>

      {/* Data Collection */}
      <section className="py-12">
        <Container className="max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <Badge className="mb-4 bg-shop_light_green/10 text-shop_dark_green hover:bg-shop_light_green/20">
              {t("client.privacy.data.badge")}
            </Badge>
            <h2 className="text-3xl font-bold text-shop_dark_green mb-4">
              {t("client.privacy.data.title")}
            </h2>
            <p className="text-lg text-dark-text max-w-3xl mx-auto">
              {t("client.privacy.data.subtitle")}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {dataTypes.map((category, index) => {
              const Icon = iconMap[category.icon];
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="h-full hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3 text-shop_dark_green">
                        <div className="p-2 bg-shop_light_green/10 rounded-lg">
                          <Icon className="w-5 h-5 text-shop_light_green" />
                        </div>
                        {category.category}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {category.items.map((item, itemIndex) => (
                          <li key={itemIndex} className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 bg-shop_light_green rounded-full mt-2 flex-shrink-0" />
                            <span className="text-dark-text text-sm">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </Container>
      </section>

      {/* Detailed Privacy Policy */}
      <section className="py-12 bg-shop_light_bg">
        <Container className="max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-shop_dark_green mb-4">
              {t("client.privacy.policy.title")}
            </h2>
            <p className="text-lg text-dark-text">
              {t("client.privacy.policy.subtitle")}
            </p>
          </motion.div>

          <Accordion type="single" collapsible className="space-y-4">
            {policySections.map((section) => {
              const Icon = iconMap[section.icon];
              return (
                <AccordionItem key={section.id} value={section.id}>
                  <Card>
                    <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-white/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5 text-shop_light_green" />
                        <span className="text-lg font-semibold text-shop_dark_green">
                          {section.title}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-6">
                      <Separator className="mb-4" />
                      <div className="space-y-4 text-dark-text">
                        <p>{section.bodyIntro}</p>
                        {section.bullets && section.bullets.length > 0 && (
                          <ul className="space-y-2 pl-4">
                            {section.bullets.map((bullet, index) => (
                              <li key={index}>- {bullet}</li>
                            ))}
                          </ul>
                        )}
                        {section.bodyOutro ? <p>{section.bodyOutro}</p> : null}
                      </div>
                    </AccordionContent>
                  </Card>
                </AccordionItem>
              );
            })}
          </Accordion>
        </Container>
      </section>

      {/* Your Rights */}
      <section className="py-16">
        <Container className="max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <Badge className="mb-4 bg-shop_orange/10 text-shop_orange hover:bg-shop_orange/20">
              {t("client.privacy.rights.badge")}
            </Badge>
            <h2 className="text-3xl font-bold text-shop_dark_green mb-4">
              {t("client.privacy.rights.title")}
            </h2>
            <p className="text-lg text-dark-text max-w-3xl mx-auto">
              {t("client.privacy.rights.subtitle")}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {userRights.map((right, index) => {
              const Icon = iconMap[right.icon];
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="h-full hover:shadow-lg transition-all group">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="p-2 bg-shop_light_green/10 rounded-lg group-hover:bg-shop_light_green/20 transition-colors">
                          <Icon className="w-5 h-5 text-shop_light_green" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-shop_dark_green mb-2">
                            {right.right}
                          </h3>
                          <p className="text-dark-text text-sm mb-4">
                            {right.description}
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-shop_light_green text-shop_light_green hover:bg-shop_light_green/5"
                          >
                            {right.action}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
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
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-shop_orange" />
                <h3 className="text-2xl font-bold text-shop_dark_green mb-4">
                  {t("client.privacy.contact.title")}
                </h3>
                <p className="text-dark-text mb-6 max-w-2xl mx-auto">
                  {t("client.privacy.contact.subtitle")}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    asChild
                    className="bg-shop_dark_green hover:bg-shop_btn_dark_green"
                  >
                    <Link href="/contact">{t("client.privacy.contact.primary")}</Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="border-shop_light_green text-shop_light_green hover:bg-shop_light_green/5"
                  >
                    <Link href="/faq">{t("client.privacy.contact.secondary")}</Link>
                  </Button>
                </div>
                <p className="text-sm text-light-text mt-6">
                  {t("client.privacy.contact.emailLead")}{" "}
                  <a
                    href="mailto:privacy@shopcart.com"
                    className="text-shop_light_green hover:underline"
                  >
                    privacy@shopcart.com
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
              <Clock className="w-4 h-4 text-shop_light_green" />
              <p className="text-sm text-light-text">
                {t("client.privacy.footer.updated")}
              </p>
            </div>
            <p className="text-xs text-light-text">
              {t("client.privacy.footer.note")}
            </p>
          </div>
        </Container>
      </section>
    </div>
  );
};

export default PrivacyPageClient;
