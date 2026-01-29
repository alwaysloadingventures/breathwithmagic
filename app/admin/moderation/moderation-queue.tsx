"use client";

/**
 * Moderation Queue Client Component
 *
 * Interactive component for reviewing and acting on content reports.
 *
 * @see PRD Phase 6, Task 18: Content Moderation
 */

import { useState, useCallback } from "react";
import Image from "next/image";
import {
  Video,
  Headphones,
  FileText,
  User,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  type ReportReason,
  type ReportStatus,
  getReportReasonLabel,
  getReportStatusLabel,
  getReportStatusVariant,
} from "@/lib/validations/report";

// =============================================================================
// TYPES
// =============================================================================

interface Report {
  id: string;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
  content: {
    id: string;
    title: string;
    type: "video" | "audio" | "text";
    thumbnailUrl: string | null;
    status: string;
    description: string | null;
    creator: {
      id: string;
      handle: string;
      displayName: string;
      avatarUrl: string | null;
    };
  };
  reporter: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface ModerationQueueProps {
  initialReports: Report[];
  counts: {
    pending: number;
    reviewed: number;
    actionTaken: number;
    dismissed: number;
    total: number;
  };
}

// =============================================================================
// CONSTANTS
// =============================================================================

const CONTENT_TYPE_ICONS = {
  video: Video,
  audio: Headphones,
  text: FileText,
};

// =============================================================================
// COMPONENT
// =============================================================================

export function ModerationQueue({
  initialReports,
  counts: initialCounts,
}: ModerationQueueProps) {
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [counts, setCounts] = useState(initialCounts);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "ALL">("ALL");
  const [reasonFilter, setReasonFilter] = useState<ReportReason | "ALL">("ALL");
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(initialReports.length === 20);

  // Filter reports based on selected filters
  const filteredReports = reports.filter((report) => {
    if (statusFilter !== "ALL" && report.status !== statusFilter) return false;
    if (reasonFilter !== "ALL" && report.reason !== reasonFilter) return false;
    return true;
  });

  // Load more reports
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (reasonFilter !== "ALL") params.set("reason", reasonFilter);
      if (cursor) params.set("cursor", cursor);

      const response = await fetch(`/api/admin/reports?${params}`);
      if (!response.ok) throw new Error("Failed to load reports");

      const data = await response.json();
      setReports((prev) => [...prev, ...data.items]);
      setCursor(data.nextCursor);
      setHasMore(!!data.nextCursor);
      setCounts(data.counts);
    } catch (error) {
      console.error("Error loading reports:", error);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, statusFilter, reasonFilter, cursor]);

  // Refresh with new filters
  const refreshReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (reasonFilter !== "ALL") params.set("reason", reasonFilter);

      const response = await fetch(`/api/admin/reports?${params}`);
      if (!response.ok) throw new Error("Failed to load reports");

      const data = await response.json();
      setReports(data.items);
      setCursor(data.nextCursor);
      setHasMore(!!data.nextCursor);
      setCounts(data.counts);
    } catch (error) {
      console.error("Error refreshing reports:", error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, reasonFilter]);

  // Update a report locally after action
  const updateReportLocally = (reportId: string, updates: Partial<Report>) => {
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, ...updates } : r))
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Pending"
          value={counts.pending}
          icon={Clock}
          variant="warning"
        />
        <StatCard
          label="Reviewed"
          value={counts.reviewed}
          icon={CheckCircle}
          variant="default"
        />
        <StatCard
          label="Action Taken"
          value={counts.actionTaken}
          icon={AlertTriangle}
          variant="destructive"
        />
        <StatCard
          label="Dismissed"
          value={counts.dismissed}
          icon={XCircle}
          variant="muted"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v as ReportStatus | "ALL");
            setTimeout(refreshReports, 0);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="REVIEWED">Reviewed</SelectItem>
            <SelectItem value="ACTION_TAKEN">Action Taken</SelectItem>
            <SelectItem value="DISMISSED">Dismissed</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={reasonFilter}
          onValueChange={(v) => {
            setReasonFilter(v as ReportReason | "ALL");
            setTimeout(refreshReports, 0);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by reason" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All reasons</SelectItem>
            <SelectItem value="INAPPROPRIATE">Inappropriate</SelectItem>
            <SelectItem value="SPAM">Spam</SelectItem>
            <SelectItem value="HARASSMENT">Harassment</SelectItem>
            <SelectItem value="COPYRIGHT">Copyright</SelectItem>
            <SelectItem value="MISLEADING">Misleading</SelectItem>
            <SelectItem value="OTHER">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {filteredReports.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {loading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                <p>Loading reports...</p>
              </div>
            ) : (
              <p>No reports found matching your filters.</p>
            )}
          </div>
        ) : (
          filteredReports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onUpdate={updateReportLocally}
              onRefresh={refreshReports}
            />
          ))
        )}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={loading}
            className="min-w-[120px]"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading...
              </>
            ) : (
              <>
                Load More
                <ChevronDown className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function StatCard({
  label,
  value,
  icon: Icon,
  variant,
}: {
  label: string;
  value: number;
  icon: typeof Clock;
  variant: "default" | "warning" | "destructive" | "muted";
}) {
  const variantClasses = {
    default: "text-primary",
    warning: "text-muted-foreground",
    destructive: "text-destructive",
    muted: "text-muted-foreground",
  };

  return (
    <div className="bg-card border rounded-lg p-4">
      <div className="flex items-center gap-2">
        <Icon className={cn("h-5 w-5", variantClasses[variant])} />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </div>
  );
}

function ReportCard({
  report,
  onUpdate,
  onRefresh,
}: {
  report: Report;
  onUpdate: (reportId: string, updates: Partial<Report>) => void;
  onRefresh: () => void;
}) {
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionType, setActionType] = useState<
    "archive" | "delete" | "warn_creator" | null
  >(null);
  const [actionReason, setActionReason] = useState("");

  const ContentIcon = CONTENT_TYPE_ICONS[report.content.type];

  const handleDismiss = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: report.id,
          status: "DISMISSED",
          reviewNotes: "Report dismissed after review",
        }),
      });

      if (response.ok) {
        onUpdate(report.id, { status: "DISMISSED" });
        onRefresh();
      }
    } catch (error) {
      console.error("Error dismissing report:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTakeAction = async () => {
    if (!actionType || !actionReason.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/admin/content/${report.content.id}/action`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: actionType,
            reason: actionReason,
            notifyCreator: true,
          }),
        }
      );

      if (response.ok) {
        onUpdate(report.id, { status: "ACTION_TAKEN" });
        setActionDialogOpen(false);
        setActionType(null);
        setActionReason("");
        onRefresh();
      }
    } catch (error) {
      console.error("Error taking action:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-card border rounded-lg p-4">
      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
        {/* Content Preview */}
        <div className="flex gap-3 flex-1 min-w-0">
          {/* Thumbnail */}
          <div className="shrink-0">
            {report.content.thumbnailUrl ? (
              <Image
                src={report.content.thumbnailUrl}
                alt=""
                width={80}
                height={80}
                className="w-20 h-20 rounded-lg object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center">
                <ContentIcon className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Content Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <h3 className="font-medium text-sm truncate">
                {report.content.title}
              </h3>
              <Badge variant={getReportStatusVariant(report.status)}>
                {getReportStatusLabel(report.status)}
              </Badge>
            </div>

            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <ContentIcon className="h-3 w-3" />
              <span className="capitalize">{report.content.type}</span>
              <span className="text-border">|</span>
              <span>by {report.content.creator.displayName}</span>
            </div>

            {/* Report Details */}
            <div className="mt-2 p-2 bg-muted/50 rounded-md">
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="outline" className="text-xs">
                  {getReportReasonLabel(report.reason)}
                </Badge>
                <span className="text-muted-foreground">
                  Reported {new Date(report.createdAt).toLocaleDateString()}
                </span>
              </div>
              {report.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  &quot;{report.description}&quot;
                </p>
              )}
            </div>

            {/* Reporter Info */}
            <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              <span>
                Reported by {report.reporter.name || report.reporter.email}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        {report.status === "PENDING" && (
          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDismiss}
              disabled={isSubmitting}
              className="min-h-[44px]"
            >
              Dismiss
            </Button>

            <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
              <DialogTrigger
                render={
                  <Button variant="destructive" size="sm" className="min-h-[44px]" />
                }
              >
                Take Action
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Take Moderation Action</DialogTitle>
                  <DialogDescription>
                    Choose an action to take on &quot;{report.content.title}
                    &quot;
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Action</label>
                    <div className="grid gap-2">
                      {(
                        [
                          {
                            value: "warn_creator",
                            label: "Warn Creator",
                            desc: "Send a warning notification",
                          },
                          {
                            value: "archive",
                            label: "Archive Content",
                            desc: "Hide content from public view",
                          },
                          {
                            value: "delete",
                            label: "Remove Content",
                            desc: "Permanently remove content",
                          },
                        ] as const
                      ).map((action) => (
                        <button
                          key={action.value}
                          onClick={() => setActionType(action.value)}
                          className={cn(
                            "text-left p-3 rounded-lg border transition-colors min-h-[44px]",
                            actionType === action.value
                              ? "border-primary bg-primary/5"
                              : "hover:border-primary/50"
                          )}
                        >
                          <div className="font-medium text-sm">
                            {action.label}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {action.desc}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Reason (required)
                    </label>
                    <Textarea
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      placeholder="Explain why this action is being taken..."
                      className="min-h-[80px]"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setActionDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleTakeAction}
                    disabled={!actionType || !actionReason.trim() || isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Taking Action...
                      </>
                    ) : (
                      "Confirm Action"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Review Notes (for reviewed reports) */}
        {report.status !== "PENDING" && report.reviewNotes && (
          <div className="text-xs text-muted-foreground shrink-0 max-w-xs">
            <p className="font-medium">Review notes:</p>
            <p className="line-clamp-2">{report.reviewNotes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
