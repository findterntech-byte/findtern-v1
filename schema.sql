  -- Postgres schema for Findtern auth & admin

-- Ensure UUID generation function is available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users (interns / employees)
CREATE TABLE IF NOT EXISTS users (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL UNIQUE,
  country_code text NOT NULL DEFAULT '+91',
  phone_number text NOT NULL,
  password text NOT NULL,
  agreed_to_terms boolean NOT NULL DEFAULT false,
  role text NOT NULL DEFAULT 'intern' -- 'intern' or 'employee'
);

CREATE UNIQUE INDEX IF NOT EXISTS users_country_phone_unique
  ON users (country_code, phone_number);

-- Backward-compatible user flags (used by auth + admin actions)
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Employers / Companies
CREATE TABLE IF NOT EXISTS employers (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company_name text NOT NULL,
  company_email text NOT NULL UNIQUE,
  country_code text NOT NULL DEFAULT '+91',
  phone_number text NOT NULL,
  password text NOT NULL,
  password_changed_at timestamp DEFAULT now(),
  agreed_to_terms boolean NOT NULL DEFAULT false,
  website_url text,
  company_size text,
  city text,
  state text,
  primary_contact_name text,
  primary_contact_role text,
  escalation_contact_name text,
  escalation_contact_email text,
  escalation_contact_phone text,
  escalation_contact_role text,
  bank_name text,
  account_number text,
  account_holder_name text,
  ifsc_code text,
  swift_code text,
  gst_number text,
  created_at timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS employers_country_phone_unique
  ON employers (country_code, phone_number);

-- Employer Cart Items (saved candidates per project)
CREATE TABLE IF NOT EXISTS employer_cart_items (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id varchar NOT NULL,
  project_id varchar NOT NULL,
  intern_id varchar NOT NULL,
  list_type text NOT NULL,
  created_at timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS employer_cart_items_unique
  ON employer_cart_items (employer_id, project_id, intern_id, list_type);

-- Cross-table global phone uniqueness (users + employers)
CREATE OR REPLACE FUNCTION enforce_global_phone_unique() RETURNS trigger AS $$
DECLARE
  code text;
  phone text;
BEGIN
  code := coalesce(NEW.country_code, '');
  phone := coalesce(NEW.phone_number, '');

  IF code = '' OR phone = '' THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'users' THEN
    IF EXISTS (
      SELECT 1 FROM employers e
      WHERE e.country_code = code AND e.phone_number = phone
      LIMIT 1
    ) THEN
      RAISE EXCEPTION 'Phone number already in use'
        USING ERRCODE = '23505';
    END IF;
  ELSIF TG_TABLE_NAME = 'employers' THEN
    IF EXISTS (
      SELECT 1 FROM users u
      WHERE u.country_code = code AND u.phone_number = phone
      LIMIT 1
    ) THEN
      RAISE EXCEPTION 'Phone number already in use'
        USING ERRCODE = '23505';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_global_phone_unique ON users;
CREATE TRIGGER trg_users_global_phone_unique
  BEFORE INSERT OR UPDATE OF country_code, phone_number ON users
  FOR EACH ROW
  EXECUTE FUNCTION enforce_global_phone_unique();

DROP TRIGGER IF EXISTS trg_employers_global_phone_unique ON employers;
CREATE TRIGGER trg_employers_global_phone_unique
  BEFORE INSERT OR UPDATE OF country_code, phone_number ON employers
  FOR EACH ROW
  EXECUTE FUNCTION enforce_global_phone_unique();

ALTER TABLE employers ADD COLUMN IF NOT EXISTS password_changed_at timestamp DEFAULT now();

-- Admins (for /admin/login)
CREATE TABLE IF NOT EXISTS admins (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password text NOT NULL,
  name text,
  role text DEFAULT 'admin',
  created_at timestamp DEFAULT now()
);

-- Google OAuth Tokens (Employer Calendar / Meet)
CREATE TABLE IF NOT EXISTS employer_google_tokens (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id varchar NOT NULL UNIQUE REFERENCES employers(id) ON DELETE CASCADE,
  access_token text,
  refresh_token text,
  scope text,
  token_type text,
  expiry_date timestamp,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
  id           varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id  varchar NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  project_name text NOT NULL,
  skills       jsonb DEFAULT '[]'::jsonb,
  scope_of_work text,
  full_time_offer boolean DEFAULT false,
  location_type  text,          -- 'onsite' | 'hybrid' | 'remote'
  preferred_locations jsonb DEFAULT '[]'::jsonb,
  pincode        text,
  city           text,
  state          text,
  timezone       text,
  status         text DEFAULT 'active',
  created_at     timestamp DEFAULT now()
);

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS preferred_locations jsonb DEFAULT '[]'::jsonb;

-- Intern Onboarding (linked to users)
CREATE TABLE IF NOT EXISTS intern_onboarding (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Step 1: About Me
  linkedin_url    text,
  pin_code        text,
  state           text,
  city            text,
  aadhaar_number  text,
  pan_number      text,
  bio             text,

  -- Step 3: Experience (optional, stored as JSON array)
  experience_json jsonb DEFAULT '[]'::jsonb,

  -- Step 4: Skills
  skills          jsonb DEFAULT '[]'::jsonb,  -- [{name: 'React', rating: 4}, ...]

  -- Step 6: Location Preferences (stored as JSON arrays)
  location_types jsonb DEFAULT '[]'::jsonb,
  preferred_locations jsonb DEFAULT '[]'::jsonb,

  has_laptop           boolean,

  preview_summary text,
  extra_data      jsonb DEFAULT '{}'::jsonb,

  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS intern_onboarding_aadhaar_unique
  ON intern_onboarding (upper(regexp_replace(coalesce(aadhaar_number, ''), '\\s+', '', 'g'))) WHERE coalesce(aadhaar_number, '') <> '';

CREATE UNIQUE INDEX IF NOT EXISTS intern_onboarding_pan_unique
  ON intern_onboarding (upper(regexp_replace(coalesce(pan_number, ''), '\\s+', '', 'g'))) WHERE coalesce(pan_number, '') <> '';

-- Intern Documents (metadata for uploaded files)
CREATE TABLE IF NOT EXISTS intern_document (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  profile_photo_name text,
  profile_photo_type text,
  profile_photo_size integer,

  intro_video_name text,
  intro_video_type text,
  intro_video_size integer,

  aadhaar_image_name text,
  aadhaar_image_type text,
  aadhaar_image_size integer,

  pan_image_name text,
  pan_image_type text,
  pan_image_size integer,

  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Intern Payments (Razorpay order/payment tracking)
CREATE TABLE IF NOT EXISTS intern_payments (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gateway text NOT NULL DEFAULT 'razorpay',
  order_id text NOT NULL,
  payment_id text,
  signature text,
  amount_minor integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'created',
  raw jsonb DEFAULT '{}'::jsonb,
  paid_at timestamp,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Intern Payouts (Findtern -> Intern)
CREATE TABLE IF NOT EXISTS intern_payouts (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_minor integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'pending',
  method text NOT NULL DEFAULT 'bank',
  reference_id text,
  notes text,
  raw jsonb DEFAULT '{}'::jsonb,
  paid_at timestamp,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intern_payouts_intern_id
  ON intern_payouts (intern_id);

CREATE INDEX IF NOT EXISTS idx_intern_payments_order_id
  ON intern_payments (order_id);

-- Employer Payments (Razorpay order/payment tracking)
CREATE TABLE IF NOT EXISTS employer_payments (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id varchar NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  gateway text NOT NULL DEFAULT 'razorpay',
  order_id text NOT NULL,
  payment_id text,
  signature text,
  amount_minor integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'created',
  raw jsonb DEFAULT '{}'::jsonb,
  paid_at timestamp,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employer_payments_order_id
  ON employer_payments (order_id);

ALTER TABLE employers
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS escalation_contact_country_code text,
  ADD COLUMN IF NOT EXISTS setup_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Hiring Proposals (employer -> intern offers)
CREATE TABLE IF NOT EXISTS proposals (
  id           varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id  varchar NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  intern_id    varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id   varchar NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  interview_id varchar, -- optional link to interviews.id
  flow_type    text    NOT NULL, -- 'direct' | 'interview_first'
  status       text    NOT NULL DEFAULT 'sent', -- draft | sent | accepted | rejected | interview_scheduled
  currency     text    NOT NULL DEFAULT 'INR',
  offer_details jsonb  DEFAULT '{}'::jsonb,
  ai_ratings    jsonb  DEFAULT '{}'::jsonb,
  skills        jsonb  DEFAULT '[]'::jsonb,
  created_at   timestamp DEFAULT now(),
  updated_at   timestamp DEFAULT now()
);

ALTER TABLE proposals ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'INR';

-- Interview bookings between employers and interns
CREATE TABLE IF NOT EXISTS interviews (
  id            varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id   varchar NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  intern_id     varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id    varchar REFERENCES projects(id) ON DELETE SET NULL,
  status        text NOT NULL DEFAULT 'pending', -- pending | scheduled | completed | cancelled
  slot1         timestamp,
  slot2         timestamp,
  slot3         timestamp,
  selected_slot integer, -- 1,2,3 when candidate picks a slot
  timezone      text,
  meeting_link  text,
  calendar_event_id text,
  notes         text,
  created_at    timestamp DEFAULT now(),
  updated_at    timestamp DEFAULT now()
);

ALTER TABLE interviews
  ADD COLUMN IF NOT EXISTS calendar_event_id text;


CREATE TABLE IF NOT EXISTS website_blog_posts (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  excerpt text,
  cover_image_url text,
  banner_image_url text,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  published_at timestamp,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

ALTER TABLE website_blog_posts
  ADD COLUMN IF NOT EXISTS banner_image_url text;

CREATE TABLE IF NOT EXISTS website_featured_skills (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  icon_class text,
  meta_text text,
  resource_count integer NOT NULL DEFAULT 0,
  href text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

ALTER TABLE website_featured_skills
  ADD COLUMN IF NOT EXISTS resource_count integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS website_happy_faces (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  quote text NOT NULL,
  title text NOT NULL,
  name text NOT NULL,
  company text NOT NULL,
  avatar_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS website_plans (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price_text text,
  subtitle text,
  features jsonb DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS website_partners (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text NOT NULL,
  href text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pricing_plans (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  display_name text NOT NULL,
  region text,
  currency text NOT NULL DEFAULT 'INR',
  price_hourly_minor integer NOT NULL DEFAULT 0,
  per_hire_charge_minor integer NOT NULL DEFAULT 0,
  internship_duration text,
  features jsonb DEFAULT '[]'::jsonb,
  gst_applicable boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS website_faqs (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  question text NOT NULL,
  answer text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS website_terms (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body_html text NOT NULL,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  country_code text,
  query_type text,
  subject text,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS timesheets (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id varchar NOT NULL,
  employer_id varchar NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  intern_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_start timestamp NOT NULL,
  period_end timestamp NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  entries jsonb DEFAULT '[]'::jsonb,
  submitted_at timestamp,
  approved_at timestamp,
  rejected_at timestamp,
  intern_note text,
  manager_note text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_timesheets_intern
  ON timesheets (intern_id, period_start DESC);

CREATE INDEX IF NOT EXISTS idx_timesheets_proposal_period
  ON timesheets (proposal_id, period_start, period_end);

-- Add new columns if they don't exist (safe on existing DBs)
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS country_code text;
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS query_type text;
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS intern_note text;

-- --------------------------------------------------
-- Notifications + Profile Views + Saved Searches
-- --------------------------------------------------

CREATE TABLE IF NOT EXISTS notifications (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_type text NOT NULL,
  recipient_id varchar NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  dedupe_key text,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamp,
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient
  ON notifications (recipient_type, recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_dedupe
  ON notifications (recipient_type, recipient_id, dedupe_key);

CREATE TABLE IF NOT EXISTS profile_views (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id varchar NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  intern_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profile_views_intern_created
  ON profile_views (intern_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profile_views_employer_created
  ON profile_views (employer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS employer_saved_searches (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id varchar NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  skills jsonb DEFAULT '[]'::jsonb,
  cities jsonb DEFAULT '[]'::jsonb,
  created_at timestamp DEFAULT now(),
  last_notified_at timestamp
);

CREATE INDEX IF NOT EXISTS idx_employer_saved_searches_employer
  ON employer_saved_searches (employer_id, created_at DESC);


  CREATE TABLE intern_terms (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body_html TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE employer_terms (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body_html TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);


ALTER TABLE employers ADD COLUMN IF NOT EXISTS password_changed_at timestamp DEFAULT now();




ALTER TABLE employers
ADD COLUMN country VARCHAR(100) DEFAULT 'India';


ALTER TABLE notifications
ADD COLUMN dedupe_key VARCHAR(255);



ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS preferred_locations jsonb DEFAULT '[]'::jsonb;
  
  
  
  ALTER TABLE projects ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE TABLE password_reset_tokens (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type TEXT NOT NULL,
  subject_id VARCHAR NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'INR';

UPDATE proposals
SET offer_details = jsonb_set(
  COALESCE(offer_details, '{}'::jsonb),
  '{currency}',
  to_jsonb(currency),
  true
)
WHERE COALESCE(NULLIF(offer_details->>'currency',''), '') = '';


UPDATE proposals
SET currency = COALESCE(NULLIF(UPPER(offer_details->>'currency'), ''), 'INR')
WHERE currency IS NULL OR currency = '';