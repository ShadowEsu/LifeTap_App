import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "LifeTap - Emergency Alert System",
  description: "One-button emergency alerts with GPS tracking and AI risk assessment",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gradient-subtle font-sans antialiased">
        <div className="min-h-screen">
          {children}
        </div>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
