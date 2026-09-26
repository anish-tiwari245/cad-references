import type { Metadata } from "next";
import AdminLogin from "@/components/admin/AdminLogin";
import AdminPanel from "@/components/admin/AdminPanel";
import { isAdmin } from "@/lib/adminAuth";
import { getEntries, getPending } from "@/lib/store";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

// Reads the session cookie, so this route is always rendered per request.
export default async function AdminPage() {
  if (!(await isAdmin())) return <AdminLogin />;

  const [pending, entries] = await Promise.all([getPending(), getEntries()]);
  return <AdminPanel pending={pending} entries={entries} />;
}
