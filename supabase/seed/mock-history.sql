-- 90 days of fictional referral history (2026-07-14 to 2026-10-11) for the program dashboard.
-- Everything is made up. Choices come from md5 of the row number, so every run produces the same rows.
-- Re-running replaces only these rows (ids starting b2000000-); their assessments go with them.
-- Decision times improve over the period, and Inland Valley sends weaker packets: stories for the dashboard to show.
-- About 16% are withdrawn (IHH sees 10–20%, mostly patients leaving AMA), far more often when the answer took over
-- two hours, so withdrawals fall as decisions speed up. Most go before a decision; about a third after approval.
-- Approved patients are admitted the day the referral arrives; exits, extensions and Total LOS are filled as of 2026-10-17.
begin;

create function pg_temp.r(n int, k text) returns float8 language sql immutable as
$$ select ('x' || substr(md5(n || ':' || k), 1, 8))::bit(32)::bigint / 4294967295.0 $$;

-- Pick an element of a weighted list: weights are cumulative thresholds on r.
create function pg_temp.pick(x float8, opts text[], cum float8[]) returns text language sql immutable as
$$ select opts[coalesce((select min(i) from generate_subscripts(cum, 1) i where x < cum[i]), array_length(opts, 1))] $$;

delete from "ILLINTAKE_referrals" where id::text like 'b2000000-%';

