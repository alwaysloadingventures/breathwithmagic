/**
 * User Settings Page
 *
 * Index page for user settings, providing navigation to various settings sections.
 * Shows active settings pages and "Coming soon" placeholders for future features.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { Bell, User, Shield, Monitor, ChevronRight, LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ensureUser } from "@/lib/ensure-user";

interface SettingsItem {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  comingSoon?: boolean;
}

/**
 * Settings navigation items
 * Active items link to their pages, placeholder items show "Coming soon"
 */
const SETTINGS_ITEMS: SettingsItem[] = [
  {
    href: "/settings/email-preferences",
    icon: Bell,
    title: "Notification Preferences",
    description: "Choose which email and in-app notifications you receive",
  },
  {
    href: "/settings/profile",
    icon: User,
    title: "Profile Settings",
    description: "Update your name, avatar, and profile information",
    comingSoon: true,
  },
  {
    href: "/settings/account",
    icon: Shield,
    title: "Account Settings",
    description: "Manage your account security and authentication",
    comingSoon: true,
  },
  {
    href: "/settings/display",
    icon: Monitor,
    title: "Display Settings",
    description: "Customize your viewing experience and preferences",
    comingSoon: true,
  },
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

          // Render coming soon items as non-clickable cards
          if (item.comingSoon) {
            return (
              <Card key={item.href} className="opacity-75 cursor-not-allowed">
                <CardContent className="flex items-center gap-4 py-4 min-h-[60px]">
                  <div className="bg-muted text-muted-foreground flex h-12 w-12 shrink-0 items-center justify-center rounded-lg">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{item.title}</CardTitle>
                      <Badge variant="secondary" className="text-xs font-normal">
                        Coming soon
                      </Badge>
                    </div>
                    <CardDescription className="text-sm">
                      {item.description}
                    </CardDescription>
                  </div>
                </CardContent>
              </Card>
            );
          }

          // Render active items as clickable links
          return (
            <Link key={item.href} href={item.href} className="cursor-pointer">
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center gap-4 py-4 min-h-[60px]">
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
