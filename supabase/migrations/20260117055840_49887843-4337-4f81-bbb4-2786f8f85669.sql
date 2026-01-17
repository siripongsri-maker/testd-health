-- Create analytics_events table to track page views and events
CREATE TABLE public.analytics_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL DEFAULT 'pageview',
  page_path TEXT NOT NULL,
  user_id UUID,
  session_id TEXT,
  referrer TEXT,
  user_agent TEXT,
  device_type TEXT,
  country TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_analytics_events_created_at ON public.analytics_events(created_at DESC);
CREATE INDEX idx_analytics_events_page_path ON public.analytics_events(page_path);
CREATE INDEX idx_analytics_events_event_type ON public.analytics_events(event_type);

-- Enable RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (for tracking)
CREATE POLICY "Anyone can insert analytics events"
  ON public.analytics_events FOR INSERT
  WITH CHECK (true);

-- Only admins can read analytics
CREATE POLICY "Admins can read analytics"
  ON public.analytics_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Create daily analytics summary table for faster queries
CREATE TABLE public.analytics_daily_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  total_visitors INTEGER NOT NULL DEFAULT 0,
  total_pageviews INTEGER NOT NULL DEFAULT 0,
  unique_sessions INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.analytics_daily_summary ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write summaries
CREATE POLICY "Admins can manage daily summaries"
  ON public.analytics_daily_summary FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow service role to insert/update (for edge function)
CREATE POLICY "Anyone can insert daily summaries"
  ON public.analytics_daily_summary FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update daily summaries"
  ON public.analytics_daily_summary FOR UPDATE
  USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_analytics_daily_summary_updated_at
  BEFORE UPDATE ON public.analytics_daily_summary
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();