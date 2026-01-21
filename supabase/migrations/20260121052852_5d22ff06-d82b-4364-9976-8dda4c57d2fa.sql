-- Add session tracking columns to analytics_events
ALTER TABLE public.analytics_events 
ADD COLUMN IF NOT EXISTS session_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS session_ended_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS session_duration_seconds INTEGER;

-- Create index for session analysis
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON public.analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events(created_at DESC);