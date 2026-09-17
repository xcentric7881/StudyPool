import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StudyPool",
  description: "Research study participation and points tracking"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
