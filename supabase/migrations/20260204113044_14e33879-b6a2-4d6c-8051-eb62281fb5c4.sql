-- Enable RLS on analytics_events if not already enabled
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Allow public read access to analytics_events for displaying stats
-- This is safe as analytics data contains no PII
CREATE POLICY "Anyone can view analytics events for stats"
ON public.analytics_events
FOR SELECT
USING (true);