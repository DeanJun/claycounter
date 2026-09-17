// 최초 관리자 계정 생성용 1회성 스크립트 (공개 회원가입이 없어졌기 때문에 필요).
// 사용법: node scripts/create-admin.mjs <이름> <PIN4자리>
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const [, , name, pin] = process.argv;

if (!name || !/^\d{4}$/.test(pin ?? "")) {
  console.error("사용법: node scripts/create-admin.mjs <이름> <PIN4자리>");
  process.exit(1);
}

const prisma = new PrismaClient();

const existing = await prisma.user.findUnique({ where: { name } });
if (existing) {
  console.error(`이미 존재하는 이름입니다: ${name}`);
  process.exit(1);
}

const pinHash = await bcrypt.hash(pin, 10);

const user = await prisma.$transaction(async (tx) => {
  const created = await tx.user.create({ data: { name, pin: pinHash } });
  const club = await tx.club.create({ data: { name: `${name}의 클럽`, isPersonal: false } });
  await tx.clubMembership.create({
    data: { userId: created.id, clubId: club.id, role: "admin" },
  });
  return created;
});

console.log(`관리자 생성 완료: ${user.name} (${user.id})`);
await prisma.$disconnect();
