// 테스트용 더미 데이터 생성 스크립트 (1회성).
// 사용법: node scripts/seed-test-rounds.mjs
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const NAME = "테스트";
const PIN = "1234";
const ROUND_COUNT = 30;
const DISCIPLINES = ["trap", "american_random", "american_00"];

const prisma = new PrismaClient();

function randomDateWithinDays(days) {
  const now = Date.now();
  const past = now - Math.random() * days * 24 * 60 * 60 * 1000;
  return new Date(past);
}

function randomShot(hitChance) {
  return Math.random() < hitChance ? "hit" : "miss";
}

async function main() {
  const adminMembership = await prisma.clubMembership.findFirst({ where: { role: "admin" } });
  if (!adminMembership) {
    throw new Error("admin 클럽을 찾을 수 없습니다. 먼저 관리자 계정을 만들어주세요.");
  }
  const clubId = adminMembership.clubId;
  const enteredById = adminMembership.userId;

  let user = await prisma.user.findUnique({ where: { name: NAME } });
  if (!user) {
    const pinHash = await bcrypt.hash(PIN, 10);
    user = await prisma.user.create({ data: { name: NAME, pin: pinHash } });
    console.log(`유저 생성: ${NAME} (PIN ${PIN})`);
  } else {
    console.log(`기존 유저 사용: ${NAME}`);
  }

  const existingMembership = await prisma.clubMembership.findUnique({
    where: { userId_clubId: { userId: user.id, clubId } },
  });
  if (!existingMembership) {
    await prisma.clubMembership.create({ data: { userId: user.id, clubId, role: "member" } });
  }

  for (let i = 0; i < ROUND_COUNT; i++) {
    const discipline = DISCIPLINES[Math.floor(Math.random() * DISCIPLINES.length)];
    const date = randomDateWithinDays(90);
    // 사람마다/회차마다 실력 편차를 주기 위해 초격 명중률을 60~90% 사이에서 랜덤화
    const firstBarrelChance = 0.6 + Math.random() * 0.3;
    const recoveryChance = 0.4 + Math.random() * 0.4;

    const round = await prisma.round.create({
      data: { shooterId: user.id, clubId, date, discipline, enteredById },
    });

    const targets = [];
    for (let targetNumber = 1; targetNumber <= 25; targetNumber++) {
      const station = Math.ceil(targetNumber / 5);
      const firstResult = randomShot(firstBarrelChance);
      const secondResult = firstResult === "miss" ? randomShot(recoveryChance) : null;
      targets.push({ roundId: round.id, targetNumber, station, firstResult, secondResult });
    }
    await prisma.target.createMany({ data: targets });

    console.log(`  라운드 ${i + 1}/${ROUND_COUNT} 생성 완료 (${discipline}, ${date.toISOString()})`);
  }

  console.log("완료.");
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
