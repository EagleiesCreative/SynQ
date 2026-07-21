import { AdminQrCode } from "@/components/admin/AdminQrCode";
import { getCurrentUserAndProfile } from "@/lib/auth";

export default async function AdminQrPage() {
  const { profile } = await getCurrentUserAndProfile();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">QR code</h1>
        <p className="text-sm text-slate-500">
          These links are tied to your organization — they&apos;re the only
          way customers reach the join page or a display board sees this
          queue&apos;s data.
        </p>
      </div>
      <AdminQrCode organizationId={profile?.organization_id || ""} />
    </div>
  );
}
