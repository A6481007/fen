import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RadixProvider from "@/components/RadixProvider";
import "../globals.css";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <RadixProvider>
      <Header />
      {children}
      <Footer />
    </RadixProvider>
  );
}
