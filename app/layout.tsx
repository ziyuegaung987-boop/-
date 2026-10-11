import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "飞鸽传信 · 云间来信",
  description: "30 关飞行冒险：江南信鸽、山海纸鹤、星河萤灯。手机和电脑都能玩，逐关解锁、三星挑战与登录存档。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
