import Link from "next/link";
import { IrisLogo } from "@/components/IrisLogo";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <IrisLogo className="mb-10" />
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight max-w-2xl">
        Feel good about the energy your home uses
      </h1>
      <p className="mt-6 text-lg text-zinc-400 max-w-xl leading-relaxed">
        Iris turns simple sensors into a clear picture of waste — lights left on, rooms overheating, and the
        carbon footprint that comes with it. No jargon, just helpful nudges.
      </p>
      <div className="mt-10 flex flex-wrap gap-4 justify-center">
        <Link href="/dashboard">
          <Button>Open dashboard</Button>
        </Link>
        <Link
          href="/onboarding"
          className="inline-flex items-center rounded-xl px-4 py-2.5 text-sm font-medium border border-zinc-600 text-zinc-200 hover:bg-zinc-800"
        >
          Set up home profile
        </Link>
      </div>
    </main>
  );
}
