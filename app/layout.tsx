import "./theme.css";
import "@coinbase/onchainkit/styles.css";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Press_Start_2P } from 'next/font/google';

const pressStart2P = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-press-start-2p',
  display: 'swap',
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8FAFC" },
    { media: "(prefers-color-scheme: dark)", color: "#0F172A" },
  ],
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Minibet Slot Machine",
    description: "Try your luck with 0.001 ETH per spin!",
    other: {
      "fc:frame": JSON.stringify({
        button: {
          title: "Launch minibet",
          action: {
            type: "launch_frame",
            name: "minibet",
            url: "https://minibet.vercel.app/",
            splashBackgroundColor: "#0052FF"
          }
        }
      }),
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={pressStart2P.variable}>
      <head>
        <link 
          href="https://unpkg.com/nes.css@latest/css/nes.min.css" 
          rel="stylesheet" 
        />
      </head>
      <body className="bg-background">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
