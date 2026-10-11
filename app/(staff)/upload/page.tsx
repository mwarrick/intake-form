import { requireUser } from "@/lib/auth";
import { UploadForm } from "./UploadForm";

export default async function UploadPage() {
  await requireUser("/upload");
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-brand-900">Upload a scanned referral</h1>
        <p className="mt-1 text-sm text-slate-600">
          Upload the whole fax. The reader picks out the referral form page, reads each field, and sends a second,
          stronger model to re-check anything it couldn’t read confidently. You review the result next to the scan.
        </p>
      </div>
      <UploadForm />
    </div>
  );
}
