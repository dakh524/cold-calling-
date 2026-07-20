-- DAKH Edu Solutions CRM Schema

-- 1. Custom Types
CREATE TYPE user_role AS ENUM ('admin', 'employee');
CREATE TYPE client_status AS ENUM ('No Answer', 'Busy', 'Interested', 'Not Interested', 'Wrong Number', 'Already Has Website', 'Call Later', 'Meeting Scheduled', 'Quotation Sent', 'Payment Pending', 'Payment Received', 'Website Started', 'Completed', 'New');
CREATE TYPE payment_status AS ENUM ('pending', 'approved', 'paid', 'rejected');

-- 2. Tables

-- Employees Profile Table (extends auth.users)
CREATE TABLE public.employees (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    address TEXT,
    upi_id TEXT,
    identity_proof_url TEXT,
    profile_image_url TEXT,
    onboarding_completed BOOLEAN DEFAULT false,
    role user_role DEFAULT 'employee',
    status TEXT DEFAULT 'pending',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Clients Table
CREATE TABLE public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name TEXT NOT NULL,
    owner_name TEXT,
    phone TEXT,
    whatsapp TEXT,
    email TEXT,
    website TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    category TEXT,
    google_rating NUMERIC(3,2),
    google_reviews INTEGER,
    source TEXT,
    status client_status DEFAULT 'New',
    priority TEXT DEFAULT 'medium',
    type TEXT,
    country TEXT,
    postal_code TEXT,
    phone_raw TEXT,
    min_budget_inr NUMERIC,
    max_budget_inr NUMERIC,
    website_focus TEXT,
    tanglish_approach_script TEXT,
    closing_line_tanglish TEXT,
    google_maps_url TEXT,
    assigned_to UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    locked_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    locked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Call Logs Table
CREATE TABLE public.call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    duration INTEGER, -- in seconds
    remarks TEXT,
    next_followup TIMESTAMP WITH TIME ZONE,
    outcome client_status NOT NULL,
    proof_url TEXT
);

-- Commissions Table
CREATE TABLE public.commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    project_amount NUMERIC(10,2) NOT NULL,
    commission_percentage NUMERIC(5,2) DEFAULT 20.00,
    commission_amount NUMERIC(10,2) GENERATED ALWAYS AS (project_amount * (commission_percentage / 100)) STORED,
    payment_status payment_status DEFAULT 'pending',
    approved_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    approved_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. RLS Policies

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

-- Employees: Everyone can read basic info, admins can manage
CREATE POLICY "Employees are viewable by everyone" ON public.employees FOR SELECT USING (true);
CREATE POLICY "Employees can insert own profile" ON public.employees FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Employees can update own profile" ON public.employees FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can insert employees" ON public.employees FOR INSERT WITH CHECK (
    (SELECT role FROM public.employees WHERE id = auth.uid()) = 'admin'
);
CREATE POLICY "Admins can update employees" ON public.employees FOR UPDATE USING (
    (SELECT role FROM public.employees WHERE id = auth.uid()) = 'admin'
);
CREATE POLICY "Admins can delete employees" ON public.employees FOR DELETE USING (
    (SELECT role FROM public.employees WHERE id = auth.uid()) = 'admin'
);

-- Clients: Everyone can read and update. Only admins can delete.
CREATE POLICY "Clients are viewable by everyone" ON public.clients FOR SELECT USING (true);
CREATE POLICY "Everyone can insert clients" ON public.clients FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Everyone can update clients" ON public.clients FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete clients" ON public.clients FOR DELETE USING (
    (SELECT role FROM public.employees WHERE id = auth.uid()) = 'admin'
);

-- Call Logs: Everyone can view, insert.
CREATE POLICY "Call logs viewable by everyone" ON public.call_logs FOR SELECT USING (true);
CREATE POLICY "Everyone can insert call logs" ON public.call_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Employees can only update their own call logs" ON public.call_logs FOR UPDATE USING (auth.uid() = employee_id);
CREATE POLICY "Admins can update all call logs" ON public.call_logs FOR UPDATE USING (
    (SELECT role FROM public.employees WHERE id = auth.uid()) = 'admin'
);
CREATE POLICY "Admins can delete call logs" ON public.call_logs FOR DELETE USING (
    (SELECT role FROM public.employees WHERE id = auth.uid()) = 'admin'
);

-- Commissions: Everyone can view their own, admins can view/manage all.
CREATE POLICY "Employees can view own commissions, admins view all" ON public.commissions FOR SELECT USING (
    auth.uid() = employee_id OR (SELECT role FROM public.employees WHERE id = auth.uid()) = 'admin'
);
CREATE POLICY "Admins can insert commissions" ON public.commissions FOR INSERT WITH CHECK (
    (SELECT role FROM public.employees WHERE id = auth.uid()) = 'admin'
);
CREATE POLICY "Admins can update commissions" ON public.commissions FOR UPDATE USING (
    (SELECT role FROM public.employees WHERE id = auth.uid()) = 'admin'
);
CREATE POLICY "Admins can delete commissions" ON public.commissions FOR DELETE USING (
    (SELECT role FROM public.employees WHERE id = auth.uid()) = 'admin'
);

-- 4. Storage Buckets

-- You must enable Storage in your Supabase project manually or via API.
-- Assuming a bucket named 'employee_proofs' is created manually.
-- These are the policies for that bucket (must be run in SQL editor after bucket is created).
-- 
-- CREATE POLICY "Employees can upload own proofs" ON storage.objects FOR INSERT WITH CHECK (
--   bucket_id = 'employee_proofs' AND auth.uid() IS NOT NULL
-- );
-- CREATE POLICY "Everyone can view proofs" ON storage.objects FOR SELECT USING (
--   bucket_id = 'employee_proofs'
-- );

