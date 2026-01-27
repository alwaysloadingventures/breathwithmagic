"use client";

import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Video,
  Headphones,
  FileText,
  Upload,
  CheckCircle,
  AlertCircle,
  X,
  Loader2,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { ContentType } from "@/lib/validations/content";

/**
 * Draft content state for onboarding
 * This is stored in localStorage and converted to a real content item
 * when the creator profile is activated
 */
export interface OnboardingContentDraft {
  type: ContentType;
  title: string;
  description: string;
  // For video/audio, we store a temporary file reference
  // For text, we store the actual content
  textContent?: string;
  // File metadata for media uploads (stored temporarily client-side)
  file?: {
    name: string;
    size: number;
    type: string;
    // Base64 data URL for preview (not recommended for large files)
    // In production, you'd upload to a temp location and store the URL
    dataUrl?: string;
  };
}

interface StepContentProps {
  draft: OnboardingContentDraft | null;
  onDraftChange: (draft: OnboardingContentDraft | null) => void;
  onNext: () => void;
  onBack: () => void;
  isLoading?: boolean;
}

/**
 * Content type option with icon
 */
const contentTypeOptions: Array<{
  value: ContentType;
  label: string;
  description: string;
  icon: typeof Video;
}> = [
  {
    value: "video",
    label: "Video",
    description: "Upload a practice video",
    icon: Video,
  },
  {
    value: "audio",
    label: "Audio",
    description: "Upload an audio session",
    icon: Headphones,
  },
  {
    value: "text",
    label: "Text Post",
    description: "Write a text article",
    icon: FileText,
  },
];

/**
 * Upload status types
 */
type UploadStatus = "idle" | "uploading" | "complete" | "error";

/**
 * Step 3: First Content Upload
 *
 * Allows creators to upload their first piece of content during onboarding.
 * This builds creator investment before the Stripe setup step.
 * Content is stored as a draft in localStorage until the profile is activated.
 */
