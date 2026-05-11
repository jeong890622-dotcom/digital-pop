import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "디지털 가격 POP",
  description: "DESKER 디지털 가격 POP",
  other: {
    "supported-color-schemes": "light",
  },
};

/**
 * 모바일 / 브라우저의 시스템 다크모드 자동 반전을 막아
 * 디자인 가이드(화이트 배경)에 맞게 항상 라이트 모드로 표시한다.
 * - viewport.colorScheme 이 <meta name="color-scheme" content="light"> 를 생성
 * - globals.css 의 :root { color-scheme: light only } 가 CSS 레벨에서 강제
 */
export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={{ colorScheme: "light" }}
    >
      <body className="min-h-full flex flex-col bg-white text-[#111111]">
        {children}
      </body>
    </html>
  );
}
