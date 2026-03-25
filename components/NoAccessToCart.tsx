"use client";

import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import Logo from "./common/Logo";
import "@/app/i18n";
import { useTranslation } from "react-i18next";

const NoAccessToCart = ({ details }: { details?: string }) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center py-12 md:py-32 bg-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center">
            <Logo />
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            {t("client.cart.noAccess.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-center font-medium">
            {details
              ? details
              : t("client.cart.noAccess.description")}
          </p>
          <SignInButton mode="modal">
            <Button className="w-full font-semibold" size="lg">
              {t("client.cart.noAccess.signIn")}
            </Button>
          </SignInButton>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-sm text-muted-foreground text-center">
            {t("client.cart.noAccess.noAccount")}
          </div>
          <SignUpButton mode="modal">
            <Button variant="outline" className="w-full" size="lg">
              {t("client.cart.noAccess.createAccount")}
            </Button>
          </SignUpButton>
        </CardFooter>
      </Card>
    </div>
  );
};

export default NoAccessToCart;
