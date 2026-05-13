-- store_zone_merchandising: 존별 수동 노출 순서 (null = 카테고리 자동)
alter table public.store_zone_merchandising
  add column if not exists sort_order integer null;

comment on column public.store_zone_merchandising.sort_order is
  '동일 zone 내 수동 순서(0,1,2…). null 이면 상품 마스터 카테고리·코드 순으로 표시.';

-- -----------------------------------------------------------------------------
-- 실행 후 검증 (선택): SQL Editor에서 각각 실행
-- -----------------------------------------------------------------------------
-- select column_name, data_type, is_nullable
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name = 'store_zone_merchandising'
--   and column_name = 'sort_order';
--
-- select store_id, zone, count(*) as rows_cnt,
--        count(*) filter (where sort_order is null) as null_sort
-- from public.store_zone_merchandising
-- group by store_id, zone
-- order by store_id, zone
-- limit 30;
