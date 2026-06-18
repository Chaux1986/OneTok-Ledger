import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OneTok Ledger™ | Enterprise ERP Platform",
  description:
    "Papua New Guinea's first enterprise-grade cloud ERP platform. Complete accounting, payroll, inventory, and compliance management built for PNG businesses.",
  keywords: [
    "ERP",
    "accounting software",
    "payroll",
    "PNG",
    "Papua New Guinea",
    "financial management",
    "OneTok",
    "IRC",
    "Nasfund",
    "Nambawan Super",
  ],
  authors: [{ name: "OneTok Technologies Ltd" }],
  openGraph: {
    title: "OneTok Ledger™ | Enterprise ERP Platform",
    description:
      "Papua New Guinea's first enterprise-grade cloud ERP platform.",
    type: "website",
    locale: "en_PG",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
