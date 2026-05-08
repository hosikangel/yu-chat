/**
 * /api/translate — 번역 프록시 API Route (Vercel Serverless Function)
 *
 * 클라이언트에서 DeepL API 키를 노출하지 않도록
 * Vercel 서버리스 함수를 프록시로 사용합니다.
 *
 * 요청: POST /api/translate
 * Body: { text: string, sourceLang: string, targetLang: string }
 */

import { NextRequest, NextResponse } from 'next/server';

// API 키는 Vercel 환경 변수에서만 읽음 (클라이언트에 절대 노출 안 됨)
const DEEPL_API_KEY = process.env.DEEPL_API_KEY!;

// DeepL 언어 코드 매핑
const DEEPL_LANG: Record<string, string> = {
  ko: 'KO', en: 'EN-US', ja: 'JA', zh: 'ZH',
  de: 'DE', fr: 'FR', es: 'ES', pt: 'PT-BR', ru: 'RU',
};

export async function POST(req: NextRequest) {
  // Rate limiting 헤더 확인 (Vercel Edge에서 자동 처리)
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';

  try {
    const { text, sourceLang, targetLang } = await req.json();

    if (!text || !targetLang) {
      return NextResponse.json({ error: '필수 파라미터 누락' }, { status: 400 });
    }

    if (text.length > 5000) {
      return NextResponse.json({ error: '텍스트 길이 초과 (최대 5000자)' }, { status: 400 });
    }

    const res = await fetch('https://api-free.deepl.com/v2/translate', {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: [text],
        source_lang: DEEPL_LANG[sourceLang] ?? undefined,
        target_lang: DEEPL_LANG[targetLang] ?? targetLang.toUpperCase(),
      }),
    });

    if (!res.ok) {
      throw new Error(`DeepL API 오류: ${res.status}`);
    }

    const data = await res.json();
    const translated = data.translations?.[0]?.text ?? text;

    return NextResponse.json({ translated }, {
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    console.error('[/api/translate] 오류:', err);
    return NextResponse.json({ error: '번역 서비스 오류' }, { status: 500 });
  }
}

// GET 요청 차단
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
