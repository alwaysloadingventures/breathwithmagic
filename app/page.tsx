import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl font-semibold text-foreground mb-4">
          breathwithmagic
        </h1>
        <p className="text-muted-foreground text-lg mb-8">
          Your journey to wellness starts here.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/sign-up"
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Get Started
          </Link>
          <Link
            href="/sign-in"
            className="px-6 py-3 border border-border rounded-lg hover:bg-accent transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}
