'use client';

import { useEffect, useState } from 'react';

interface GeoInfo {
  flagEmoji: string;
  countryName: string;
  city: string;
  detectedLang: string;
}

export default function Home() {
  const [geo, setGeo] = useState<GeoInfo | null>(null);

  useEffect(() => {
    fetch('/api/geoip')
      .then(r => r.json())
      .then(setGeo)
      .catch(() => null);
  }, []);

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'sans-serif',
      background: '#f8f9fa',
      padding: '20px',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        padding: '48px 40px',
        maxWidth: '480px',
        width: '100%',
        boxShadow: '0 2px 20px rgba(0,0,0,0.08)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌐</div>
        <h1 style={{ fontSize: '28px', fontWeight: '600', marginBottom: '8px', color: '#111' }}>
          LinguaTalk
        </h1>
        <p style={{ color: '#666', fontSize: '15px', marginBottom: '24px', lineHeight: '1.6' }}>
          실시간 번역 통화 · 다국어 채팅<br />영상통화 자막 지원
        </p>

        {geo && (
          <div style={{
            background: '#EBF4FE',
            border: '0.5px solid #B8D9FC',
            borderRadius: '10px',
            padding: '12px 16px',
            marginBottom: '24px',
            fontSize: '13px',
            color: '#1565C0',
          }}>
            📍 {geo.flagEmoji} {geo.countryName} {geo.city && `· ${geo.city}`} 접속 감지<br />
            <strong>{geo.detectedLang.toUpperCase()}</strong> 언어로 자동 설정됩니다
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{
            padding: '14px',
            background: '#f5f5f5',
            borderRadius: '10px',
            fontSize: '13px',
            color: '#555',
          }}>
            ✅ 서버 배포 완료 — 모바일 앱 연동 준비 중
          </div>
          <div style={{
            padding: '14px',
            background: '#E8F5E9',
            borderRadius: '10px',
            fontSize: '13px',
            color: '#2E7D32',
          }}>
            🔒 E2E 암호화 · SRTP · TLS 1.3 적용
          </div>
        </div>

        <p style={{ marginTop: '32px', fontSize: '12px', color: '#aaa' }}>
          API 상태 확인: <a href="/api/geoip" style={{ color: '#1a73e8' }}>/api/geoip</a>
          {' · '}
          <a href="/api/translate" style={{ color: '#1a73e8' }}>/api/translate</a>
        </p>
      </div>
    </main>
  );
}
