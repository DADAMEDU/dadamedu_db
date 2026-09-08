# 지사 및 지사기관 통합 관리 시스템

여러 팀원이 웹브라우저에서 함께 사용하는 지사/지사기관 관리 시스템입니다. 별도 프로그램 설치 없이
접속만으로 사용하며, **월 고정비 0원**(Cloudflare Pages Free + Supabase Free)을 목표로 만들어졌습니다.

- Frontend: React + TypeScript + Vite + Tailwind CSS (Cloudflare Pages 배포)
- Backend: Supabase (PostgreSQL + Auth + RLS + Edge Functions)

이 문서는 개발 경험이 많지 않은 담당자도 그대로 따라 할 수 있도록 처음부터 끝까지 순서대로 정리했습니다.

---

## 목차

1. [필요한 무료 계정](#1-필요한-무료-계정)
2. [Supabase 프로젝트 만들기](#2-supabase-프로젝트-만들기)
3. [SQL Schema 적용하기](#3-sql-schema-적용하기)
4. [Edge Function 배포 (팀원 계정 생성용)](#4-edge-function-배포-팀원-계정-생성용)
5. [첫 ADMIN 계정 만들기](#5-첫-admin-계정-만들기)
6. [환경변수 설정](#6-환경변수-설정)
7. [로컬에서 실행하기](#7-로컬에서-실행하기)
8. [GitHub에 올리기](#8-github에-올리기)
9. [Cloudflare Pages 연결 및 배포](#9-cloudflare-pages-연결-및-배포)
10. [팀원 계정 추가하기](#10-팀원-계정-추가하기)
11. [Excel 최초 일괄등록 방법](#11-excel-최초-일괄등록-방법)
12. [데이터 백업 방법](#12-데이터-백업-방법)
13. [운영 중 참고사항](#13-운영-중-참고사항)

---

## 1. 필요한 무료 계정

| 서비스 | 용도 | 가입 링크 |
|---|---|---|
| Supabase | 데이터베이스/인증/서버 함수 | https://supabase.com |
| Cloudflare | 웹사이트 호스팅 | https://dash.cloudflare.com |
| GitHub | 소스코드 저장/Cloudflare 연동 | https://github.com |

모두 무료 플랜(Free tier)만 사용합니다. 신용카드 등록 없이 가입 가능합니다.

---

## 2. Supabase 프로젝트 만들기

1. https://supabase.com 에 로그인 후 **New Project** 클릭
2. 프로젝트 이름(예: `branch-manager`), 데이터베이스 비밀번호(꼭 기억/저장), 리전(가까운 지역, 예: Northeast Asia (Seoul)) 선택 후 생성
3. 생성이 끝나면 좌측 메뉴 **Project Settings > API**로 이동해 아래 두 값을 메모해 둡니다.
   - `Project URL` → 이후 `VITE_SUPABASE_URL`
   - `anon public` 키 → 이후 `VITE_SUPABASE_ANON_KEY`
   - `service_role` 키는 **절대 메모장이나 코드에 붙여넣지 마세요.** (4단계 Edge Function에서만, Supabase가 자동으로 안전하게 제공합니다.)

---

## 3. SQL Schema 적용하기

프로젝트의 `supabase/migrations/` 폴더에 순서대로 번호가 매겨진 SQL 파일이 있습니다.

1. Supabase 대시보드 좌측 메뉴 **SQL Editor** 클릭
2. **New query** 클릭
3. 아래 파일을 **번호 순서대로 하나씩** 열어 내용을 전체 복사 → SQL Editor에 붙여넣기 → **Run** 실행
   1. `supabase/migrations/0001_schema.sql` (테이블, 인덱스)
   2. `supabase/migrations/0002_functions_triggers.sql` (함수, 트리거, 대량등록 RPC)
   3. `supabase/migrations/0003_rls_policies.sql` (보안 정책)
   4. `supabase/migrations/0004_seed_sample_data.sql` (샘플 데이터 — **선택사항**, 실제 운영에는 건너뛰어도 됩니다)
   5. `supabase/migrations/0005_branch_business_type.sql` (지사 운영구분 필드 추가)

각 단계마다 하단에 "Success. No rows returned" 등의 메시지가 나오면 정상입니다. 에러가 나면 이전 단계가
제대로 실행됐는지 확인 후 다시 시도하세요.

> 이미 0001~0004까지 적용해 운영 중인 DB라면 **0005 파일만 추가로 실행**하면 됩니다. 기존 데이터는
> 전혀 건드리지 않고 `branch_business_type` 컬럼만 nullable로 추가되므로 초기화가 필요 없습니다.
> 앞으로도 스키마를 변경할 때는 기존 migration 파일을 고치지 말고 항상 새 번호 파일을 추가하세요.

> Supabase CLI(`supabase db push`)를 쓸 수 있다면 `supabase/migrations` 폴더를 그대로 연결해 한 번에
> 적용해도 됩니다. 위 방법은 CLI 없이도 누구나 따라 할 수 있도록 대시보드 기준으로 안내한 것입니다.

---

## 4. Edge Function 배포 (팀원 계정 생성용)

`admin-create-user` Edge Function은 관리자가 팀원 계정을 만들 때, `service_role` 키를 브라우저에 노출하지
않고 서버(Supabase)에서만 안전하게 계정을 생성하기 위한 함수입니다.

### Supabase CLI 설치 (최초 1회)

```bash
npm install -g supabase
```

### 로그인 및 프로젝트 연결

```bash
supabase login
supabase link --project-ref <your-project-ref>
```

`<your-project-ref>`는 Supabase 프로젝트 URL의 `https://<project-ref>.supabase.co` 부분입니다.

### 배포

```bash
supabase functions deploy admin-create-user
```

배포가 끝나면 Supabase 대시보드 **Edge Functions** 메뉴에서 `admin-create-user`가 보이면 성공입니다.
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` 환경변수는 Supabase가 자동으로
Edge Function 실행환경에 주입하므로 별도 설정이 필요 없습니다.

---

## 5. 첫 ADMIN 계정 만들기

1. Supabase 대시보드 **Authentication > Users** 메뉴 → **Add user** → **Create new user**
2. 이메일/비밀번호 입력 후 생성 (Auto Confirm User 체크)
3. 사용자가 생성되면 자동으로 `profiles` 테이블에 `role = 'USER'`로 프로필이 만들어집니다. 이 계정을
   관리자로 올리기 위해 **SQL Editor**에서 아래 쿼리를 실행하세요.

```sql
update profiles set role = 'ADMIN' where email = '본인이메일@example.com';
```

이제 이 계정으로 로그인하면 관리자 메뉴(사용자 관리, Excel 일괄등록, 변경 이력 등)를 사용할 수 있습니다.

---

## 6. 환경변수 설정

프로젝트 루트의 `.env.example` 파일을 복사해 `.env` 파일을 만듭니다.

```bash
cp .env.example .env
```

`.env` 파일을 열어 2단계에서 메모한 값을 채워 넣습니다.

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

`.env` 파일은 `.gitignore`에 포함되어 있어 GitHub에 올라가지 않습니다.

---

## 7. 로컬에서 실행하기

Node.js 18 이상이 필요합니다.

```bash
npm install
npm run dev
```

터미널에 나오는 주소(기본 http://localhost:5173)로 접속해 5단계에서 만든 ADMIN 계정으로 로그인해보세요.

빌드가 정상인지 확인하려면:

```bash
npm run build
```

---

## 8. GitHub에 올리기

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-account>/<repo-name>.git
git push -u origin main
```

`.env` 파일은 `.gitignore`에 의해 자동으로 제외되므로 비밀키가 올라갈 걱정은 없습니다.

---

## 9. Cloudflare Pages 연결 및 배포

1. https://dash.cloudflare.com 로그인 → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
2. 방금 올린 GitHub 저장소 선택
3. 빌드 설정:
   - **Framework preset**: Vite
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. **Environment variables** 섹션에서 아래 두 값을 추가 (Production/Preview 모두)
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. **Save and Deploy** 클릭

배포가 끝나면 `https://<project-name>.pages.dev` 주소가 발급됩니다. 이 주소를 팀원들과 공유하면
누구나 브라우저로 접속해 로그인 후 사용할 수 있습니다.

`public/_redirects` 파일이 이미 포함되어 있어 새로고침 시 404가 뜨지 않고 SPA 라우팅이 정상 동작합니다.

이후 GitHub `main` 브랜치에 새 커밋을 푸시할 때마다 Cloudflare Pages가 자동으로 다시 빌드/배포합니다.

---

## 10. 팀원 계정 추가하기

1. ADMIN 계정으로 로그인 → 좌측 메뉴 **관리자 > 사용자 관리**
2. **팀원 계정 생성** 버튼 클릭
3. 이름 / 이메일 / 초기 비밀번호 / 권한(ADMIN 또는 USER) 입력 후 생성

생성된 팀원은 해당 이메일/비밀번호로 로그인 페이지에서 바로 로그인할 수 있습니다. 비밀번호는 로그인 후
**설정** 메뉴에서 본인이 직접 변경할 수 있습니다.

---

## 11. Excel 최초 일괄등록 방법

1. ADMIN 계정으로 로그인 → 좌측 메뉴 **데이터 관리 > Excel 일괄등록**
2. 기존에 관리하던 Excel(.xlsx) 또는 CSV 파일을 선택
3. 화면 안내에 따라 순서대로 진행합니다.
   1. **파일 선택** — 자동으로 분석됩니다.
   2. **컬럼 매핑** — 헤더명을 기준으로 자동 매핑되며, 필요하면 직접 수정할 수 있습니다.
   3. **데이터 미리보기** — 인식된 데이터를 확인합니다.
   4. **오류·중복 검사** — 정상/확인필요/중복/오류 건수를 확인하고, 문제가 있는 행은 표에서
      바로 확인할 수 있습니다. (오류 행은 등록에서 자동 제외됩니다.)
   5. **관계 확인** — 어떤 지사기관이 어떤 지사에 연결되는지 확인합니다.
   6. **최종 등록** — 중복 데이터 처리 방식(건너뛰기/업데이트)을 선택하고 실행하면 100건 단위로
      순차 등록되며 진행률이 표시됩니다.
4. 등록이 끝나면 결과 요약(성공/중복제외/오류)이 표시되고, **변경 이력** 메뉴에서도 `IMPORT` 기록으로
   확인할 수 있습니다.

> 지사/지사기관을 구분하는 규칙과 소속관계를 판단하는 규칙은
> `src/features/import/branchAgencyRule.ts` 한 파일에 모여 있습니다. 실제 운영 중인 Excel의 구조가
> 여기서 가정한 것과 다르다면 이 파일만 수정하면 됩니다.

---

## 12. 데이터 백업 방법

1. ADMIN 계정으로 로그인 → 좌측 메뉴 **데이터 관리 > Excel 다운로드**
2. **전체 데이터 다운로드** 버튼을 누르면 현재 등록된 지사/지사기관 전체가 `.xlsx` 파일로
   즉시 다운로드됩니다. (파일명에 날짜가 자동으로 포함됩니다. 예: `지사관리백업_2026-09-02.xlsx`)
3. 지사만 / 지사기관만 따로 받고 싶다면 같은 화면의 개별 다운로드 버튼을 사용하세요.
4. 검색/필터 화면에서도 **검색결과 다운로드** 버튼으로 현재 조건에 맞는 데이터만 따로 받을 수 있습니다.

이 기능은 브라우저에서 직접 파일을 생성하므로 별도 서버 비용이 발생하지 않습니다. 정기적으로
(예: 매주 1회) 관리자가 직접 실행해 로컬 PC에 백업 파일을 보관하는 것을 권장합니다.

---

## 13. 운영 중 참고사항

- **권한 체계**: ADMIN은 전체 기능(삭제, 일괄등록, 다운로드, 사용자 관리, 변경이력 조회 포함),
  USER는 조회/검색/등록/수정까지 가능합니다. 권한은 화면에서 버튼을 숨기는 것뿐 아니라 데이터베이스
  RLS 정책과 서버 함수에서도 이중으로 검사합니다.
- **삭제 제한**: 소속된 지사기관이 있는 지사는 삭제할 수 없습니다. 먼저 지사기관을 다른 지사로
  옮기거나 삭제해야 합니다.
- **Supabase Free 플랜 한도**: 데이터베이스 500MB, 월간 활성 사용자(MAU) 50,000명, Edge Function
  호출 500,000회 등 넉넉한 무료 한도를 제공합니다. 소규모 팀(수 명~수십 명) 운영에는 충분합니다.
  다만 프로젝트를 7일 이상 사용하지 않으면 무료 프로젝트가 일시 정지(pause)될 수 있으니, 정지된
  경우 대시보드에서 **Restore project**로 재개하면 됩니다.
- **비용이 발생하지 않도록**: Supabase Pro 전용 기능, Cloudflare Pages 유료 플랜, 별도 유료 검색
  서비스(Algolia 등)를 사용하지 않았습니다. 검색은 PostgreSQL의 `pg_trgm` 확장(부분검색용 인덱스)만
  사용합니다.
