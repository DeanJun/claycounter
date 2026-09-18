import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth";
import { getAdminClubId } from "@/lib/authz";
import { TopBar } from "@/components/TopBar";
import { SquadRecorder } from "./SquadRecorder";

export default async function SquadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const clubId = await getAdminClubId(userId);
  if (!clubId) redirect("/");

  return (
    <main className="min-h-full max-w-4xl mx-auto px-2">
      <TopBar title="기록" />
      <SquadRecorder squadId={id} />
    </main>
  );
}
