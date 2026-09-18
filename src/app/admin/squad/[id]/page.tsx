import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth";
import { getAdminClubId } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { DISCIPLINE_LABELS, type Discipline } from "@/lib/discipline";
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

  const squad = await prisma.squad.findUnique({ where: { id }, select: { discipline: true } });
  const title = squad ? DISCIPLINE_LABELS[squad.discipline as Discipline] ?? "기록" : "기록";

  return (
    <main className="min-h-full max-w-4xl mx-auto px-2">
      <TopBar title={title} />
      <SquadRecorder squadId={id} />
    </main>
  );
}
