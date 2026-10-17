import { rereadThreshold } from "@/lib/extract";
import { PortalForm } from "./PortalForm";

export default function ReferPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-brand-900">Recuperative Care Referral</h1>
        <p className="mt-1 text-sm text-slate-600">
          For hospital social workers, case managers and nurses. You’ll get confirmation once it’s received, and a
          decision within two hours.
        </p>
      </div>
      <PortalForm threshold={rereadThreshold} />
    </div>
  );
}
