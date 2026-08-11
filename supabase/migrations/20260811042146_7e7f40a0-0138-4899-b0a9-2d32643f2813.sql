UPDATE public.app_release_controls
SET latest_version = '5.1.1',
    hard_update_min_version = '5.1.1',
    is_hard_update = true,
    build_time = now(),
    message_th = 'มีการอัปเดตระบบ กรุณารีโหลดเพื่อล้างแคชและเข้าใช้งานเวอร์ชันใหม่',
    message_en = 'System updated. Please reload to clear cache and continue.',
    updated_at = now();