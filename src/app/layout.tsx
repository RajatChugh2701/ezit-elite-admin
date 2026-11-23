import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EZIT ELITE · Operations Portal",
  description: "EZIT ELITE membership and concierge operations administration.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