export function StepContent({
  draft,
  onDraftChange,
  onNext,
  onBack,
  isLoading = false,
}: StepContentProps) {
  const [selectedType, setSelectedType] = useState<ContentType | null>(
    draft?.type || null,
  );
  const [title, setTitle] = useState(draft?.title || "");
  const [description, setDescription] = useState(draft?.description || "");
  const [textContent, setTextContent] = useState(draft?.textContent || "");
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>(
    draft?.file ? "complete" : "idle",
  );
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Handle content type selection
   */
  const handleTypeSelect = (type: ContentType) => {
    setSelectedType(type);
    // Reset file state when changing type
    setUploadStatus("idle");
    setUploadProgress(0);
    setUploadError(null);
    setSelectedFile(null);
  };

  /**
   * Handle file selection for video/audio
   */
  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type based on selected content type
    const validTypes =
      selectedType === "video"
        ? ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"]
        : [
            "audio/mpeg",
            "audio/mp3",
            "audio/wav",
            "audio/ogg",
            "audio/aac",
            "audio/m4a",
            "audio/x-m4a",
          ];

    if (!validTypes.includes(file.type)) {
      setUploadError(
        selectedType === "video"
          ? "Please select a valid video file (MP4, WebM, MOV, or AVI)"
          : "Please select a valid audio file (MP3, WAV, OGG, AAC, or M4A)",
      );
      setUploadStatus("error");
      return;
    }

    // Validate file size
    const maxSize =
      selectedType === "video"
        ? 4 * 1024 * 1024 * 1024 // 4GB for video
        : 100 * 1024 * 1024; // 100MB for audio

    if (file.size > maxSize) {
      setUploadError(
        selectedType === "video"
          ? "Video file must be less than 4GB"
          : "Audio file must be less than 100MB",
      );
      setUploadStatus("error");
      return;
    }

    setSelectedFile(file);
    setUploadError(null);
    setUploadStatus("uploading");

    // Simulate upload progress for the onboarding draft
    // In production, this would be a real upload to a temp location
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setUploadProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setUploadStatus("complete");
      }
    }, 100);
  };

  /**
   * Remove selected file
   */
  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadStatus("idle");
    setUploadProgress(0);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /**
   * Save draft and continue
   */
  const handleContinue = () => {
    if (selectedType) {
      const newDraft: OnboardingContentDraft = {
        type: selectedType,
        title: title.trim(),
        description: description.trim(),
        textContent: selectedType === "text" ? textContent : undefined,
        file:
          selectedFile && uploadStatus === "complete"
            ? {
                name: selectedFile.name,
                size: selectedFile.size,
                type: selectedFile.type,
              }
            : undefined,
      };
      onDraftChange(newDraft);
    }
    onNext();
  };

  /**
   * Skip this step
   */
  const handleSkip = () => {
    onDraftChange(null);
    onNext();
  };

  /**
   * Check if form is complete enough to continue
   */
  const canContinue =
    selectedType &&
    title.trim().length > 0 &&
    (selectedType === "text"
      ? textContent.trim().length > 0
      : uploadStatus === "complete");

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">
          Your First Practice
        </h2>
        <p className="text-muted-foreground">
          Share something with your future subscribers. This helps them see what
          makes your teaching unique.
        </p>
      </div>

      {/* Content Type Selection */}
      <div className="space-y-4">
        <Label className="text-base">Choose content type</Label>
        <div className="grid gap-4 sm:grid-cols-3">
          {contentTypeOptions.map((option) => {
            const isSelected = selectedType === option.value;
            const Icon = option.icon;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleTypeSelect(option.value)}
                className={cn(
                  "relative flex flex-col items-center gap-3 rounded-lg border-2 p-6 transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-primary/5",
                )}
                aria-pressed={isSelected}
              >
                {isSelected && (
                  <div className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-primary">
                    <CheckCircle className="size-3 text-primary-foreground" />
                  </div>
                )}

                <div
                  className={cn(
                    "flex size-12 items-center justify-center rounded-full",
                    isSelected ? "bg-primary/10" : "bg-muted",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-6",
                      isSelected ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                </div>

                <div className="text-center">
                  <div
                    className={cn(
                      "font-medium",
                      isSelected ? "text-primary" : "text-foreground",
                    )}
                  >
                    {option.label}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {option.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Details (shown after type selection) */}
      {selectedType && (
        <div className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-4 duration-300">
          {/* Upload area for video/audio */}
          {(selectedType === "video" || selectedType === "audio") && (
            <div className="space-y-2">
              <Label>
                Upload {selectedType === "video" ? "Video" : "Audio"}
              </Label>
              <div
                className={cn(
                  "relative flex min-h-[180px] flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors",
                  uploadStatus === "idle"
                    ? "border-border hover:border-primary/50 hover:bg-primary/5"
                    : "border-border",
                  uploadStatus === "error" &&
                    "border-destructive/50 bg-destructive/5",
                  uploadStatus === "complete" &&
                    "border-primary/50 bg-primary/5",
                )}
              >
                {uploadStatus === "idle" && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={
                        selectedType === "video"
                          ? "video/mp4,video/webm,video/quicktime,video/x-msvideo"
                          : "audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/aac,audio/m4a,audio/x-m4a"
                      }
                      onChange={handleFileSelect}
                      className="absolute inset-0 z-10 cursor-pointer opacity-0"
                      aria-label={`Select ${selectedType} file`}
                    />
                    <div className="flex flex-col items-center gap-3 text-center">
                      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                        <Upload className="size-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">
                          Click to upload or drag and drop
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {selectedType === "video"
                            ? "MP4, WebM, MOV, or AVI (max 4GB)"
                            : "MP3, WAV, OGG, AAC, or M4A (max 100MB)"}
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {uploadStatus === "uploading" && (
                  <div className="flex w-full flex-col items-center gap-4">
                    <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                      <Upload className="size-6 animate-pulse text-muted-foreground" />
                    </div>
                    {selectedFile && (
                      <p className="max-w-full truncate text-sm font-medium">
                        {selectedFile.name}
                      </p>
                    )}
                    <div className="w-full max-w-xs">
                      <Progress value={uploadProgress} className="h-2" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Preparing... {uploadProgress}%
                    </p>
                  </div>
                )}

                {uploadStatus === "complete" && selectedFile && (
                  <div className="flex w-full flex-col items-center gap-4">
                    <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                      <CheckCircle className="size-6 text-primary" />
                    </div>
                    <p className="max-w-full truncate text-sm font-medium">
                      {selectedFile.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Ready to upload when you go live
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveFile}
                      className="gap-2"
                    >
                      <X className="size-4" />
                      Remove
                    </Button>
                  </div>
                )}

                {uploadStatus === "error" && (
                  <div className="flex w-full flex-col items-center gap-4">
                    <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
                      <AlertCircle className="size-6 text-destructive" />
                    </div>
                    <p className="text-sm text-destructive">{uploadError}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveFile}
                    >
                      Try again
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Text editor for text posts */}
          {selectedType === "text" && (
            <div className="space-y-2">
              <Label htmlFor="textContent">Content</Label>
              <Textarea
                id="textContent"
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Write your post content..."
                className="min-h-[180px] resize-none text-base"
                maxLength={50000}
                aria-describedby="textContent-description"
              />
              <div className="flex items-center justify-between">
                <p
                  id="textContent-description"
                  className="text-sm text-muted-foreground"
                >
                  Use markdown for formatting: **bold**, *italic*, [link](url)
                </p>
                <span className="text-xs text-muted-foreground">
                  {textContent.length.toLocaleString()}/50,000
                </span>
              </div>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your content a title"
              className="h-12 text-base"
              maxLength={200}
              aria-describedby="title-description"
            />
            <div className="flex items-center justify-between">
              <p
                id="title-description"
                className="text-sm text-muted-foreground"
              >
                A clear, descriptive title helps subscribers find your content.
              </p>
              <span className="text-xs text-muted-foreground">
                {title.length}/200
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what subscribers will learn or experience..."
              className="min-h-[100px] resize-none text-base"
              maxLength={5000}
              aria-describedby="description-info"
            />
            <div className="flex items-center justify-between">
              <p
                id="description-info"
                className="text-sm text-muted-foreground"
              >
                You can add or edit this later.
              </p>
              <span className="text-xs text-muted-foreground">
                {description.length}/5,000
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex gap-3 pt-4">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isLoading}
          className="h-12 flex-1 text-base"
        >
          Back
        </Button>
        <Button
          variant="ghost"
          onClick={handleSkip}
          disabled={isLoading}
          className="h-12 text-base text-muted-foreground hover:text-foreground"
        >
          Skip for now
        </Button>
        <Button
          onClick={handleContinue}
          disabled={!canContinue || isLoading}
          className="h-12 flex-1 text-base"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Please wait...
            </>
          ) : (
            "Continue"
          )}
        </Button>
      </div>

      {/* Help text */}
      <p className="text-center text-sm text-muted-foreground">
        Your content will be saved as a draft and published when you activate
        your profile.
      </p>
    </div>
  );
}
