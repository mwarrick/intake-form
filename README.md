# intake-form

Intake for Illumination Health + Home Recuperative Care referrals (form RC0725-SH). Hackathon project. **Fake patient data only.**

There are two ways in, and both land in the same coordinator queue:

1. **Paper/fax reader (`/upload`).** Upload a faxed referral packet (PDF or photo). The app picks out the referral form page, reads the handwriting with OpenAI models, and flags anything uncertain. A coordinator then checks the fields side by side with the scan.
2. **Online referral portal (`/refer`).** Hospital SW/CM/RN staff fill out the same form on the web and attach supporting documents. A referrer who already filled out the paper form can **upload a scan of it to pre-fill the online form**. The same reader fills in the fields and highlights the ones that were hard to read, disputed or ambiguous. The referrer checks them against their original and confirms before submitting. Until then the referral is a `draft` and stays out of the queue. The coordinator sees the scan beside the fields, plus a list of fields the referrer corrected.

The **queue** (`/referrals`) lists every referral. Each referral's page has the review screen and the Illumination Staff Only decision box.

## How the reader works

The browser renders each page to a JPEG and uploads it straight to Supabase Storage through signed URLs, which avoids Vercel's 4.5 MB request limit. The server then runs three steps (`lib/extract.ts`), each with its own model:

| Step | Model (env var) | Default | What it does |
|---|---|---|---|
| Find the form page | `OPENAI_MODEL_CLASSIFY` | `gpt-5.4-nano` | Looks at every page at low detail and picks the referral form out of cover sheets, H&Ps and med lists. Skipped for one-page uploads. |
| Read the form | `OPENAI_MODEL_EXTRACT` | `gpt-5.4-mini` | Reads every field at high detail into a strict JSON schema: value, exactly what was written, and a confidence score. |
| Re-read unsure fields | `OPENAI_MODEL_REREAD` | `gpt-5.5` | Gives fields below `EXTRACT_REREAD_THRESHOLD` (default 0.75) an independent second reading. If the two readings agree, confidence goes up. If they disagree, the field is flagged and shows both. Set it to empty to skip this step. |

**Supporting documents.** The checklist items (face sheet, CalOptima authorization, H&P, progress notes, vitals, medication list, PT/OT notes, culture) are read too. That covers files attached on the online form and, in a faxed packet, the pages the classifier labels as one of those documents. Each document type has its own short field list (`lib/documents.ts`) and is read in one call to `OPENAI_MODEL_DOCS` (default `gpt-5.4-mini`). Plain code (`lib/crosscheck.ts`) then compares the documents with the form and the admission criteria: patient identity, active infections (e.g. MRSA on a culture while the form says none), cognition and orientation, walking distance, transfers and ADLs, IV medications, insulin and oxygen, vitals older than 24 hours, and the authorization (status, number, approved days vs. requested). Conflicts appear on the review screen under the form field they contradict, and in a Documents panel.

Validation and admission-criteria checks are plain code (`lib/validate.ts`), not a model. They cover required fields, formats, DOBs that could be read month/day or day/month, and eligibility rules such as not ambulatory, active infection, cognitive impairment, or registered sex offender.

The defaults are model names whose tier is clear. Swap in any vision-capable model from your OpenAI account through the environment variables; no code changes needed.

## Layout

- `docs/REQUIREMENTS.md`: the requirements, with the status of each (built, in progress, planned, deferred).

