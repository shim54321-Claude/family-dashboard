-- 16.11.2026 סבב 2 — ארבעה מתגים על הלוח (משבצות, צנצנת, פסים, מסך מלא) ושעון למשבצות.
-- רק מפתחות חדשים בטבלת settings. אם המתג הראשי הישן (points_show_kiosk) היה כבוי — הכול מתחיל כבוי.
with old as (select coalesce((select value from settings where key='points_show_kiosk'),'1') as v)
insert into settings(key,value)
select k, case when k in ('board_show_boxes','board_show_jar','board_show_bars','points_screen_enabled') and (select v from old)='0' then '0' else val end
from (values
  ('board_show_boxes','1'),
  ('board_show_jar','1'),
  ('board_show_bars','1'),
  ('points_screen_enabled','1'),
  ('board_boxes_windows','{"on":true,"list":[{"from":"06:30","to":"07:30","days":[0,1,2,3,4]},{"from":"19:00","to":"19:30","days":[0,1,2,3,4]}]}'),
  ('board_boxes_until',''),
  ('board_boxes_skip_until','')
) as t(k,val)
on conflict (key) do nothing;
