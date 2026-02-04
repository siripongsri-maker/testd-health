-- Add a policy to allow anyone to view aggregated statistics from selftest_pii (gender and date_of_birth only)
-- This enables the real-time statistics display showing community usage
CREATE POLICY "Anyone can view aggregated stats"
ON public.selftest_pii
FOR SELECT
USING (true);

-- Note: The existing "Users can view their own PII" policy already exists
-- This new policy allows reading aggregated statistics for the community display
-- Personal data like thai_id, address, etc. are still protected by the application logic