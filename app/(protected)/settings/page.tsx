/**
 * User Settings Page
 *
 * Index page for user settings, providing navigation to various settings sections.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { Mail, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { ensureUser } from "@/lib/ensure-user";

/**
 * Settings navigation items
 */
const SETTINGS_ITEMS = [
  {
    href: "/settings/email-preferences",
    icon: Mail,
    title: "Email Preferences",
    description: "Choose which emails you receive from breathwithmagic",
  },
  // Future settings pages can be added here:
  // {
  //   href: "/settings/profile",
  //   icon: User,
  //   title: "Profile",
  //   description: "Update your name, avatar, and profile information",
  // },
  // {
  //   href: "/settings/notifications",
  //   icon: Bell,
  //   title: "Notifications",
  //   description: "Manage in-app notification preferences",
  // },
  // {
  //   href: "/settings/privacy",
  //   icon: Shield,
  //   title: "Privacy & Security",
  //   description: "Manage your account privacy and security settings",
  // },
];

export default async function SettingsPage() {
  // Ensure user exists in database (auto-creates if not)
  const userResult = await ensureUser();
  if (!userResult) {
    redirect("/sign-in");
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-foreground text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account preferences.
        </p>
      </div>

      {/* Settings Navigation */}
      <div className="space-y-4">
        {SETTINGS_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="bg-muted text-muted-foreground flex h-12 w-12 shrink-0 items-center justify-center rounded-lg">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">{item.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {item.description}
                    </CardDescription>
                  </div>
                  <ChevronRight className="text-muted-foreground h-5 w-5" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Help text */}
      <p className="text-muted-foreground mt-8 text-center text-sm">
        Need help? Contact us at{" "}
        <a
          href="mailto:support@breathwithmagic.com"
          className="text-primary hover:underline"
        >
          support@breathwithmagic.com
        </a>
      </p>
    </div>
  );
}
