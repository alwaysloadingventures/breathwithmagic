export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-accent/30 px-4">
      {/* Brand Logo */}
      <div className="mb-8 flex flex-col items-center">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-8 h-8 text-primary"
            aria-hidden="true"
          >
            <path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z" />
            <path d="M17 4a2 2 0 0 0 2 2a2 2 0 0 0 -2 2a2 2 0 0 0 -2 -2a2 2 0 0 0 2 -2" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          breathwithmagic
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Your journey to wellness starts here
        </p>
      </div>

      {/* Auth Component Container */}
      <div className="w-full max-w-md">{children}</div>

      {/* Footer */}
      <footer className="mt-8 text-center text-sm text-muted-foreground">
        <p>
          By continuing, you agree to our{" "}
          <a
            href="/terms"
            className="text-primary hover:underline inline-block py-2 px-1"
          >
            Terms of Service
          </a>{" "}
          and{" "}
          <a
            href="/privacy"
            className="text-primary hover:underline inline-block py-2 px-1"
          >
            Privacy Policy
          </a>
        </p>
      </footer>
    </div>
  );
}
