-- OTP Codes Table for Authentication
CREATE TABLE public.otp_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  otp TEXT NOT NULL,
  employee_id TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_otp_email ON public.otp_codes(email);
CREATE INDEX idx_otp_expires ON public.otp_codes(expires_at);

ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- Public access for OTP operations
CREATE POLICY "public read otp" ON public.otp_codes FOR SELECT USING (true);
CREATE POLICY "public insert otp" ON public.otp_codes FOR INSERT WITH CHECK (true);
CREATE POLICY "public update otp" ON public.otp_codes FOR UPDATE USING (true);
CREATE POLICY "public delete otp" ON public.otp_codes FOR DELETE USING (true);
