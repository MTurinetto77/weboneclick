import type { Metadata } from "next";
import { sfProDisplay } from "./fonts/sf-pro-display";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "OneClick - Apple Premium Reseller",
    template: "%s | OneClick",
  },
  description:
    "OneClick - Apple Premium Reseller y Distribuidor Oficial JBL. Mac, iPhone, iPad, AirPods, Apple Watch y más.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={sfProDisplay.variable}>
      <body>{children}</body>
    </html>
  );
}
