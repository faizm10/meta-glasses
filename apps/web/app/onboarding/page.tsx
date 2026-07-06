import { redirect } from "next/navigation";

import { Onboarding } from "@/features/onboarding/onboarding";
import { ensureUser } from "@/lib/ensure-user";

export default async function OnboardingPage() {
  const user = await ensureUser();
  if (user.onboardedAt) redirect("/");
  return <Onboarding />;
}
