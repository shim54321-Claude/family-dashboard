-- 16.11.2026 — מסך נקודות מלא, אפקטים והדגשות: רק מפתחות חדשים בטבלת settings (בלי שינוי מבנה)
-- החלונות הקבועים לפי מה ששים ביקש: בוקר 06:30–07:30, ערב 19:00–19:30, ימים א׳–ה׳ (שישי כבוי, שבת אף פעם)
insert into settings(key,value) values
 ('points_screen_windows','{"on":true,"list":[{"from":"06:30","to":"07:30","days":[0,1,2,3,4]},{"from":"19:00","to":"19:30","days":[0,1,2,3,4]}]}'),
 ('points_screen_until',''),
 ('points_screen_skip_until',''),
 ('points_screen_effect','stars'),
 ('points_goal_effect','2h'),
 ('board_bold_subjects','0'),
 ('board_bold_chugim','0')
on conflict (key) do nothing;
