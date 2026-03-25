"use client";

import { useRouter } from "next/navigation";
import { Shield, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Container from "@/components/Container";
import { useTranslation } from "react-i18next";

export default function AccessDeniedContent() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <Container className="py-10">
      <div className="max-w-md mx-auto">
        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-red-600" />
            </div>
            <CardTitle className="text-red-700">
              {t("admin.accessDenied.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              {t("admin.accessDenied.message")}
            </p>
            <Button
              onClick={() => router.push("/")}
              className="w-full"
              variant="outline"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("admin.accessDenied.backHome")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
