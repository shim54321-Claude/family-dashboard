-- ביטול סבב 2 (16.11.2026): מחיקת המפתחות החדשים. points_show_kiosk לא נמחק ולא שונה.
delete from settings where key in ('board_show_boxes','board_show_jar','board_show_bars','points_screen_enabled',
  'board_boxes_windows','board_boxes_until','board_boxes_skip_until');
