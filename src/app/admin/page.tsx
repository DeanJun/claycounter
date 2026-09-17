import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth";
import { getAdminClubId } from "@/lib/authz";
import { AdminDashboard } from "./AdminDashboard";

export default async function AdminPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const clubId = await getAdminClubId(userId);
  if (!clubId) redirect("/");

  return (
    <main className="min-h-screen p-6 max-w-3xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">관리자</h1>
      <AdminDashboard />
    </main>
  );
}
