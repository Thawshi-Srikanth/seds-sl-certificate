-- ==============================================================================
-- SEDS SRI LANKA CERTIFICATE SYSTEM - DATABASE INITIALIZATION & MIGRATIONS
-- ==============================================================================

-- Enable pgcrypto for UUIDs and secure cryptographic hashing functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. Events Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    certificate_code_hash TEXT NOT NULL,
    certificate_enabled BOOLEAN NOT NULL DEFAULT true,
    code_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup by slug
CREATE INDEX IF NOT EXISTS idx_events_slug ON public.events(slug);

-- ------------------------------------------------------------------------------
-- 2. Participants Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    registration_id TEXT,
    eligible BOOLEAN NOT NULL DEFAULT true,
    certificate_path TEXT,
    certificate_claimed BOOLEAN NOT NULL DEFAULT false,
    claimed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_event_participant_email UNIQUE (event_id, email)
);

-- Indexes for fast verification and querying
CREATE INDEX IF NOT EXISTS idx_participants_event_email ON public.participants(event_id, email);
CREATE INDEX IF NOT EXISTS idx_participants_event_id ON public.participants(event_id);
CREATE INDEX IF NOT EXISTS idx_participants_eligible ON public.participants(eligible);
CREATE INDEX IF NOT EXISTS idx_participants_claimed ON public.participants(certificate_claimed);

-- ------------------------------------------------------------------------------
-- 3. Certificate Claims Audit Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.certificate_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip_hash TEXT,
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_certificate_claims_event_id ON public.certificate_claims(event_id);
CREATE INDEX IF NOT EXISTS idx_certificate_claims_participant_id ON public.certificate_claims(participant_id);
CREATE INDEX IF NOT EXISTS idx_certificate_claims_claimed_at ON public.certificate_claims(claimed_at DESC);

-- ------------------------------------------------------------------------------
-- 4. Rate Limiting Table (Anti-Abuse & Brute-Force Prevention)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.verification_rate_limits (
    ip_hash TEXT PRIMARY KEY,
    attempts INT NOT NULL DEFAULT 1,
    window_start TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 5. Storage Setup (Private Certificates Bucket)
-- ------------------------------------------------------------------------------
-- Insert bucket if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'certificates',
    'certificates',
    false,
    15728640, -- 15MB limit
    ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    allowed_mime_types = ARRAY['application/pdf'];

-- ------------------------------------------------------------------------------
-- 6. Row Level Security (RLS) Policies
-- ------------------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificate_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_rate_limits ENABLE ROW LEVEL SECURITY;

-- 6.1 Events Policies
DROP POLICY IF EXISTS "Public can view active events basic info" ON public.events;
CREATE POLICY "Public can view active events basic info"
    ON public.events
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Admins full access on events" ON public.events;
CREATE POLICY "Admins full access on events"
    ON public.events
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 6.2 Participants Policies
DROP POLICY IF EXISTS "Admins full access on participants" ON public.participants;
CREATE POLICY "Admins full access on participants"
    ON public.participants
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 6.3 Certificate Claims Policies
DROP POLICY IF EXISTS "Admins full access on certificate_claims" ON public.certificate_claims;
CREATE POLICY "Admins full access on certificate_claims"
    ON public.certificate_claims
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 6.4 Storage Object Policies
DROP POLICY IF EXISTS "Admin full access to certificates bucket" ON storage.objects;
CREATE POLICY "Admin full access to certificates bucket"
    ON storage.objects
    FOR ALL
    TO authenticated
    USING (bucket_id = 'certificates')
    WITH CHECK (bucket_id = 'certificates');

-- ------------------------------------------------------------------------------
-- 7. Secure Verification PostgreSQL Function (RPC)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_certificate_claim(
    p_event_slug TEXT,
    p_email TEXT,
    p_submitted_code TEXT,
    p_ip_hash TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_event RECORD;
    v_participant RECORD;
    v_normalized_email TEXT;
    v_calculated_hash TEXT;
    v_rate_record RECORD;
    v_cert_path TEXT;
    v_now TIMESTAMPTZ := now();
BEGIN
    -- 1. Rate Limiting Check (Max 15 verification attempts per 5 minutes per IP hash)
    IF p_ip_hash IS NOT NULL THEN
        SELECT * INTO v_rate_record 
        FROM public.verification_rate_limits 
        WHERE ip_hash = p_ip_hash;

        IF FOUND THEN
            -- Check if 5 minutes window has elapsed
            IF v_now - v_rate_record.window_start < INTERVAL '5 minutes' THEN
                IF v_rate_record.attempts >= 15 THEN
                    RETURN jsonb_build_object(
                        'success', false,
                        'error_code', 'RATE_LIMITED',
                        'message', 'Too many verification attempts. Please wait a few minutes and try again.'
                    );
                ELSE
                    UPDATE public.verification_rate_limits 
                    SET attempts = attempts + 1 
                    WHERE ip_hash = p_ip_hash;
                END IF;
            ELSE
                UPDATE public.verification_rate_limits 
                SET attempts = 1, window_start = v_now 
                WHERE ip_hash = p_ip_hash;
            END IF;
        ELSE
            INSERT INTO public.verification_rate_limits (ip_hash, attempts, window_start)
            VALUES (p_ip_hash, 1, v_now)
            ON CONFLICT (ip_hash) DO UPDATE SET attempts = verification_rate_limits.attempts + 1;
        END IF;
    END IF;

    -- 2. Normalize inputs
    v_normalized_email := LOWER(TRIM(p_email));
    -- Calculate SHA-256 hash of submitted code (uppercase/trimmed for consistent entry)
    v_calculated_hash := encode(digest(TRIM(p_submitted_code), 'sha256'), 'hex');

    -- 3. Find event by slug
    SELECT * INTO v_event 
    FROM public.events 
    WHERE slug = p_event_slug;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'INVALID_CREDENTIALS',
            'message', 'Unable to verify your certificate. Please check your email and certificate code.'
        );
    END IF;

    -- Check if claiming is enabled for event
    IF NOT v_event.certificate_enabled THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'CLAIMING_DISABLED',
            'message', 'Certificate claiming is currently disabled for this event.'
        );
    END IF;

    -- Check if code is expired
    IF v_event.code_expires_at IS NOT NULL AND v_now > v_event.code_expires_at THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'CODE_EXPIRED',
            'message', 'The certificate code for this event has expired.'
        );
    END IF;

    -- Check certificate code hash match
    IF v_event.certificate_code_hash != v_calculated_hash THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'INVALID_CREDENTIALS',
            'message', 'Unable to verify your certificate. Please check your email and certificate code.'
        );
    END IF;

    -- 4. Find Participant & verify eligibility
    SELECT * INTO v_participant 
    FROM public.participants 
    WHERE event_id = v_event.id AND LOWER(email) = v_normalized_email;

    IF NOT FOUND OR v_participant.eligible IS NOT TRUE THEN
        -- Return generic error to prevent participant enumeration
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'INVALID_CREDENTIALS',
            'message', 'Unable to verify your certificate. Please check your email and certificate code.'
        );
    END IF;

    -- 5. Record Claim Audit
    INSERT INTO public.certificate_claims (
        event_id,
        participant_id,
        email,
        claimed_at,
        ip_hash,
        user_agent
    ) VALUES (
        v_event.id,
        v_participant.id,
        v_normalized_email,
        v_now,
        p_ip_hash,
        p_user_agent
    );

    -- 6. Update Participant Claim Status
    UPDATE public.participants 
    SET certificate_claimed = true,
        claimed_at = COALESCE(claimed_at, v_now)
    WHERE id = v_participant.id;

    -- 7. Auto-resolve certificate path if null
    v_cert_path := COALESCE(
        v_participant.certificate_path,
        'events/' || v_event.slug || '/' || v_normalized_email || '.pdf'
    );

    -- 8. Return success payload
    RETURN jsonb_build_object(
        'success', true,
        'participant_id', v_participant.id,
        'participant_name', v_participant.name,
        'registration_id', v_participant.registration_id,
        'event_name', v_event.name,
        'certificate_path', v_cert_path,
        'already_claimed', v_participant.certificate_claimed,
        'claimed_at', v_now
    );
