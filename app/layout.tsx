import { ReactNode } from "react";
import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { ClerkProvider } from "@clerk/nextjs";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import { UserDataProvider } from "@/contexts/UserDataContext";
import I18nProvider from "@/components/providers/I18nProvider";
import PreviewBanner from "@/components/PreviewBanner";
import "react-draft-wysiwyg/dist/react-draft-wysiwyg.css";
import "./globals.css";

const appUrl = (
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.SITE_URL ||
  "http://localhost:3000"
).replace(/\/$/, "");

const poppins = localFont({
  src: "./fonts/Poppins.woff2",
  variable: "--font-poppins",
  weight: "400",
  preload: false,
});
const raleway = localFont({
  src: "./fonts/Raleway.woff2",
  variable: "--font-raleway",
  weight: "100 900",
});

const opensans = localFont({
  src: "./fonts/Open Sans.woff2",
  variable: "--font-open-sans",
  weight: "100 800",
});

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    template: "%s | ShopCart - Premium Online Shopping",
    default: "ShopCart - Your Trusted Online Shopping Destination",
  },
  description:
    "Discover amazing products at ShopCart, your trusted online shopping destination for quality items and exceptional customer service. Shop electronics, fashion, home goods and more with fast delivery.",
  keywords: [
    "online shopping",
    "e-commerce",
    "buy online",
    "shop online",
    "electronics",
    "fashion",
    "home goods",
    "deals",
    "discounts",
    "ShopCart",
  ],
  authors: [{ name: "ShopCart" }],
  creator: "ShopCart",
  publisher: "ShopCart",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: appUrl,
    siteName: "ShopCart",
    title: "ShopCart - Your Trusted Online Shopping Destination",
    description:
      "Discover amazing products at ShopCart, your trusted online shopping destination for quality items and exceptional customer service.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "ShopCart Online Store",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ShopCart - Your Trusted Online Shopping Destination",
    description:
      "Discover amazing products at ShopCart, your trusted online shopping destination for quality items and exceptional customer service.",
    images: ["/og-image.jpg"],
    creator: "@shopcart",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-verification-code",
    // Add other verification codes as needed
  },
  alternates: {
    canonical: appUrl,
  },
};

const RootLayout = async ({ children }: { children: ReactNode }) => {
  const { isEnabled: isPreview } = await draftMode();
  return (
    <ClerkProvider>
      <html lang="th">
        <body
          className={`${poppins.variable} ${raleway.variable} ${opensans.variable} antialiased ${
            isPreview ? "pt-14" : ""
          }`}
        >
          <PreviewBanner isDraftMode={isPreview} />
          <I18nProvider>
            <UserDataProvider>{children}</UserDataProvider>
          </I18nProvider>
          <Toaster
            position="bottom-right"
            richColors
            closeButton
            toastOptions={{
              style: {
                background: "#ffffff",
                color: "#1f2937",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                fontSize: "14px",
              },
              className: "sonner-toast",
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  );
};

export default RootLayout;
