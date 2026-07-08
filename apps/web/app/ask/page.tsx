import Link from "next/link";
import { redirect } from "next/navigation";

import { Ask } from "@/features/ask/ask";
import { ensureUser } from "@/lib/ensure-user";

/**
 * Ask your films (DESIGN.md §21). v1 is a page; the pull-down-anywhere
 * gesture arrives with the motion pass. Search is CLIP text-to-frame —
 * "every sunset" finds sunsets nobody ever tagged.
 */
export default async function AskPage() {
  const user = await ensureUser();
  if (!user.onboardedAt) redirect("/onboarding");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-12 px-6 py-6">
      <header className="flex items-center justify-between">
        <Link href="/" className="timecode text-xs text-bone/40 transition-colors hover:text-bone">
          ← marquee
        </Link>
        <span className="timecode text-xs text-bone/40">ask your films</span>
      </header>
      <section className="expose flex flex-1 flex-col justify-start pt-10">
        <Ask />
      </section>
    </main>
  );
}