with base as (
  select
    n,
    ('b2000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid as id,
    floor(pg_temp.r(n, 'day') * 90)::int as day,
    timestamptz '2026-07-14 15:00:00+00' + floor(pg_temp.r(n, 'day') * 90)::int * interval '1 day' + pg_temp.r(n, 'hour') * interval '9 hours' as created,
    pg_temp.pick(pg_temp.r(n, 'hosp'),
      array['Harbor View Medical Center', 'Santa Ana Community Hospital', 'Orange Coast Regional', 'Anaheim Memorial West', 'Inland Valley Medical Center'],
      array[0.30, 0.55, 0.75, 0.90, 1.0]) as hospital,
    pg_temp.r(n, 'outcome') as ro,
    pg_temp.r(n, 'mins') as rm,
    pg_temp.r(n, 'acuity') as ra
  from generate_series(1, 120) n
),
-- Median decision time drifts down over the 90 days: the exponent grows with the day.
waited as (
  select b.*, round(18 + power(b.rm, 3 + b.day / 30.0) * 300)::int as minutes
  from base b
),
decided as (
  select w.*,
    case
      when w.day >= 88 and w.ro < 0.5 then 'needs_review'
      when pg_temp.r(w.n, 'wd') < (case when w.minutes > 120 then 0.40 else 0.07 end) then 'withdrawn'
      when w.ro < (case when w.hospital = 'Inland Valley Medical Center' then 0.50 else 0.72 end) then 'approved'
      else 'denied'
    end as status,
    -- A withdrawn referral that was approved first (and then never arrived).
    pg_temp.r(w.n, 'wdappr') < 0.3 as approved_first,
    (array['Robin Hyrons', 'Hobey Letessier', 'Bordy Coultar'])[1 + floor(pg_temp.r(w.n, 'rev') * 3)::int] as reviewer
  from waited w
),
people as (
  select d.*,
    (array['Ana', 'Marcus', 'Linda', 'Jose', 'Tanya', 'Robert', 'Carmen', 'Derek', 'Patricia', 'Miguel', 'Sharon', 'Anthony', 'Rosa', 'Brian', 'Lupe', 'Dennis', 'Yolanda', 'Gary', 'Teresa', 'Victor'])[1 + d.n % 20] || ' ' ||
    (array['Alvarez', 'Bennett', 'Cruz', 'Dawson', 'Estrada', 'Fischer', 'Garcia', 'Hughes', 'Ibarra', 'Jensen', 'Kim', 'Lopez', 'Mendez', 'Nash', 'Ortiz', 'Price', 'Quinn', 'Reyes', 'Silva', 'Tran'])[1 + (d.n * 7) % 20] as name,
    date '1950-01-01' + floor(pg_temp.r(d.n, 'dob') * 14600)::int as dob,
    case when pg_temp.r(d.n, 'lang') < 0.3 then 'Spanish' else 'English' end as lang,
    pg_temp.pick(pg_temp.r(d.n, 'dx'),
      array['Cellulitis s/p I&D', 'CHF exacerbation', 'Pneumonia', 'Diabetic foot ulcer', 'Hip fracture s/p ORIF', 'COPD exacerbation', 'Osteomyelitis, on oral antibiotics', 'Post-op abdominal wound'],
      array[0.20, 0.33, 0.46, 0.60, 0.70, 0.80, 0.88, 1.0]) as dx,
    pg_temp.r(d.n, 'wound') < 0.35 as wound,
    pg_temp.r(d.n, 'insulin') < 0.2 as insulin,
    pg_temp.r(d.n, 'o2') < 0.05 as o2,
    pg_temp.r(d.n, 'device') < 0.3 as device,
    pg_temp.r(d.n, 'mh') < 0.35 as mh,
    pg_temp.r(d.n, 'forget') < 0.1 as forgetful,
    (array[14, 21, 28, 30])[1 + floor(pg_temp.r(d.n, 'los') * 4)::int] as los,
    pg_temp.pick(pg_temp.r(d.n, 'deny'),
      array['Active infection not cleared', 'Not ambulatory / can''t transfer', 'Missing documents or authorization', 'Cognitive impairment', 'Can''t self-administer meds / IV meds', 'Not medically stable', 'Behavioral or safety concern', 'No bed available', 'Patient declined', 'Registered sex offender'],
      array[0.22, 0.40, 0.56, 0.66, 0.74, 0.82, 0.89, 0.95, 0.98, 1.0]) as deny,
    case when d.status in ('approved', 'denied') or (d.status = 'withdrawn' and d.approved_first) then d.created + d.minutes * interval '1 minute' end as decided_at,
    d.status = 'approved' or (d.status = 'withdrawn' and d.approved_first) as was_approved
  from decided d
),
-- Withdrawn while waiting (part way through the wait) or, once approved, 1 to 20 hours after the decision.
withdrew as (
  select p.*,
    case when p.status = 'withdrawn' then
      case when p.approved_first then p.decided_at + (1 + pg_temp.r(p.n, 'wdhrs') * 19) * interval '1 hour'
      else p.created + p.minutes * (0.3 + pg_temp.r(p.n, 'wdhrs') * 0.6) * interval '1 minute' end
    end as withdrawn_at,
    case when p.approved_first then
      pg_temp.pick(pg_temp.r(p.n, 'wdwhy'),
        array['Placed with another provider', 'Patient left the hospital against medical advice (AMA)', 'Patient declined recuperative care', 'Still needs hospital care'],
        array[0.40, 0.70, 0.90, 1.0])
    else
      pg_temp.pick(pg_temp.r(p.n, 'wdwhy'),
        array['Patient left the hospital against medical advice (AMA)', 'Placed with another provider', 'Discharged elsewhere by the hospital', 'Still needs hospital care', 'Patient declined recuperative care'],
        array[0.55, 0.80, 0.90, 0.96, 1.0])
    end as withdrawal_reason
  from people p
),
-- Admitted the day the referral came in, from an hour after the decision until 8 PM, on the quarter hour.
admitted as (
  select p.*,
    (p.created at time zone 'America/Los_Angeles')::date as admission,
    ceil((extract(epoch from (p.decided_at at time zone 'America/Los_Angeles')::time) / 60 + 60) / 15)::int * 15 as earliest
  from withdrew p
),
-- Stay as of 2026-10-17: about 20% get a 7 or 14 day extension, approved a few days before the authorized end.
stayed as (
  select a.*,
    to_char(time '00:00' + least(1425, a.earliest + floor(pg_temp.r(a.n, 'admt') * ((greatest(a.earliest, 1200) - a.earliest) / 15 + 1))::int * 15) * interval '1 minute', 'HH24:MI') as admission_time,
    a.admission + a.los - 1 - floor(pg_temp.r(a.n, 'extday') * 4)::int as extension_date,
    case when pg_temp.r(a.n, 'ext') < 0.2 then 'Yes' when pg_temp.r(a.n, 'ext') < 0.8 then 'No' end as ext_pick
  from admitted a
),
extended as (
  select s.*,
    -- Not asked yet if the approval date would still be in the future.
    case when s.ext_pick = 'Yes' and s.extension_date > date '2026-10-17' then null else s.ext_pick end as extension,
    case when s.ext_pick = 'Yes' and s.extension_date <= date '2026-10-17' then (array[7, 14])[1 + floor(pg_temp.r(s.n, 'extlen') * 2)::int] else 0 end as extra
  from stayed s
),
exited as (
  select e.*,
    -- Still in care, or about 15% never recorded, leave the exit blank; a quarter leave 1 to 5 days early.
    case
      when e.admission + e.los + e.extra > date '2026-10-17' or pg_temp.r(e.n, 'exitmiss') < 0.15 then null
      when pg_temp.r(e.n, 'early') < 0.25 then e.admission + e.los + e.extra - 1 - floor(pg_temp.r(e.n, 'earlyday') * 5)::int
      else e.admission + e.los + e.extra
    end as exit_date
  from extended e
),
flagged as (
  select p.*,
    -- Checklist, conflict and eligibility flags as the cross-checks word them.
    to_jsonb(array_remove(array[
      case when pg_temp.r(p.n, 'miss') < (case when p.hospital = 'Inland Valley Medical Center' then 0.55 else 0.18 end)
        then jsonb_build_object('kind', 'document', 'message', 'Missing: ' || pg_temp.pick(pg_temp.r(p.n, 'missdoc'),
          array['Updated Vitals (last 24 hours)', 'PT/OT or Nursing Notes', 'H&P (History and Physical)', 'CalOptima Form/LOA/AUTH', 'Medication List'], array[0.35, 0.6, 0.75, 0.9, 1.0])) end,
      case when pg_temp.r(p.n, 'old') < 0.2
        then jsonb_build_object('kind', 'document', 'message', 'Vitals are ' || (26 + floor(pg_temp.r(p.n, 'hrs') * 40)::int) || ' hours old (checklist asks for the last 24 hours)') end,
      case when pg_temp.r(p.n, 'conf') < (case when p.hospital = 'Inland Valley Medical Center' then 0.35 else 0.12 end)
        then jsonb_build_object('kind', 'conflict', 'field', 'los_authorized_days', 'message', 'Authorization approves 14 days; the form asks for ' || p.los) end,
      case when p.status = 'denied' then case p.deny
        when 'Active infection not cleared' then jsonb_build_object('kind', 'eligibility', 'message', 'Active infection: Staphylococcus aureus (MRSA) on culture, not documented as cleared')
        when 'Not ambulatory / can''t transfer' then jsonb_build_object('kind', 'eligibility', 'message', 'PT/OT or Nursing Notes: walks ' || (20 + floor(pg_temp.r(p.n, 'ft') * 70)::int) || ' ft (must manage 100 ft)')
        when 'Cognitive impairment' then jsonb_build_object('kind', 'eligibility', 'message', 'H&P documents cognitive impairment')
        when 'Can''t self-administer meds / IV meds' then jsonb_build_object('kind', 'eligibility', 'message', 'IV medication: Vancomycin 1 g (patients must self-administer their medications)')
        when 'Not medically stable' then jsonb_build_object('kind', 'eligibility', 'message', 'Current Progress Notes: not documented as medically stable for discharge')
      end end
    ], null)) as doc_flags
  from exited p
)
insert into "ILLINTAKE_referrals" (id, created_at, updated_at, source, status, patient_name, referring_hospital, data, flags, doc_flags, reviewed_at, decided_at, withdrawn_at)
select
  f.id, f.created, coalesce(f.withdrawn_at, f.decided_at, f.created),
  case when pg_temp.r(f.n, 'src') < 0.6 then 'scan' else 'portal' end,
  f.status, f.name, f.hospital,
  jsonb_build_object(
    'referring_hospital', f.hospital,
    'referrer_name', (array['A. Patel, LCSW', 'M. Chen, RN CM', 'J. Ruiz, MSW', 'L. Nguyen, LCSW', 'K. Owens, RN CM'])[1 + f.n % 5],
    'referrer_phone', '(714) 555-01' || lpad((f.n % 100)::text, 2, '0'),
    'patient_name', f.name, 'dob', f.dob, 'gender', case when f.n % 3 = 0 then 'Female' else 'Male' end,
    'insurance', 'CalOptima', 'preferred_language', f.lang,
    'housing_situation', case when pg_temp.r(f.n, 'eps') < 0.4 then '["Currently Unhoused", "4+ episodes of homelessness in the past 3 years"]'::jsonb else '["Currently Unhoused"]'::jsonb end,
    'chief_complaint', f.dx, 'admit_date', (f.created at time zone 'America/Los_Angeles')::date - 5,
    'wounds', case when f.wound then 'Yes' else 'No' end,
    'wounds_detail', case when f.wound then 'Wound, packed daily' end,
    'independent_wound_care', case when f.wound then case when pg_temp.r(f.n, 'iwc') < 0.5 then 'Yes' else 'No' end end,
    'home_health_ordered', case when f.wound then 'Yes' end,
    'tb_test_done', 'Yes', 'self_admin_meds', 'Yes', 'continent', 'Yes', 'ostomy', 'No', 'foley', 'No', 'hospice', 'No', 'car', 'No', 'service_animal', 'No',
    'diabetes', case when f.insulin or f.dx = 'Diabetic foot ulcer' then 'Yes' else 'No' end,
    'insulin', case when f.insulin then 'Yes' else 'No' end,
    'o2', case when f.o2 then 'Yes' else 'No' end, 'o2_explain', case when f.o2 then '2L NC' end,
    'ambulatory', 'Yes', 'active_infection', 'No',
    'assistive_device', case when f.device then 'Yes' else 'No' end, 'assistive_device_explain', case when f.device then 'walker' end,
    'has_limitations', case when f.mh or f.forgetful then 'Yes' else 'No' end,
    'behavioral_flags', to_jsonb(array_remove(array[case when f.mh then 'Mental Health DX' end, case when f.forgetful then 'Forgetful' end], null)),
    'mental_health_dx_type', case when f.mh then 'Depression' end,
    'los_authorized_days', f.los, 'meds_30_day_supply', 'Yes',
    'date_received', (f.created at time zone 'America/Los_Angeles')::date,
    'reviewed_by', case when f.status <> 'needs_review' then f.reviewer end,
    'approved', case when f.was_approved then 'Yes' when f.status = 'denied' then 'No' end,
    'approval_date', case when f.was_approved then (f.decided_at at time zone 'America/Los_Angeles')::date end,
    'authorization_number', case when f.was_approved then 'RC-2026-' || (110000 + f.n) end,
    'denial_category', case when f.status = 'denied' then f.deny end,
    'denial_reason', case when f.status = 'denied' then f.deny || ' (mock history)' end,
    'admission_date', case when f.status = 'approved' then f.admission end,
    'admission_time', case when f.status = 'approved' then f.admission_time end,
    'exit_date', case when f.status = 'approved' then f.exit_date end,
    'extension_requested', case when f.status = 'approved' then f.extension end,
    'extension_approval_date', case when f.status = 'approved' and f.extension = 'Yes' then f.extension_date end,
    'extension_approved_by', case when f.status = 'approved' and f.extension = 'Yes' then (array['Robin Hyrons', 'Hobey Letessier', 'Bordy Coultar'])[1 + floor(pg_temp.r(f.n, 'extby') * 3)::int] end,
    'total_los', case when f.status = 'approved' then f.exit_date - f.admission end
  ) || case when f.status = 'withdrawn' then jsonb_build_object(
    'withdrawn', 'Yes',
    'withdrawal_reason', f.withdrawal_reason,
    'withdrawal_date', (f.withdrawn_at at time zone 'America/Los_Angeles')::date,
    'withdrawal_time', to_char(f.withdrawn_at at time zone 'America/Los_Angeles', 'HH24:MI'),
    'withdrawal_note', 'Hospital case manager called (mock history)'
  ) else '{}'::jsonb end,
  '[]'::jsonb, f.doc_flags, f.decided_at, f.decided_at, f.withdrawn_at
from flagged f;

-- A demographic page (hospital face sheet) for every history referral; the flags above never list it as missing.
insert into "ILLINTAKE_supporting_docs" (referral_id, created_at, doc_type, label, status, data)
select r.id, r.created_at, 'demographics', 'Hospital Face Sheet', 'done',
  jsonb_build_object('patient_name', r.patient_name, 'dob', r.data->>'dob', 'sex', left(r.data->>'gender', 1), 'address', 'homeless',
    'insurance', 'CalOptima Health (Medi-Cal)', 'member_id', 'C' || (17000000 + substr(r.id::text, 25)::int), 'emergency_contact', 'None listed',
    'preferred_language', r.data->>'preferred_language', 'notes', null)
from "ILLINTAKE_referrals" r
where r.id::text like 'b2000000-%';

-- Housing assessments for approved patients admitted at least 5 days ago: most complete, some drafts, some not started.
insert into "ILLINTAKE_assessments" (referral_id, created_at, updated_at, status, data, completed_at)
select
  r.id, a.at, a.at, a.status,
  jsonb_build_object(
    'veteran_status', case when pg_temp.r(a.n, 'vet') < 0.08 then 'Yes' else 'No' end,
    'household_size', 1,
    'prior_living_situation', pg_temp.pick(pg_temp.r(a.n, 'prior'),
      array['Place not meant for habitation (street, car, encampment)', 'Emergency shelter', 'Staying with family or friends', 'Jail or prison', 'Transitional housing'], array[0.55, 0.80, 0.90, 0.95, 1.0]),
    'length_of_stay_prior', pg_temp.pick(pg_temp.r(a.n, 'len'), array['1 to 3 months', '3 months to 1 year', '1 year or longer'], array[0.25, 0.55, 1.0]),
    'homeless_start_date', date '2026-09-01' - floor(pg_temp.r(a.n, 'start') * 900)::int,
    'times_homeless_3yrs', pg_temp.pick(pg_temp.r(a.n, 'times'), array['One time', 'Two times', 'Three times', 'Four or more times'], array[0.4, 0.6, 0.7, 1.0]),
    'months_homeless_3yrs', 2 + floor(pg_temp.r(a.n, 'months') * 34)::int,
    'disabling_condition', case when pg_temp.r(a.n, 'dis') < 0.8 then 'Yes' else 'No' end,
    'conditions', to_jsonb(array_remove(array[
      case when pg_temp.r(a.n, 'c1') < 0.6 then 'Chronic health condition' end,
      case when pg_temp.r(a.n, 'c2') < 0.4 then 'Mental health disorder' end,
      case when pg_temp.r(a.n, 'c3') < 0.3 then 'Physical disability' end,
      case when pg_temp.r(a.n, 'c4') < 0.25 then 'Substance use disorder' end], null)),
    'health_insurance', 'CalOptima Health (Medi-Cal)',
    'has_pcp', case when pg_temp.r(a.n, 'pcp') < 0.4 then 'Yes' else 'No' end,
    'pcp_name', 'Community clinic',
    'has_income', case when pg_temp.r(a.n, 'inc') < 0.35 then 'Yes' else 'No' end,
    'income_sources', case when pg_temp.r(a.n, 'inc') < 0.35 then to_jsonb(array[(array['SSI', 'SSDI', 'General Relief', 'Earned income'])[1 + a.n % 4]]) else '[]'::jsonb end,
    'monthly_income', case when pg_temp.r(a.n, 'inc') < 0.35 then 600 + floor(pg_temp.r(a.n, 'amt') * 700)::int end,
    'id_documents', to_jsonb(array_remove(array[
      case when pg_temp.r(a.n, 'id') < 0.45 then 'CA ID or driver''s license' end,
      case when pg_temp.r(a.n, 'ss') < 0.35 then 'Social Security card' end,
      case when pg_temp.r(a.n, 'bc') < 0.3 then 'Birth certificate' end], null)),
    'housing_goal', pg_temp.pick(pg_temp.r(a.n, 'goal'), array['Permanent supportive housing', 'Rapid rehousing', 'Board and care', 'Family reunification', 'Sober living'], array[0.6, 0.78, 0.88, 0.95, 1.0]),
    'ces_enrolled', case when pg_temp.r(a.n, 'ces') < 0.65 then 'Yes' else 'No' end,
    'housing_barriers', to_jsonb(array_remove(array[
      case when pg_temp.r(a.n, 'b1') < 0.6 then 'No income' end,
      case when pg_temp.r(a.n, 'b2') < 0.5 then 'Missing ID documents' end,
      case when pg_temp.r(a.n, 'b3') < 0.2 then 'Eviction history' end,
      case when pg_temp.r(a.n, 'b4') < 0.18 then 'Criminal record' end,
      case when pg_temp.r(a.n, 'b5') < 0.25 then 'Poor or no credit' end,
      case when pg_temp.r(a.n, 'b6') < 0.1 then 'Pets' end,
      case when pg_temp.r(a.n, 'b7') < 0.15 then 'Accessibility needs' end,
      case when pg_temp.r(a.n, 'b8') < 0.12 then 'Active substance use' end], null)),
    'services_needed', to_jsonb(array_remove(array[
      case when pg_temp.r(a.n, 's1') < 0.6 then 'Benefits enrollment' end,
      case when pg_temp.r(a.n, 's2') < 0.4 then 'Mental health services' end,
      case when pg_temp.r(a.n, 's3') < 0.2 then 'Substance use treatment' end,
      case when pg_temp.r(a.n, 's4') < 0.5 then 'Transportation' end,
      case when pg_temp.r(a.n, 's5') < 0.35 then 'Food assistance' end,
      case when pg_temp.r(a.n, 's6') < 0.45 then 'Primary care connection' end,
      case when pg_temp.r(a.n, 's7') < 0.15 then 'Employment / job search' end], null)),
    'client_goals', 'Stable housing (mock history)',
    'hmis_consent', case when pg_temp.r(a.n, 'hmis') < 0.85 then 'Yes' else 'No' end,
    'roi_signed', case when pg_temp.r(a.n, 'roi') < 0.9 then 'Yes' else 'No' end,
    'assessed_by', (array['Luce Joire', 'Travis Lavallin', 'Ludwig Buckeridge'])[1 + a.n % 3],
    'assessment_date', a.at::date
  ),
  case when a.status = 'complete' then a.at end
from "ILLINTAKE_referrals" r
cross join lateral (
  select
    substr(r.id::text, 25)::int as n,
    case when pg_temp.r(substr(r.id::text, 25)::int, 'asmt') < 0.78 then 'complete' else 'draft' end as status,
    ((r.data->>'admission_date')::date + 2 + floor(pg_temp.r(substr(r.id::text, 25)::int, 'asmtday') * 8)::int)::timestamp at time zone 'America/Los_Angeles' + interval '14 hours' as at
) a
where r.id::text like 'b2000000-%'
  and r.status = 'approved'
  and (r.data->>'admission_date')::date <= date '2026-10-07'
  and pg_temp.r(a.n, 'started') < 0.9;

commit;
