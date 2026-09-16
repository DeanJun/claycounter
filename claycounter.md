# 클레이 사격(American Trap) 기록/명중률 분석 SaaS — 설계 문서

Claude Code 구현 시작 전 컨텍스트 문서. 코드 작성 전 이 문서 기준으로 구조를 고정한다.

## 1. 도메인 규칙

- 종목: American Trap 전용
- 1 Round = 25 Target = 5 Station × 5 Target
- 타겟 1개당 최대 2회 시도: 초격(first) → 놓치면 재격(second)
- 최종 결과(hit/miss)는 초격/재격 시도로부터 파생됨
- 기록은 사수 1~6명으로 구성된 **Squad**(조) 단위로 진행되며, 기록관(admin)이 로테이션 순서대로 전원을 순차 기록

## 2. 데이터 모델 (Prisma 스키마)

```prisma
enum ShotResult {
  hit
  miss
}

enum Role {
  admin
  member
}

model User {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  password  String   // 해시 저장
  createdAt DateTime @default(now())

  memberships   ClubMembership[]
  rounds        Round[]  @relation("ShooterRounds")
  enteredRounds Round[]  @relation("EnteredByRounds")
}

model Club {
  id        String   @id @default(cuid())
  name      String
  location  String?
  isPersonal Boolean @default(false) // 개인 사용자용 가상 club 여부
  createdAt DateTime @default(now())

  memberships ClubMembership[]
  squads      Squad[]
}

model ClubMembership {
  id     String @id @default(cuid())
  userId String
  clubId String
  role   Role

  user User @relation(fields: [userId], references: [id])
  club Club @relation(fields: [clubId], references: [id])

  @@unique([userId, clubId])
}

model Squad {
  id          String   @id @default(cuid())
  clubId      String?
  date        DateTime
  location    String?
  enteredById String   // 기록관(admin)
  status      SquadStatus @default(in_progress) // in_progress | completed
  createdAt   DateTime @default(now())

  club   Club? @relation(fields: [clubId], references: [id])
  slots  SquadSlot[]
}

enum SquadStatus {
  in_progress
  completed
}

model SquadSlot {
  id      String @id @default(cuid())
  squadId String
  order   Int    // 1~6, 사수 순번

  squad   Squad @relation(fields: [squadId], references: [id])
  round   Round @relation(fields: [roundId], references: [id])
  roundId String @unique

  @@unique([squadId, order])
}

model Round {
  id          String   @id @default(cuid())
  shooterId   String
  clubId      String?  // null = 개인 기록
  date        DateTime
  location    String?
  enteredById String   // 실제 입력한 admin (감사 추적)
  createdAt   DateTime @default(now())

  shooter   User  @relation("ShooterRounds", fields: [shooterId], references: [id])
  enteredBy User  @relation("EnteredByRounds", fields: [enteredById], references: [id])
  club      Club? @relation(fields: [clubId], references: [id])
  slot      SquadSlot?
  targets   Target[]
}

model Target {
  id           String     @id @default(cuid())
  roundId      String
  targetNumber Int        // 1~25
  station      Int        // ceil(targetNumber / 5), 1~5
  firstResult  ShotResult
  secondResult ShotResult? // firstResult가 miss일 때만 값 존재

  round Round @relation(fields: [roundId], references: [id])

  @@unique([roundId, targetNumber])
}
```

- 개인 사용자(club 없음)는 가입 시 `Club(isPersonal=true)`를 자동 생성해 그 club의 admin으로 등록 → 권한 체크 로직을 "club 단위 role 확인" 하나로 통일 (member/개인 분기 없음)
- `Round.score`, 집계 캐시 컬럼은 두지 않음 — Target 집계 쿼리로 계산 (초기 트래픽에서 비용 미미, 필요시 나중에 view/캐시 추가)
- 최종 결과 파생: `finalResult = firstResult == hit ? hit : secondResult`
- 점수: `score = targets 중 finalResult == hit 개수` (25점 만점)

## 3. 권한 모델

| 역할 | 범위 | 가능한 작업 |
|---|---|---|
| admin | club 단위 (ClubMembership.role) | 소속 회원 Squad/Round/Target 생성·수정·삭제, 회원 관리 |
| member | club 단위 | 본인 기록 열람, club 리더보드/타 회원 요약 열람 (읽기 전용) |

- 개인 사용자는 본인 개인 club의 admin이므로 위 표에서 별도 예외 없이 동일 규칙 적용
- 기록 CRUD는 admin만 가능, member는 절대 불가
- API 미들웨어에서 club 단위 role 체크 필수

## 4. 화면/플로우

### 4.1 기본 화면
1. 로그인
2. 대시보드 — 본인 최근 기록 요약, 추이 그래프
3. 기록 상세 — 25타겟 히트맵(station×target) + 스테이션별/초격/재격 명중률
4. 클럽 페이지 (club 소속 시) — 회원 리스트, 리더보드
5. 관리자 페이지 — 회원 관리, club 관리, 기록 수정/삭제

### 4.2 Squad 실시간 기록 화면 (admin 전용, 핵심 기능)

**진입**: Squad 생성 시 사수 1~6명 선택 → 순번(order) 지정 → 기록 시작

