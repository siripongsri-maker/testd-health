
-- Add dismissed column to notification_reads table
ALTER TABLE public.notification_reads 
ADD COLUMN IF NOT EXISTS dismissed boolean DEFAULT false;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_notification_reads_dismissed 
ON public.notification_reads(user_id, dismissed) 
WHERE dismissed = true;
