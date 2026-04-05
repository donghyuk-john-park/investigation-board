-- Gnosis: Circuit Breaker — Initial Schema
-- 4 tables: assumptions, evidence_entries, confidence_snapshots, review_events

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Assumptions table
create table assumptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null,
  belief text not null check (char_length(belief) <= 500),
  causal_logic text not null check (char_length(causal_logic) <= 1000),
  invalidation_conditions text[] not null check (array_length(invalidation_conditions, 1) >= 1),
  confidence integer not null check (confidence >= 1 and confidence <= 10),
  status text not null default 'active' check (status in ('active', 'invalidated')),
  asset_tags text[],
  raw_input text not null,
  ai_summary text,
  ai_summary_updated_at timestamptz,
  created_at timestamptz not null default now()
);

-- Evidence entries table
create table evidence_entries (
  id uuid primary key default uuid_generate_v4(),
  assumption_id uuid references assumptions(id) on delete cascade not null,
  stance text not null check (stance in ('supports', 'contradicts', 'neutral')),
  summary text not null check (char_length(summary) <= 300),
  source_url text,
  source_label text,
  body text check (body is null or char_length(body) <= 2000),
  created_at timestamptz not null default now()
);

-- Confidence snapshots table
create table confidence_snapshots (
  id uuid primary key default uuid_generate_v4(),
  assumption_id uuid references assumptions(id) on delete cascade not null,
  confidence integer not null check (confidence >= 1 and confidence <= 10),
  trigger text not null check (trigger in ('creation', 'evidence_added', 'review_completed', 'manual')),
  created_at timestamptz not null default now()
);

-- Review events table
create table review_events (
  id uuid primary key default uuid_generate_v4(),
  assumption_id uuid references assumptions(id) on delete cascade not null,
  outcome text not null check (outcome in ('intact', 'invalidated', 'unclear')),
  met_condition_index integer,
  notes text,
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_evidence_assumption on evidence_entries(assumption_id);
create index idx_evidence_created on evidence_entries(assumption_id, created_at desc);
create index idx_snapshots_assumption on confidence_snapshots(assumption_id);
create index idx_reviews_assumption on review_events(assumption_id);
create index idx_assumptions_user on assumptions(user_id);
create index idx_assumptions_status on assumptions(user_id, status);

-- Row Level Security
alter table assumptions enable row level security;
alter table evidence_entries enable row level security;
alter table confidence_snapshots enable row level security;
alter table review_events enable row level security;

-- RLS Policies: users can only access their own data
create policy "Users can view own assumptions"
  on assumptions for select
  using (auth.uid() = user_id);

create policy "Users can insert own assumptions"
  on assumptions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own assumptions"
  on assumptions for update
  using (auth.uid() = user_id);

-- Evidence: access through assumption ownership
create policy "Users can view evidence for own assumptions"
  on evidence_entries for select
  using (exists (
    select 1 from assumptions where assumptions.id = evidence_entries.assumption_id and assumptions.user_id = auth.uid()
  ));

create policy "Users can insert evidence for own assumptions"
  on evidence_entries for insert
  with check (exists (
    select 1 from assumptions where assumptions.id = evidence_entries.assumption_id and assumptions.user_id = auth.uid()
  ));

-- Confidence snapshots: access through assumption ownership
create policy "Users can view snapshots for own assumptions"
  on confidence_snapshots for select
  using (exists (
    select 1 from assumptions where assumptions.id = confidence_snapshots.assumption_id and assumptions.user_id = auth.uid()
  ));

create policy "Users can insert snapshots for own assumptions"
  on confidence_snapshots for insert
  with check (exists (
    select 1 from assumptions where assumptions.id = confidence_snapshots.assumption_id and assumptions.user_id = auth.uid()
  ));

-- Review events: access through assumption ownership
create policy "Users can view reviews for own assumptions"
  on review_events for select
  using (exists (
    select 1 from assumptions where assumptions.id = review_events.assumption_id and assumptions.user_id = auth.uid()
  ));

create policy "Users can insert reviews for own assumptions"
  on review_events for insert
  with check (exists (
    select 1 from assumptions where assumptions.id = review_events.assumption_id and assumptions.user_id = auth.uid()
  ));
