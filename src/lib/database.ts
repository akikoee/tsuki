"use server";

import { prisma } from "./prisma";
export async function getUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      accounts: {
        where: {
          providerId: {
            in: ["spotify", "apple"],
          },
        },
      },
    },
  });
  return user;
}

export async function updateAppleMusicUserToken(userId: string, token: string, storefrontId: string) {
  await prisma.account.updateMany({
    where: {
      userId: userId,
      providerId: "apple",
    },
    data: { appleMusicUserToken: token, storefrontId: storefrontId },
  });
}
