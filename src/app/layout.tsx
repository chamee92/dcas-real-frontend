import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Sidebar } from "@/components/layout/sidebar";
import { cn } from "@/lib/utils";
import { UserProvider } from "@/context/user-context";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Tourism Dashboard",
  description: "Manage your tourism company effortlessly",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.png", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <link
        rel="icon"
        href="/icon.svg"
        type="image/svg+xml"
        sizes="any"
      />
      <body className={cn(inter.className, "bg-background text-foreground")} suppressHydrationWarning>
        <UserProvider>
          <div className="flex h-screen overflow-hidden">
            {children}
          </div>
        </UserProvider>
      </body>
    </html>
  );
}

