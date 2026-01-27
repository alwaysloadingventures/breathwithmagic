import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/creator";
import {
  AlertCircle,
  ArrowRight,
  Plus,
  BarChart3,
  Users,
  Eye,
  DollarSign,
  Video,
  Headphones,
  FileText,
} from "lucide-react";
import { StripeDashboardButton } from "./stripe-dashboard-button";
import { priceTierToAmount } from "@/lib/validations/creator";

/**
 * Creator Dashboard Page
 *
 * Main dashboard showing:
 * - Overview stats: subscriber count, total revenue, views this period
 * - "Complete Setup" banner if stripeOnboardingComplete is false
 * - Quick actions: Upload content, View analytics, Manage subscribers
 * - Recent content list (last 5 items)
 * - Recent subscriber activity
 */
export default async function CreatorDashboardPage() {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    redirect("/sign-in");
  }

  // Fetch user and creator profile with stats
  const user = await prisma.user.findUnique({
    where: { clerkId },
    include: {
      creatorProfile: {
        select: {
          id: true,
          handle: true,
          displayName: true,
          status: true,
          category: true,
          subscriptionPrice: true,
          stripeAccountId: true,
          stripeOnboardingComplete: true,
        },
      },
    },
  });

  // If no creator profile, redirect to onboarding
  if (!user?.creatorProfile) {
    redirect("/become-creator");
  }

  const profile = user.creatorProfile;
  const hasStripeAccount = !!profile.stripeAccountId;

  // Fetch dashboard stats in parallel for better performance
  // Calculate 30 days ago for date filtering
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Parallelize all dashboard queries using Promise.all
  const [
    subscriberCount,
    viewsThisPeriod,
    recentContent,
    recentSubscribers,
    contentCount,
  ] = await Promise.all([
    // Get subscriber count (active + trialing)
    prisma.subscription.count({
      where: {
        creatorId: profile.id,
        status: { in: ["active", "trialing"] },
      },
    }),
    // Get views this period (last 30 days)
    prisma.contentView.count({
      where: {
        content: { creatorId: profile.id },
        createdAt: { gte: thirtyDaysAgo },
      },
    }),
    // Get recent content (last 5)
    prisma.content.findMany({
      where: {
        creatorId: profile.id,
        status: { not: "deleted" },
      },
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        title: true,
        status: true,
        isFree: true,
        publishedAt: true,
        createdAt: true,
        _count: {
          select: { views: true },
        },
      },
    }),
    // Get recent subscribers (last 5)
    prisma.subscription.findMany({
      where: {
        creatorId: profile.id,
        status: { in: ["active", "trialing"] },
      },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    }),
    // Get content counts
    prisma.content.count({
      where: {
        creatorId: profile.id,
        status: { not: "deleted" },
      },
    }),
  ]);

  // Calculate estimated monthly revenue
  const priceAmount = priceTierToAmount[profile.subscriptionPrice];
  const estimatedRevenue = subscriberCount * priceAmount;

  // Determine Stripe banner content
  const getStripeBannerContent = () => {
    if (profile.stripeOnboardingComplete) {
      return null;
    }

    if (hasStripeAccount) {
      return {
        title: "Resume Stripe Setup",
        description:
          "You started setting up payments but did not finish. Complete your setup to start accepting subscriptions.",
        buttonText: "Resume Setup",
        buttonHref: "/creator/onboarding",
      };
    }

    return {
      title: "Complete your setup",
      description:
        "Your profile is ready. Complete Stripe setup to start accepting payments from subscribers.",
      buttonText: "Set up payments",
      buttonHref: "/creator/onboarding",
    };
  };

  const stripeBanner = getStripeBannerContent();

  // Content type icons
  const contentTypeIcon = {
    video: Video,
    audio: Headphones,
    text: FileText,
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold">
          Welcome back, {profile.displayName}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Here is what is happening with your creator profile.
        </p>
      </div>

      {/* Stripe Setup Banner */}
      {stripeBanner && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-5 text-amber-600 dark:text-amber-500" />
              <CardTitle className="text-base text-amber-900 dark:text-amber-100">
                {stripeBanner.title}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-amber-800 dark:text-amber-200">
              {stripeBanner.description}
            </p>
            <Link
              href={stripeBanner.buttonHref}
              className={cn(buttonVariants({ size: "sm" }), "mt-4")}
            >
              {stripeBanner.buttonText}
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Subscribers"
          value={subscriberCount}
          icon={<Users className="size-5" />}
        />
        <StatCard
          label="Views (30 days)"
          value={viewsThisPeriod.toLocaleString()}
          icon={<Eye className="size-5" />}
        />
        <StatCard
          label="Est. Monthly Revenue"
          value={`$${estimatedRevenue}`}
          icon={<DollarSign className="size-5" />}
        />
        <StatCard
          label="Total Content"
          value={contentCount}
          icon={<Video className="size-5" />}
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link href="/creator/content/new" className={cn(buttonVariants())}>
            <Plus className="mr-2 size-4" />
            Upload Content
          </Link>
          <Link
            href="/creator/analytics"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <BarChart3 className="mr-2 size-4" />
            View Analytics
          </Link>
          <Link
            href="/creator/subscribers"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <Users className="mr-2 size-4" />
            Manage Subscribers
          </Link>
          {profile.stripeOnboardingComplete && <StripeDashboardButton />}
        </CardContent>
      </Card>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Content */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Recent Content</CardTitle>
                <CardDescription>Your latest uploads</CardDescription>
              </div>
              <Link
                href="/creator/content"
                className="text-sm text-primary hover:underline"
              >
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentContent.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No content yet. Upload your first piece of content to get
                  started.
                </p>
                <Link
                  href="/creator/content/new"
                  className={cn(buttonVariants({ size: "sm" }), "mt-4")}
                >
                  <Plus className="mr-2 size-4" />
                  Create content
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentContent.map((content) => {
                  const Icon = contentTypeIcon[content.type];
                  return (
                    <Link
                      key={content.id}
                      href={`/creator/content/${content.id}/edit`}
                      className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-accent"
                    >
                      <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                        <Icon className="size-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {content.title}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge
                            variant={
                              content.status === "published"
                                ? "default"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {content.status}
                          </Badge>
                          <span>{content._count.views} views</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Subscribers */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Recent Subscribers</CardTitle>
                <CardDescription>New people supporting you</CardDescription>
              </div>
              <Link
                href="/creator/subscribers"
                className="text-sm text-primary hover:underline"
              >
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentSubscribers.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No subscribers yet. Share your profile to attract your first
                  supporter.
                </p>
                <Link
                  href={`/${profile.handle}`}
                  target="_blank"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "mt-4",
                  )}
                >
                  View your profile
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentSubscribers.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
                  >
                    <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                      {sub.user.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={sub.user.avatarUrl}
                          alt=""
                          className="size-10 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-medium text-muted-foreground">
                          {sub.user.name?.charAt(0) || "?"}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {sub.user.name || "Anonymous"}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge
                          variant={
                            sub.status === "trialing" ? "secondary" : "default"
                          }
                          className="text-xs"
                        >
                          {sub.status === "trialing" ? "Trial" : "Active"}
                        </Badge>
                        <span>
                          Joined {new Date(sub.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
