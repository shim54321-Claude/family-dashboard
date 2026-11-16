-- ביטול סבב 16.11.2026: מחיקת המפתחות החדשים (הגרסה הקודמת של הלוח מתעלמת מהם בכל מקרה)
delete from settings where key in ('points_screen_windows','points_screen_until','points_screen_skip_until',
  'points_screen_effect','points_goal_effect','board_bold_subjects','board_bold_chugim');