**진행 로직 (라운드로빈)**
- 상태: `currentTargetNumber(1~25)`, `currentSlotOrder`, `phase(초격|재격)`
- 순서: 타겟 N에 대해 사수1→2→...→마지막 사수, 완료되면 타겟 N+1로 이동해 사수1부터 반복

**화면 구성**
- 상단: 현재 활성 사수 이름 + 타겟 번호 + phase("초격"/"재격") 크게 표시
- 버튼 2개: 명중 / 미스
- 하단: 스코어보드 — 사수별 행, 타겟 1~25 열, hit(초록)/miss(빨강)만 표시(초격·재격 구분 없이), 최우측에 현재까지 hit 개수 실시간 표시

**버튼 동작**
1. **초격 상태에서 명중 탭** → `firstResult=hit`, `secondResult=null` 저장 → 다음 사수로 즉시 이동 (마지막 사수면 타겟번호 +1, 사수1로 순환), 스코어보드 즉시 갱신(초록)
2. **초격 상태에서 미스 탭** → `firstResult=miss` 저장, phase를 "재격"으로 전환 → 같은 사수·같은 타겟에 대해 버튼 재노출 (사수는 아직 이동 안 함)
3. **재격 상태에서 명중 탭** → `secondResult=hit` 저장 → 다음 사수로 이동, 보드는 초록으로 갱신
4. **재격 상태에서 미스 탭** → `secondResult=miss` 저장 → 다음 사수로 이동, 보드는 빨강으로 갱신

**저장 방식**
- 탭마다 클라이언트 로컬 상태 즉시 반영 + 로컬스토리지/IndexedDB 스냅샷(새로고침/이탈 복구용)
- 25타겟×전원 완료 시 서버에 일괄 커밋 (Squad + 전원분 Round + Target 생성)
- 진행 중 이탈 시 재진입하면 로컬 스냅샷 기준으로 이어서 진행 가능하도록 설계

**오탭 정정**
- 임의 시점에 이전 타겟을 선택해 결과 재입력 가능 (스코어보드 셀 탭 → 수정 모드)

## 5. 분석 기능

- 스테이션별 명중률(%)
- **초격명중률**(first-barrel %) — 진짜 실력 지표
- **재격성공률** — 초격 미스 후 회복 비율
- 전체 명중률(초격+재격 합산)
- 라운드 추이(평균 점수/명중률, 이동평균)
- 25타겟 히트맵 시각화
- club 평균/순위 대비 비교
- 개인 최고기록(PB)

## 6. 기술 스택

- Next.js (App Router) + TypeScript
- PostgreSQL + Prisma
- 인증: 자체 JWT (email/password, httpOnly 쿠키) — OAuth 불필요, NextAuth 추상화 대비 의존성 절감
- Recharts — 그래프/히트맵
- 빌드: `output: 'standalone'` (저사양 서버 최적화)

## 7. 인프라 (네이버클라우드 Ubuntu 20.04)

기존 서비스가 nginx 80/443 사용 중, 저사양 서버 → **네이티브 배포**

```
[인터넷] → 80/443 → [기존 nginx]
                        └─ (신규 server block) → 127.0.0.1:3001 [Next.js, pm2 관리]
                                                        └─ 127.0.0.1:5432 [PostgreSQL, localhost bind]
```

- 기존 nginx server block 유지, 신규 server block 추가 (서브도메인/도메인 — **미확정**)
- certbot으로 신규 도메인/서브도메인 인증서 별도 발급
- Node.js LTS + pm2 (`instances: 1`, cluster 모드 미사용)
- pm2 memory 상한 설정(`--max-old-space-size`), `pm2 startup` + `pm2 save`로 systemd 등록
- pm2-logrotate로 로그 로테이션
- PostgreSQL PGDG 공식 저장소로 14~15 버전 설치 (Ubuntu 20.04 기본 리포지토리는 구버전)
- `shared_buffers`, `work_mem` 저사양에 맞게 축소 튜닝
- ufw는 80/443만 외부 오픈, 앱/DB 포트는 localhost 전용

## 8. 미확정 사항

1. 서브도메인 vs 신규 도메인 (예: `clay.junhoseong.com`)
2. Squad 진행 중 사수 이탈/추가 등 예외 상황 처리 정책 (구현 단계에서 결정 가능)
3. "Next: 4-7-10-13" 같은 다음 순번 예고 UI 필요 여부 (우선순위 낮음, 보류)

## 9. 실행 순서 (Claude Code 작업 단위)

1. 서버 현황 점검 (RAM/디스크, 기존 nginx 설정, Node/PG 버전 유무)
2. Node.js + pm2 설치
3. PostgreSQL(PGDG) 설치, DB/유저 생성, localhost bind 확인
4. nginx 신규 server block + certbot
5. Next.js 프로젝트 스캐폴딩, Prisma 스키마 적용 (본 문서 2절)
6. JWT 인증 + club 단위 role 미들웨어 구현
7. Squad 실시간 기록 화면 (라운드로빈, 초격/재격 2단계, 로컬 스냅샷 + 일괄 커밋)
8. 집계/분석 API (초격명중률, 재격성공률, 스테이션별 명중률, 추이)
9. 대시보드/히트맵/리더보드 UI
10. pm2 ecosystem 설정 + systemd 등록 + 배포