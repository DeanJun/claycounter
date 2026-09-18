import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth";
import { getAdminClubId } from "@/lib/authz";
import { TopBar } from "@/components/TopBar";
import { MembersManager } from "./MembersManager";

export default async function MembersPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const clubId = await getAdminClubId(userId);
  if (!clubId) redirect("/");

  return (
    <main className="min-h-screen px-4 pb-8 max-w-lg mx-auto">
      <TopBar title="회원 추가/제거" />
      <MembersManager />
    </main>
  );
}
