"use client";

import { useState, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Search, Users } from "lucide-react";
import type { SubscriberItem } from "@/lib/validations/analytics";

interface SubscribersClientProps {
  initialSubscribers: SubscriberItem[];
  initialHasMore: boolean;
  initialTotal: number;
}

/**
 * Subscribers Client Component
 *
 * Client component for the subscribers list with search,
 * filtering, and pagination.
 */
export function SubscribersClient({
  initialSubscribers,
  initialHasMore,
  initialTotal,
}: SubscribersClientProps) {
  const [subscribers, setSubscribers] =
    useState<SubscriberItem[]>(initialSubscribers);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [total, setTotal] = useState(initialTotal);
  const [cursor, setCursor] = useState<string | null>(
    initialSubscribers.length > 0
      ? initialSubscribers[initialSubscribers.length - 1].id
      : null,
  );

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  /**
   * Fetch subscribers with current filters
   */
  const fetchSubscribers = useCallback(
    async (append = false) => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (append && cursor) params.set("cursor", cursor);

        const response = await fetch(`/api/creator/subscribers?${params}`);
        if (!response.ok) throw new Error("Failed to fetch subscribers");

        const data = await response.json();

        if (append) {
          setSubscribers((prev) => [...prev, ...data.items]);
        } else {
          setSubscribers(data.items);
        }

        setHasMore(!!data.nextCursor);
        setCursor(data.nextCursor);
        setTotal(data.total);
      } catch (err) {
        console.error("Error fetching subscribers:", err);
        setError("Failed to load subscribers. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [debouncedSearch, statusFilter, cursor],
  );

  // Refetch when filters change
  useEffect(() => {
    setCursor(null);
    fetchSubscribers(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, statusFilter]);

  /**
   * Load more subscribers
   */
  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      fetchSubscribers(true);
    }
  };

  /**
   * Format date to relative time
   */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  /**
   * Format cents to dollars
   */
  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(0)}/mo`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold">Subscribers</h1>
        <p className="mt-1 text-muted-foreground">
          {total} {total === 1 ? "subscriber" : "subscribers"} supporting your
          content.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Search subscribers"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => value && setStatusFilter(value)}
        >
          <SelectTrigger className="w-[150px]" aria-label="Filter by status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="trialing">Trialing</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Subscribers List */}
      <div className="space-y-3">
        {subscribers.length === 0 && !isLoading && !error ? (
          <div className="rounded-lg border border-border bg-card py-16 text-center">
            <Users className="mx-auto size-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">
              {debouncedSearch || statusFilter !== "all"
                ? "No subscribers match your filters."
                : "No subscribers yet. Share your profile to get your first supporter."}
            </p>
          </div>
        ) : (
          subscribers.map((subscriber) => (
            <div
              key={subscriber.id}
              className="flex items-center gap-4 rounded-lg border border-border bg-card p-4"
            >
              <Avatar className="size-12">
                <AvatarImage
                  src={subscriber.user.avatarUrl || undefined}
                  alt={subscriber.user.name || "Subscriber"}
                />
                <AvatarFallback>
                  {subscriber.user.name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {subscriber.user.name || "Anonymous"}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {subscriber.user.email}
                </p>
              </div>

              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium">
                  {formatPrice(subscriber.priceAtPurchase)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Joined {formatDate(subscriber.createdAt)}
                </p>
              </div>

              <Badge
                variant={
                  subscriber.status === "trialing" ? "secondary" : "default"
                }
              >
                {subscriber.status === "trialing" ? "Trial" : "Active"}
              </Badge>
            </div>
          ))
        )}

        {/* Loading Skeletons */}
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-lg border border-border bg-card p-4"
            >
              <div className="size-12 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-3 w-48 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-6 w-16 animate-pulse rounded bg-muted" />
            </div>
          ))}
      </div>

      {/* Load More */}
      {hasMore && !isLoading && (
        <div className="flex justify-center pt-4">
          <Button variant="outline" onClick={handleLoadMore}>
            Load more
          </Button>
        </div>
      )}

      {/* Loading More Indicator */}
      {isLoading && subscribers.length > 0 && (
        <div className="flex justify-center pt-4">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
