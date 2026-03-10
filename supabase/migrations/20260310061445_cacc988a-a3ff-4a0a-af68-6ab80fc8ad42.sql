-- Grant anon SELECT on queue tables for public TV display
GRANT SELECT ON public.client_visit_flows TO anon;
GRANT SELECT ON public.client_visit_flow_steps TO anon;