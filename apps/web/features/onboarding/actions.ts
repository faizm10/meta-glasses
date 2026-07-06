"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { completeUserOnboarding, findUserByClerkId } from "@auteur/db";

import { PICK_COUNT, STYLE_SLUGS } from "./styles";

export async function completeOnboarding(picked: string[]) {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("not signed in");

  const unique = [...new Set(picked)];
  if (unique.length !== PICK_COUNT || !unique.every((s) => STYLE_SLUGS.has(s))) {
    throw new Error("pick exactly five styles");
  }

  const user = await findUserByClerkId(clerkId);
  if (!user) throw new Error("user row missing — ensureUser did not run");

  await completeUserOnboarding(user.id, unique);
  redirect("/");
}
