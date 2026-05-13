# 운영 반영: 진열 `sort_order` (카테고리 자동 + ZONE 내 수동 순서)

로컬에서 동작 확인이 끝난 뒤, **운영 Supabase → 운영 앱** 순으로 진행합니다.

---

## 1단계: 무료 플랜에서 할 수 있는 “백업 대신” 안전장치

Supabase **무료 플랜**에는 유료처럼 **시점 복구용 자동 백업**이 없거나 매우 제한적인 경우가 많습니다. 그래도 아래 중 하나 이상을 하면 **이번 작업(`sort_order` 컬럼 추가)** 에 대한 안전 여유가 생깁니다.

### A. 이번 DDL이 상대적으로 안전한 이유

- `add-merchandising-sort-order.sql`은 **`sort_order` 컬럼만 추가**하고, 기본값은 **NULL**입니다.
- **기존 행을 지우거나 덮어쓰지 않습니다.** 데이터 내용은 그대로이고, 스키마만 늘어납니다.
- 롤백이 필요하면 나중에 `alter table ... drop column sort_order`로 제거할 수 있습니다(앱을 먼저 내린 뒤 권장).

### B. 무료에서 할 수 있는 보관 방법 (권장 순)

1. **Table Editor → `store_zone_merchandising` → Export (CSV)**  
   전체 행을 CSV로 내려받아 로컬/사내 드라이브에 보관합니다. (나중에 수동 복구용 참고 자료)
2. **SQL Editor**에서 행 수만이라도 기록해 둡니다.  
   `select count(*) from public.store_zone_merchandising;`  
   실행 후 숫자를 메모해 두면, 작업 직후 같은 쿼리로 **건수 변화 없음**을 확인할 수 있습니다.
3. (선택) **스테이징용 Supabase 프로젝트**가 있으면, 그 DB에 **먼저 동일 SQL**을 실행해 보고, 문제 없을 때만 운영에 적용합니다.

### C. 유료 백업이 없을 때의 마음가짐

- 완전한 **DB 전체 스냅샷 복구**는 무료만으로는 어렵습니다.
- 대신 위 **CSV + 행 수 확인**으로 “진열 데이터 사본”과 “변경 전후 검증”을 보완하는 방식이 일반적입니다.

---

## 2단계: 운영 Supabase에서 SQL 실행

1. **운영 프로젝트**로 연결되어 있는지(프로젝트 이름·URL) 다시 확인합니다.
2. **SQL Editor**를 엽니다.
3. 저장소의 `scripts/add-merchandising-sort-order.sql` **전체**를 붙여넣고 **Run** 합니다.
4. 오류 없이 완료되면 `sort_order` 컬럼이 추가된 상태입니다. 기존 행 값은 `NULL`로 두면 됩니다.

---

## 3단계: 컬럼 추가 검증 (선택)

SQL Editor에서 `add-merchandising-sort-order.sql` 하단 주석에 있는 검증 쿼리를 실행합니다.

- `information_schema`로 `sort_order` 컬럼 존재 확인
- `store_id`, `zone`별 건수·`sort_order`가 NULL인 행 비율 확인

---

## 4단계: 운영 앱 코드 배포

1. 로컬에서 검증한 커밋( `sortOrder` / Supabase 매핑 / 매장운영 DnD / `mockProducts` 정렬 )이 **main(또는 운영 브랜치)** 에 포함되어 있는지 확인합니다.
2. 평소 사용하는 배포 절차(Vercel, GitHub Actions, 수동 빌드 등)로 **운영 환경에 배포**합니다.
3. 운영 `.env`의 Supabase URL/키가 **운영 프로젝트**를 가리키는지 확인합니다.

**주의:** 2단계(SQL)를 먼저 끝내지 않으면, 배포된 앱이 `sort_order`를 조회·저장할 때 오류가 날 수 있습니다.

---

## 5단계: 운영 스모크 테스트 (한 매장으로 충분)

1. **매장 운영** → 존·구역 및 상품 편성  
2. ZONE을 **하나만** 선택 → 행 순서가 카테고리·코드 순으로 보이는지 확인  
3. **⋮⋮** 드래그로 순서 변경 → 저장(자동 저장) 후 **새로고침**해도 순서가 유지되는지 확인  
4. **「이 ZONE 순서를 카테고리 자동으로」** 클릭 후 고객 화면에서 순서가 자동 규칙과 맞는지 확인  
5. **고객 화면** 동일 매장·동일 ZONE에서 상품 그리드 순서가 관리자와 일치하는지 확인  

---

## 6단계: 문제 발생 시

- **앱만 롤백:** DB에 `sort_order` 컬럼만 남아 있어도, 예전 앱이 해당 컬럼을 쓰지 않으면 대개 무해합니다.  
- **DB 롤백:** `sort_order` 컬럼 제거는 데이터 정책 확정 후 신중히 결정합니다.

---

## 관련 파일

| 파일 | 용도 |
|------|------|
| `scripts/add-merchandising-sort-order.sql` | 운영·스테이징 DB에 실행할 DDL |
| `app/_lib/supabaseStoreOperations.ts` | `sort_order` 읽기/쓰기 |
| `app/_lib/storeOperationStore.ts` | `sortOrder` 상태 |
| `app/admin/operations/page.tsx` | ZONE 필터·DnD·초기화 UI |
| `app/_data/mockProducts.ts` | `sortMerchandisingRowsForDisplay` (고객 카탈로그 순서) |
