import { getStore } from "@/lib/db";
import { AdminNav } from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#f2efea] text-tumelero-marinho md:flex-row">
      <AdminNav storeKind={getStore().kind} />
      <main className="min-w-0 flex-1 overflow-y-auto px-4 py-6 md:h-[100dvh] md:px-8">{children}</main>
    </div>
  );
}
