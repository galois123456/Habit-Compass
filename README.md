# 습관 나침반 ver1.00

기존 `Code.gs` + `index.html`을 Supabase 인증·데이터베이스와 Vercel 정적 웹앱으로 다시 만든 프로젝트입니다. Apps Script는 이 버전에서 사용하지 않습니다. 개인용으로 가입·로그인할 수 있으며, 로그아웃하지 않으면 같은 브라우저의 로그인 상태를 유지합니다.

## 1. Supabase 준비

1. [Supabase](https://supabase.com/dashboard)에서 프로젝트를 만듭니다.
2. **SQL Editor → New query**에서 [`supabase/schema.sql`](supabase/schema.sql)의 내용을 전부 실행합니다. 항목·날짜별 기록·메모를 만들고 사용자별 접근 정책을 적용합니다. SQL을 실행하지 않으면 로그인 후 데이터 로드가 실패합니다.
3. **Project Settings → API Keys**에서 프로젝트 URL과 **publishable key**를 확인합니다. 화면에 `anon` 키만 있다면 그 키도 사용 가능합니다. **service_role / secret 키는 절대 Vercel의 `VITE_` 변수에 넣지 마세요.**
4. **Authentication → Providers → Email**에서 이메일 가입을 활성화합니다. 이메일 확인을 켠 경우 받은 메일에서 인증해야 로그인할 수 있습니다. 본인 계정 생성 후 신규 가입을 막고 싶으면 해당 설정에서 가입을 비활성화합니다.

## 2. GitHub + Vercel 배포

1. 이 폴더의 파일을 GitHub 저장소 루트에 업로드합니다. `node_modules`, `.env`, `dist`는 올리지 않습니다.
2. [Vercel](https://vercel.com/new)에서 **Add New → Project → Import Git Repository**로 그 저장소를 선택합니다. 프레임워크는 **Vite**, Build Command는 `npm run build`, Output Directory는 `dist`입니다.
3. Vercel의 **Environment Variables**에 다음 두 값을 추가합니다. `VITE_` 변수는 브라우저 코드에 포함되므로 publishable key만 넣습니다.

   ```text
   VITE_SUPABASE_URL=https://프로젝트ID.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=Supabase의 publishable key
   ```

4. 배포가 끝나면 Vercel 주소를 복사합니다. Supabase의 **Authentication → URL Configuration**에서 **Site URL**을 그 주소로 설정하고 **Redirect URLs**에도 `https://배포주소/**`를 등록합니다. 이메일 확인과 비밀번호 재설정 링크가 이 주소로 돌아옵니다. 사용자 지정 도메인을 쓴다면 그 주소도 추가합니다.
5. Vercel의 변수를 수정했다면 **Redeploy**합니다. 회원가입 → 이메일 인증(사용 중인 경우) → 로그인을 순서대로 확인하세요.

### 로컬 실행

```bash
npm install
cp .env.example .env.local
# .env.local에 실제 프로젝트 URL과 publishable key 입력
npm run dev
```

로컬 이메일 인증 링크를 쓰려면 Supabase Redirect URLs에 `http://localhost:5173/**`도 등록하세요. 배포 전 `npm run build`로 확인할 수 있습니다.

## 3. 이전 Apps Script 기록 옮기기

1. 기존 Apps Script 앱의 **조회 → JSON 백업**에서 백업 파일을 내려받습니다.
2. 새 웹앱에 로그인하고 **설정 → JSON 가져오기**에서 그 파일을 선택합니다.
3. **기록**에서 이전 날짜와 메모를 확인하고, **차트**에서 값을 확인합니다. 같은 항목 이름·날짜의 기존 데이터는 가져온 값으로 덮어쓰고 다른 기록은 보존합니다. 큰 가져오기는 여러 묶음으로 업로드하므로 중단된 경우 파일을 다시 선택할 수 있습니다.

백업 파일 형식은 기존 `exportJSON()`의 `{settings: [{ItemName,Unit,DailyGoal,IsActive,DisplayOrder,ItemType,NumberMode}], records: [{Date,Memo,...항목명}]}`과 호환됩니다. 기존 앱이 빈 기록과 오래된 항목 이름을 포함하는 경우, 그 이름으로 보관 항목이 추가될 수 있습니다. **새 앱으로 기록이 실제 옮겨진 것을 확인하기 전에는 기존 Apps Script 자료를 지우지 마세요.**

## 사용 방법

- **오늘:** 숫자를 추가하고 체크형 습관을 완료합니다. 합산형은 더하고 기록형은 교체합니다. 메모를 여러 번 저장하면 줄을 바꿔 이어 붙입니다.
- **요약:** 목표 달성, 최근 7일 기록, 연속 기록을 확인합니다. 오늘을 아직 기록하지 않았다면 연속 일수는 어제까지 계산합니다.
- **차트:** 항목과 기간을 선택합니다. 체크형은 완료 일수를, 합산형은 평균을, 기록형은 측정된 날의 평균을 표시합니다. 긴 기간은 차트에서 주·월 단위로 묶지만 위 통계는 실제 일별 값을 씁니다.
- **기록:** 지나간 날짜를 수정할 때는 값을 그대로 입력하고 저장합니다. 입력하지 않은 항목은 해당 날짜에서 삭제됩니다.
- **설정:** 종류, 목표, 단위, 순서와 보관 여부를 관리합니다. 항목 이름을 바꿔도 과거 값은 유지됩니다. JSON과 CSV를 다운로드할 수 있습니다.

### 휴대폰 홈 화면 추가

- iPhone Safari: 사이트 열기 → 공유 → **홈 화면에 추가**.
- Android Chrome: 사이트 열기 → 메뉴 → **홈 화면에 추가** 또는 **앱 설치**.

Supabase 세션은 브라우저 로컬 저장소에 보관되고 자동 갱신됩니다. 같은 사이트 주소와 같은 브라우저 저장소를 쓰고, 직접 로그아웃하거나 사이트 데이터를 삭제하지 않으면 보통 다시 비밀번호를 입력할 필요가 없습니다. 휴대폰의 저장 공간 정리·브라우저 데이터 삭제·세션 철회 후에는 재로그인이 필요합니다. 네트워크 연결은 기록 조회와 저장에 필요합니다.

## 개인정보·보안

Supabase Auth가 비밀번호를 처리합니다. 웹앱 코드에 비밀번호를 직접 저장하지 않습니다. 공개 가능한 publishable 키와 로그인 토큰으로 데이터에 접근하며, `schema.sql`의 Row Level Security 정책이 각 사용자의 기록을 분리합니다. 개인용으로 운영한다면 본인 가입 후 이메일 신규 가입을 비활성화하는 편이 좋습니다. 비밀번호 재설정은 로그인 화면에서 가능합니다. 개인정보가 담긴 JSON 백업은 안전한 장소에 보관하세요.

## 파일 안내

| 파일 | 역할 |
| --- | --- |
| `src/main.js` | 화면, 입력·수정, 계정, 백업·가져오기 |
| `src/data.js` | Supabase 연결과 데이터 처리 |
| `src/logic.js` | 날짜, 달성률, 차트 통계 |
| `src/style.css` | 모바일·데스크톱, 라이트·다크 테마 |
| `supabase/schema.sql` | 데이터 표, 보안 정책, 원자적 기록 저장 함수 |
| `public/manifest.webmanifest` | 홈 화면 바로가기 설정 |

새 프로젝트의 첫 버전은 `ver1.00`입니다. 화면 하단에 `made by yoonsungho`가 표시됩니다.
