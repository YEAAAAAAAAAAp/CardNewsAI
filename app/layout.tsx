import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

export const metadata: Metadata = {
  title: "카드뉴스 자동화 공장",
  description: "주제 하나로 8장 인스타그램 카드뉴스 기획, 카피, 검토표를 생성합니다."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
