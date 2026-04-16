# Dashboard UI

이 저장소는 Supabase 데이터를 시각화/관리하는 Next.js 앱입니다.

## 역할 분리

- 이 repo: 로그인, 대시보드 조회, 키워드 타깃 UI (`/keywords`)
- collector repo (`C:\Projects\dashboard`): 수집 스크립트, Supabase 스키마/마이그레이션

## 실행

1. `.env.local.example`를 복사해 `.env.local` 생성
2. 값 입력
3. 실행

```bash
npm install
npm run dev
```

기본 포트는 `3001` 입니다.

## 필수 환경변수

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

## 주의

- 병원 마스터 데이터(`core.hospitals`) 수정은 다른 관리자 앱에서만 수행
- 이 앱은 분석/키워드 타깃 UI 중심으로 사용
