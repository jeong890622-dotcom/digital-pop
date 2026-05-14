-- product_master: 앱이 사용하는 카테고리 컬럼 (운영 DB에 없으면
-- "Could not find the 'category' column of 'product_master' in the schema cache" 발생)
alter table public.product_master
  add column if not exists category text null;

comment on column public.product_master.category is
  '진열·정렬용 카테고리 라벨 (없으면 빈 문자열로 취급)';
