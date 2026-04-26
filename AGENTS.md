<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
# AGENTS.md

이 프로젝트는 DESKER 스타일의 디지털 가격 POP 서비스다.

반드시 아래 문서를 먼저 읽고 작업한다.
- docs/prd.md
- docs/feature-spec.md
- docs/design-guide.md

작업 원칙
1. 한 번에 큰 범위를 수정하지 않는다.
2. 먼저 구현 계획을 설명한 뒤 수정한다.
3. 고객용 화면은 모바일 우선 반응형으로 구현한다.
4. 관리자 페이지는 데스크톱 우선으로 구현한다.
5. DESKER 디자인 가이드를 최우선으로 따른다.
6. 임의 컬러, 임의 spacing, 임의 컴포넌트 스타일을 만들지 않는다.
7. 과한 shadow, gradient, flashy animation을 사용하지 않는다.
8. 가격 표기는 항상 320,000원 형식으로 한다.
9. 사이즈 없는 상품은 Standard로 표기한다.
10. 다른 QR/탭으로 이동해도 견적서는 유지된다.
11. 고객 검색은 제품명/제품코드 기준이며 현재 매장 전체 상품을 대상으로 한다.
12. 문서에 없는 정책은 TODO로 남기고 임의 확정을 최소화한다.