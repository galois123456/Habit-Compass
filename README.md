# 습관 나침반 ver1.03

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

- **오늘:** 숫자를 추가하고 체크형 습관을 완료합니다. 체크형은 누르는 즉시 저장되며 다시 누르면 완료를 취소합니다. 숫자와 메모는 화면에 고정된 저장 버튼으로 저장합니다. 합산형은 더하고 기록형은 교체하며, 메모를 여러 번 저장하면 줄을 바꿔 이어 붙입니다.
- **요약:** 목표 달성, 최근 7일 기록, 이번 달 기록 일수와 달력, 연속 기록을 확인합니다. 달력 날짜를 누르면 그날의 습관 기록과 메모가 표시됩니다.
- **차트:** 최근 7·30·90일과 올해는 하루당 한 막대, 최근 10년은 연도당 한 막대입니다. 최근 10년은 올해를 포함한 10개 연도입니다. 모든 기간의 막대를 화면 너비에 맞춰 표시하며, 가로 스크롤과 차트 아래 날짜 눈금을 없앴습니다. 올해의 숫자형 기록에는 추이선도 표시합니다. 체크형의 연간 막대는 완료 일수, 합산형은 연간 하루 평균, 기록형은 기록이 있는 날의 평균입니다.
- **기록:** 지나간 날짜를 수정할 때는 값을 그대로 입력하고 저장합니다. 입력하지 않은 항목은 해당 날짜에서 삭제됩니다. 날짜 전체를 지우려면 기록 목록에서 삭제하고 확인합니다.
- **설정:** 습관 왼쪽 손잡이를 마우스나 손가락으로 위아래로 끌어 표시 순서를 바꿉니다. 키보드 화살표 위·아래로도 이동할 수 있습니다. 이동하면 자동 저장됩니다. '보관 항목 보기'에서는 보관한 항목만 보입니다. 항목 삭제는 그 항목의 과거 기록까지 영구 삭제하므로 확인 단계를 거칩니다.

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

현재 버전은 `ver1.03`입니다. 이전 버전을 이미 배포했다면 앱 파일을 GitHub에 올리고 Vercel의 새 배포가 완료된 뒤 새로고침하세요. **데이터베이스 구조는 바뀌지 않았으므로 SQL을 다시 실행할 필요가 없습니다.** 화면 하단에 `made by yoonsungho`가 표시됩니다.
