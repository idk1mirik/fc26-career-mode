import type { Metadata } from "next";
import "./globals.css";
import StoreHydrator from "@/app/StoreHydrator";

export const metadata: Metadata = {
  title: "FC26 Career Mode",
  description: "Football Manager Career Mode",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <StoreHydrator />
        {children}
      </body>
    </html>
  );
}
