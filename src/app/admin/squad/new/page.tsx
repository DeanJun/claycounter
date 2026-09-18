import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth";
import { getAdminClubId } from "@/lib/authz";
import { TopBar } from "@/components/TopBar";
import { NewSquadForm } from "./NewSquadForm";

export default async function NewSquadPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const clubId = await getAdminClubId(userId);
  if (!clubId) redirect("/");

  return (
    <main className="min-h-screen px-4 max-w-lg mx-auto">
      <TopBar title="기록 시작" />
      <NewSquadForm />
    </main>
  );
}