- `schema/referral-form.json`: the one field list. It drives the extraction schema, the portal form, the review screen and validation.
- `supabase/migrations/`: `0001` creates tables `ILLINTAKE_referrals` and `ILLINTAKE_documents` and the private storage bucket `illintake-files`. `0002` adds the `draft` status for portal pre-fill. `0003` adds `ILLINTAKE_supporting_docs` (what was read from each supporting document) and `doc_flags` on referrals.
- `lib/extract.ts`: the OpenAI pipeline. `lib/validate.ts`: rules and flags. `lib/process.ts`: runs a scan through the pipeline.
- `app/`: pages (`/upload`, `/refer`, `/referrals`, `/referrals/[id]`), server actions, and the processing route.
- `scripts/make_samples.py`: generates fake hand-filled, faxed forms with answer keys in `samples/synthetic/`.
- `scripts/make_documents.py`: generates fake supporting documents for the same three patients in `samples/synthetic/documents/`, with answer keys and the flags they should raise. Each patient gets typed printouts plus handwritten versions of the vitals flowsheet, nursing mobility assessment, authorization request, and a medication list with handwritten corrections. Patient 2's culture shows MRSA although the form says no infection, their authorization is short, and their vitals are 32 hours old. Patient 3 has IV antibiotics, dementia, walks only 40 ft, a pending authorization, and an MRN typo.
- `test/`: unit tests, plus `eval.test.ts`, which scores the real pipeline against the sample answer keys.

## Setup

1. **Supabase:** run the files in `supabase/migrations/` in order, in the SQL editor or with `supabase db push`. Table names are uppercase, so raw SQL must quote them: `select * from "ILLINTAKE_referrals"`.
2. **Environment variables** (Vercel project settings; see `.env.example`):
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`), and `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SECRET_KEY`). The Vercel Supabase integration sets these.
   - `OPENAI_API_KEY`
   - Optional: `OPENAI_MODEL_CLASSIFY`, `OPENAI_MODEL_EXTRACT`, `OPENAI_MODEL_REREAD`, `OPENAI_MODEL_DOCS`, `EXTRACT_REREAD_THRESHOLD`
3. `npm install` (this also copies the pdf.js worker into `public/`), then `npm run dev`.

**Cleanup:** Vercel Cron calls `/api/cron/cleanup` once a day (`vercel.json`). It deletes uploads that are more than a day old and not attached to an intake record: online-form uploads of a paper form that were never submitted (including repeat uploads), and storage folders whose referral no longer exists. Faxed scans and submitted referrals are never deleted. Optionally set `CRON_SECRET` in Vercel so only the cron job can call the route.

All database access goes through server code with the service role key. Row level security is on with no policies, so the public key can't read the tables. There's no login: anyone with the URL can see the queue, which is fine for fake data only.

## Testing accuracy

```bash
npm run samples   # regenerate samples/synthetic/*.pdf and their answer keys
python3 scripts/make_documents.py   # regenerate the supporting documents
npm test          # unit tests (free)
npm run eval      # run the real pipeline on every sample and score each field (uses the OpenAI API)
OPENAI_MODEL_EXTRACT=gpt-5.5 OPENAI_MODEL_REREAD= npm run eval   # compare another model
```

The eval reports fields correct per sample, whether the form page was found, tokens and time. It also reports **confidently wrong** fields: wrong answers the model was sure about. Those are the dangerous ones, because the review screen won't highlight them.

The three samples cover a neat single-page form, messy writing with a crossed-out answer and an ambiguous DOB, and a three-page packet for a patient who fails the admission criteria.

## Deferred until after the prototype

This is a prototype with fake data. These are intentionally out of scope for now and must be done before any real patient data goes through the app:

- **HIPAA compliance:** signed BAAs with every service that touches patient data (OpenAI, Vercel, Supabase, the fax/email provider, logging), the plan tiers those require, and OpenAI zero data retention.
- **Audit log:** a record of who viewed or changed each referral, and when.
- **Staff login:** the queue and review screens are open to anyone with the URL.
- **Email notifications:** confirming receipt to the referrer and sending them the approve/deny decision. For now, coordinators contact referrers themselves.

## Known issue in the fillable PDF

In `RC0725-SH`, all 52 Yes/No checkboxes on page 2 are wired as a single field (`Check Box1`). Ticking one box ticks or clears all of them, so a digitally filled copy can't be trusted for those answers.
