# intake-form

Intake for Illumination Health + Home Recuperative Care referrals (form RC0725-SH).

There are two ways in, and both end in the same coordinator queue:

1. **Paper/fax reader (main focus).** Referrals arrive by fax or email to RECUP@ as scanned PDFs. The app finds page 2, reads the handwriting with a vision model, and fills in the fields with a confidence score for each one. A coordinator then checks and corrects the result side by side with the scan before it's saved.
2. **Online referral portal.** Hospital SW/CM/RN staff fill out the same form on the web and attach supporting documents.

## Layout

- `schema/referral-form.json`: the one field list for the form. Both the reader and the portal are built from it. It records field types, required and conditional rules, admission-criteria flags, which fields hold patient data, and which are staff-only.
- `docs/RC0725-SH-referral-form-blank.pdf`: the blank reference form.

## Known issue in the fillable PDF

In `RC0725-SH`, all 52 Yes/No checkboxes on page 2 are wired as a single field (`Check Box1`). Ticking one box ticks or clears all of them, so a digitally filled copy can't be trusted for those answers.

## Patient data

Referrals contain protected health information (PHI). Never commit real referrals or scans. Use `samples/synthetic/` for made-up test forms only.
