import { SignIn } from "@clerk/nextjs";

/**
 * The door (DESIGN.md §12): mark, wordmark, the sign-in card, and one
 * honest line about ownership. Nothing else.
 */
export default function SignInPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 px-6 py-12">
      <div className="flex flex-col items-center gap-3">
        <span className="font-display text-5xl tracking-tight text-bone">auteur</span>
        <span className="timecode text-xs text-bone/40">directed by you</span>
      </div>
      <SignIn />
      <p className="timecode text-xs text-bone/35">your footage stays yours</p>
    </main>
  );
}
