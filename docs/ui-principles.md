# UI 원칙

본 문서는 dashboard-ui의 모든 화면이 따르는 시각·구성 규칙을 정의합니다. 새 화면을 만들거나 기존 화면을 수정할 때 항상 이 문서를 기준으로 합니다.

화면은 3단 레벨로 분해합니다.

- **Lv1 페이지**: 한 라우트 단위. 예: `/hospital`(경영 통계), `/blog`(네이버 블로그 통계).
- **Lv2 섹션**: 한 페이지 안의 지표 단위. 예: 경영 통계의 매출/진료건수/신규 환자 유입, 블로그의 조회수/순방문자수/노출 순위.
- **Lv3 그래프/표/카드**: 한 섹션 안의 시각화 단위. 예: 추이 라인차트, 전년 동월 대비 막대차트, 키워드 순위 표, KPI 숫자 카드.

---

## Lv1 — 페이지

### 구성 요소

- 페이지 타이틀 (`h1`)
- 1줄 설명 (`p`, 톤·다운 텍스트)

그 외에는 두지 않습니다.

### 시각 규칙

- **보더·박스 금지**. 헤더에 `border-b` 같은 가로선도 두지 않습니다.
- **표준 컨테이너**: `<main className="w-full max-w-none px-4 py-4 sm:px-5 sm:py-5 lg:px-6">`
- **헤더 마진**: `mb-3`

### 예시

```tsx
<main className="w-full max-w-none px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
  <header className="mb-3">
    <h1 className="text-2xl font-bold text-zinc-50">경영 통계</h1>
    <p className="mt-1 text-sm text-zinc-400">
      매출·진료건수·신규 환자 유입을 기간·단위별로 보고, 전년 동월·요일별 패턴을 함께 확인합니다.
    </p>
  </header>
  {/* Lv2 섹션들 */}
</main>
```

---

## Lv2 — 섹션

### 구성 요소

- 섹션 타이틀 (`h2`)
- 1줄 설명 (`p`)
- 그 아래 1개 이상의 Lv3 (그래프/표/카드)

### 시각 규칙

- **위·아래 보더만**. 좌·우 보더 금지.
- 한 페이지 안에 여러 섹션이 연속될 때, **선이 두 줄로 보이지 않도록** 부모에서 `divide-y divide-zinc-800` 으로 한 줄 라인만 그립니다. 마지막 섹션은 자체 `last:border-b-0` 으로 아래선 제거.
- **표준 패딩**: `p-4 sm:p-5`
- 부모(페이지) 컨테이너는 외곽 박스 보더·배경을 가지지 않습니다.

### 예시 (섹션 컴포넌트)

```tsx
<section className="border-b border-zinc-800 bg-zinc-950 p-4 sm:p-5 last:border-b-0">
  <header className="mb-4">
    <h2 className="text-base font-semibold text-zinc-100 sm:text-lg">매출</h2>
    <p className="mt-1 text-sm text-zinc-500">
      기간 내 일/월/연 단위 매출 추이와 전년 동월·요일별 분석을 함께 보여줍니다.
    </p>
  </header>
  {/* Lv3 그래프/표/카드 */}
</section>
```

### 예시 (페이지에서 섹션을 묶을 때)

```tsx
<div className="flex flex-col divide-y divide-zinc-800">
  <SectionA />
  <SectionB />
  <SectionC />
</div>
```

---

## Lv3 — 그래프 / 표 / KPI 카드

같은 규칙으로 묶입니다. "차트", "표", "KPI 숫자 카드" 모두 Lv3 입니다.

### 구성 요소

- 차트/표/카드 타이틀 (`h3`, 보조적·작게)
- 본체 (recharts 차트, table, 큰 숫자 등)
- 컨트롤 (있다면): 버튼·input·토글
- 선택적 주석 (있다면): 본체 바로 아래, 작은 보조 문구

### 시각 규칙

- **본체를 감싸는 카드의 보더·배경 금지**. 차트 자체의 grid line, 축 라벨, 표의 row 구분선 등은 유지.
- **컨트롤 표준 크기**: 버튼·input·토글 모두 높이 `h-8`, 텍스트 `text-xs`. 그래프 위 한 줄에 가로 배치(보통 왼쪽: 기간 picker + 프리셋, 오른쪽: 단위 토글).
- **주석은 italic**: 본체 바로 아래에 `text-xs text-zinc-600 italic` 한 줄.

### 잘못된 예 (보더·박스를 친 차트)

```tsx
<div className="h-[280px] w-full border border-zinc-800 bg-zinc-900/60 p-2">
  <ResponsiveContainer ...>
    <LineChart ... />
  </ResponsiveContainer>
</div>
```

### 올바른 예

```tsx
<div className="h-[280px] w-full min-w-0">
  <ResponsiveContainer ...>
    <LineChart ... />
  </ResponsiveContainer>
</div>
<p className="mt-1 text-xs text-zinc-600 italic">
  기간은 서울 기준 날짜이며, 차트에 값이 없는 구간은 선이 끊깁니다.
</p>
```

### 컨트롤 예시

```tsx
<div className="flex flex-wrap items-end gap-3">
  <label className="flex flex-col gap-0.5 text-xs text-zinc-500">
    시작
    <input
      type="date"
      className="h-8 border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
    />
  </label>
  <button
    type="button"
    className="h-8 border border-zinc-700 bg-zinc-900 px-2.5 text-xs text-zinc-300 hover:bg-zinc-800"
  >
    전체
  </button>
  <div className="ml-auto flex rounded border border-zinc-700 p-0.5">
    <button className="px-2.5 py-1 text-xs text-zinc-400">일간</button>
    <button className="px-2.5 py-1 text-xs bg-zinc-100 text-zinc-900">월간</button>
  </div>
</div>
```

### 표(Lv3) 예시

```tsx
<div className="overflow-x-auto">
  <table className="w-full min-w-[740px] border-collapse text-left text-sm">
    <thead>
      <tr className="border-b border-zinc-800 text-zinc-400">
        <th className="px-3 py-2 font-medium">검색어</th>
        ...
      </tr>
    </thead>
    <tbody>
      <tr className="border-b border-zinc-800/70 text-zinc-200">...</tr>
    </tbody>
  </table>
</div>
```

---

## 상태 표기 표준

- **로딩**: `<p className="text-sm text-zinc-500">불러오는 중…</p>`
- **빈상태**: `<p className="border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-500">표시할 데이터가 없습니다.</p>` (단, Lv3 본체 영역의 fallback 일 때 한정. 일반 본문 라인은 보더 없이 작은 회색 텍스트.)
- **에러**: `<p className="mt-3 border border-red-900/50 bg-red-950/40 p-3 text-sm text-red-300">{message}</p>`

---

## 작업 전 체크리스트

새 화면을 추가하거나 기존 화면을 고치기 전, 다음을 확인합니다.

1. 페이지(Lv1)에 보더·박스가 없는가
2. 섹션(Lv2)은 위·아래 보더만 두고, 좌우 보더가 없는가 (페이지가 외곽 박스를 두르지 않는가)
3. 섹션은 타이틀과 1줄 설명을 모두 가지는가
4. 그래프·표·카드(Lv3) 본체에 카드 보더·배경이 없는가
5. 컨트롤이 모두 `h-8 text-xs` 인가
6. 로딩/빈상태/에러 문구가 위 표준에 맞는가
7. 본체 아래 주석이 있다면 `italic` 인가
