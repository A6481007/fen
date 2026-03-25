"use client";

import "@/app/i18n";
import { motion } from "motion/react";
import {
  Heart,
  Users,
  Award,
  ShoppingBag,
  Target,
  Globe,
  Zap,
  Shield,
  Star,
  ArrowRight,
} from "lucide-react";
import Container from "@/components/Container";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useTranslation } from "react-i18next";

type AboutPageClientProps = {
  showHeroSection?: boolean;
};

const AboutPageClient = ({ showHeroSection = true }: AboutPageClientProps) => {
  const { t } = useTranslation();
  const stats = [
    { number: "10K+", label: t("client.about.stats.customers"), icon: Users },
    { number: "500+", label: t("client.about.stats.products"), icon: ShoppingBag },
    { number: "50+", label: t("client.about.stats.brands"), icon: Award },
    { number: "99%", label: t("client.about.stats.satisfaction"), icon: Heart },
  ];

  const values = [
    {
      icon: Target,
      title: t("client.about.values.customerFirst.title"),
      description: t("client.about.values.customerFirst.description"),
      color: "text-shop_light_green",
    },
    {
      icon: Shield,
      title: t("client.about.values.quality.title"),
      description: t("client.about.values.quality.description"),
      color: "text-shop_dark_green",
    },
    {
      icon: Zap,
      title: t("client.about.values.innovation.title"),
      description: t("client.about.values.innovation.description"),
      color: "text-shop_orange",
    },
    {
      icon: Globe,
      title: t("client.about.values.sustainability.title"),
      description:
        t("client.about.values.sustainability.description"),
      color: "text-shop_light_green",
    },
  ];

  const team = [
    {
      name: "Sarah Johnson",
      role: t("client.about.team.sarah.role"),
      image: "/images/team/ceo.jpg",
      description: t("client.about.team.sarah.description"),
    },
    {
      name: "Michael Chen",
      role: t("client.about.team.michael.role"),
      image: "/images/team/cto.jpg",
      description: t("client.about.team.michael.description"),
    },
    {
      name: "Emily Rodriguez",
      role: t("client.about.team.emily.role"),
      image: "/images/team/design.jpg",
      description: t("client.about.team.emily.description"),
    },
  ];

  return (
    <div className="bg-gradient-to-b from-shop_light_bg to-white min-h-screen">
      {/* Hero Section */}
      {showHeroSection ? (
        <section className="py-20 bg-gradient-to-r from-shop_dark_green to-shop_light_green text-white">
          <Container className="max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <Badge className="mb-6 bg-white/20 text-white border-white/30 hover:bg-white/30">
                {t("client.about.hero.badge")}
              </Badge>
              <h1 className="text-5xl lg:text-6xl font-bold mb-6">
                {t("client.about.hero.title")}
              </h1>
              <p className="text-xl lg:text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed">
                {t("client.about.hero.subtitle")}
              </p>
            </motion.div>
          </Container>
        </section>
      ) : null}

      {/* Stats Section */}
      <section className="py-16 -mt-10">
        <Container className="max-w-6xl">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="text-center bg-white shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="pt-6">
                    <stat.icon className="w-8 h-8 mx-auto mb-3 text-shop_light_green" />
                    <h3 className="text-3xl font-bold text-shop_dark_green mb-1">
                      {stat.number}
                    </h3>
                    <p className="text-dark-text font-medium">{stat.label}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      {/* Story Section */}
      <section className="py-20">
        <Container className="max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <Badge className="mb-4 bg-shop_light_green/10 text-shop_dark_green hover:bg-shop_light_green/20">
                {t("client.about.story.badge")}
              </Badge>
              <h2 className="text-4xl font-bold text-shop_dark_green mb-6">
                {t("client.about.story.title")}
              </h2>
              <p className="text-lg text-dark-text mb-6 leading-relaxed">
                {t("client.about.story.paragraph1")}
              </p>
              <p className="text-lg text-dark-text mb-8 leading-relaxed">
                {t("client.about.story.paragraph2")}
              </p>
              <Button
                asChild
                className="bg-shop_dark_green hover:bg-shop_btn_dark_green"
              >
                <Link href="/contact">
                  {t("client.about.story.cta")}{" "}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="bg-gradient-to-br from-shop_light_green to-shop_dark_green rounded-2xl p-8 text-white">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white/20 rounded-lg p-4 text-center">
                    <Star className="w-6 h-6 mx-auto mb-2" />
                    <p className="font-semibold">
                      {t("client.about.story.highlight.premium")}
                    </p>
                  </div>
                  <div className="bg-white/20 rounded-lg p-4 text-center">
                    <Shield className="w-6 h-6 mx-auto mb-2" />
                    <p className="font-semibold">
                      {t("client.about.story.highlight.secure")}
                    </p>
                  </div>
                </div>
                <blockquote className="text-lg italic">
                  {t("client.about.story.quote")}
                </blockquote>
                <p className="mt-4 font-semibold">
                  {t("client.about.story.quoteAttribution")}
                </p>
              </div>
            </motion.div>
          </div>
        </Container>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-shop_light_bg">
        <Container className="max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge className="mb-4 bg-shop_orange/10 text-shop_orange hover:bg-shop_orange/20">
              {t("client.about.valuesSection.badge")}
            </Badge>
            <h2 className="text-4xl font-bold text-shop_dark_green mb-4">
              {t("client.about.valuesSection.title")}
            </h2>
            <p className="text-lg text-dark-text max-w-2xl mx-auto">
              {t("client.about.valuesSection.subtitle")}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-all group cursor-pointer">
                  <CardContent className="p-6 text-center">
                    <value.icon
                      className={`w-12 h-12 mx-auto mb-4 ${value.color} group-hover:scale-110 transition-transform`}
                    />
                    <h3 className="text-xl font-bold text-shop_dark_green mb-3">
                      {value.title}
                    </h3>
                    <p className="text-dark-text leading-relaxed">
                      {value.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      {/* Team Section */}
      <section className="py-20">
        <Container className="max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge className="mb-4 bg-shop_light_green/10 text-shop_dark_green hover:bg-shop_light_green/20">
              {t("client.about.teamSection.badge")}
            </Badge>
            <h2 className="text-4xl font-bold text-shop_dark_green mb-4">
              {t("client.about.teamSection.title")}
            </h2>
            <p className="text-lg text-dark-text max-w-2xl mx-auto">
              {t("client.about.teamSection.subtitle")}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {team.map((member, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="text-center hover:shadow-lg transition-all group">
                  <CardContent className="p-6">
                    <div className="w-24 h-24 bg-gradient-to-br from-shop_light_green to-shop_dark_green rounded-full mx-auto mb-4 flex items-center justify-center text-white text-2xl font-bold group-hover:scale-105 transition-transform">
                      {member.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <h3 className="text-xl font-bold text-shop_dark_green mb-1">
                      {member.name}
                    </h3>
                    <Badge className="mb-3 bg-shop_orange/10 text-shop_orange border-none">
                      {member.role}
                    </Badge>
                    <p className="text-dark-text text-sm leading-relaxed">
                      {member.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-shop_dark_green to-shop_light_green text-white">
        <Container className="max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-4xl font-bold mb-4">
              {t("client.about.cta.title")}
            </h2>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              {t("client.about.cta.subtitle")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="bg-white text-shop_dark_green hover:bg-white/90"
              >
                <Link href="/shop">
                  {t("client.about.cta.startShopping")}{" "}
                  <ShoppingBag className="w-5 h-5 ml-2" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                className="bg-white text-shop_dark_green hover:bg-white/90"
              >
                <Link href="/contact">
                  {t("client.about.cta.contactUs")}{" "}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </Container>
      </section>
    </div>
  );
};

export default AboutPageClient;
