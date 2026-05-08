import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'LinguaTalk — 다국어 메신저',
  description: '실시간 번역 통화 · 다국어 채팅 · 영상통화 자막',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