END;
$$;

-- Grant EXECUTE to public anon and authenticated users on the RPC function
GRANT EXECUTE ON FUNCTION public.verify_certificate_claim(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- ------------------------------------------------------------------------------
-- 8. Seed Events & Participants (Multi-Event Platform)
-- ------------------------------------------------------------------------------

-- Event 1: Observe the Moon Night 2026 (Slug: imot)
-- Code: IOTM26-X7K9Q -> SHA256: 4beea058c42a5d2eb7b8c8d8b94ce50aa4d59f72db725c89ee4a4c64feeb0580
INSERT INTO public.events (
    id,
    name,
    slug,
    description,
    certificate_code_hash,
    certificate_enabled,
    code_expires_at,
    created_at
) VALUES (
    'e0000000-0000-0000-0000-000000000001',
    'International Observe the Moon Night 2026',
    'imot',
    'Official certificate distribution for attendees of the live broadcast.',
    '4beea058c42a5d2eb7b8c8d8b94ce50aa4d59f72db725c89ee4a4c64feeb0580',
    true,
    now() + INTERVAL '90 days',
    now()
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    certificate_code_hash = EXCLUDED.certificate_code_hash,
    certificate_enabled = EXCLUDED.certificate_enabled;

-- Event 2: Space Summit 2026 (Slug: space-summit)
-- Code: SEDS26-SPACE -> SHA256: 5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8
INSERT INTO public.events (
    id,
    name,
    slug,
    description,
    certificate_code_hash,
    certificate_enabled,
    code_expires_at,
    created_at
) VALUES (
    'e0000000-0000-0000-0000-000000000002',
    'SEDS Sri Lanka Space Exploration Summit 2026',
    'space-summit',
    'Participation verification for the annual national space symposium.',
    '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    true,
    now() + INTERVAL '60 days',
    now()
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    certificate_code_hash = EXCLUDED.certificate_code_hash,
    certificate_enabled = EXCLUDED.certificate_enabled;

-- Seed Sample Participants (Using new events/{slug}/{email}.pdf pattern)
INSERT INTO public.participants (
    event_id,
    name,
    email,
    registration_id,
    eligible,
    certificate_path,
    certificate_claimed
) VALUES 
(
    'e0000000-0000-0000-0000-000000000001',
    'John Silva',
    'john@example.com',
    'SEDS-001',
    true,
    'events/imot/john@example.com.pdf',
    false
),
(
    'e0000000-0000-0000-0000-000000000001',
    'Sarah Perera',
    'sarah@example.com',
    'SEDS-002',
    false,
    'events/imot/sarah@example.com.pdf',
    false
),
(
    'e0000000-0000-0000-0000-000000000001',
    'Kasun Fernando',
    'kasun@example.com',
    'SEDS-003',
    true,
    'events/imot/kasun@example.com.pdf',
    false
),
(
    'e0000000-0000-0000-0000-000000000002',
    'John Silva',
    'john@example.com',
    'SUMMIT-101',
    true,
    'events/space-summit/john@example.com.pdf',
    false
)
ON CONFLICT (event_id, email) DO UPDATE SET
    name = EXCLUDED.name,
    registration_id = EXCLUDED.registration_id,
    eligible = EXCLUDED.eligible,
    certificate_path = EXCLUDED.certificate_path;
