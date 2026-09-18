import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth";
import { getAdminClubId } from "@/lib/authz";
import { TopBar } from "@/components/TopBar";
import { SquadHistory } from "./SquadHistory";

export default async function SquadsHistoryPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const clubId = await getAdminClubId(userId);
  if (!clubId) redirect("/");

  return (
    <main className="min-h-full px-4 pb-8 max-w-lg mx-auto">
      <TopBar title="최근 기록" />
      <SquadHistory />
    </main>
  );
}
