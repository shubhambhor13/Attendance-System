
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT,
  department TEXT,
  role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.attendance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES public.employees(employee_id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  working_hours NUMERIC(5,2),
  status TEXT NOT NULL DEFAULT 'present',
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id, date)
);

CREATE INDEX idx_attendance_date ON public.attendance_records(date DESC);
CREATE INDEX idx_attendance_emp ON public.attendance_records(employee_id);

CREATE TABLE public.leave_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES public.employees(employee_id) ON DELETE CASCADE,
  leave_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- Public access (no auth) — internal attendance kiosk
CREATE POLICY "public read employees" ON public.employees FOR SELECT USING (true);
CREATE POLICY "public insert employees" ON public.employees FOR INSERT WITH CHECK (true);
CREATE POLICY "public update employees" ON public.employees FOR UPDATE USING (true);
CREATE POLICY "public delete employees" ON public.employees FOR DELETE USING (true);

CREATE POLICY "public read attendance" ON public.attendance_records FOR SELECT USING (true);
CREATE POLICY "public insert attendance" ON public.attendance_records FOR INSERT WITH CHECK (true);
CREATE POLICY "public update attendance" ON public.attendance_records FOR UPDATE USING (true);

CREATE POLICY "public read leaves" ON public.leave_requests FOR SELECT USING (true);
CREATE POLICY "public insert leaves" ON public.leave_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "public update leaves" ON public.leave_requests FOR UPDATE USING (true);

-- No seed data

