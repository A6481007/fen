"use client";

import { useTranslation } from "react-i18next";

type SignInRequiredProps = {
  messageKey?: string;
};

export default function SignInRequired({
  messageKey = "admin.signInRequired",
}: SignInRequiredProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-xl text-gray-600">{t(messageKey)}</p>
    </div>
  );
}
