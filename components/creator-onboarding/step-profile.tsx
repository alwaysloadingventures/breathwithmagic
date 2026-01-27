"use client";

import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Camera, User, Loader2, X } from "lucide-react";

interface StepProfileProps {
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  onDisplayNameChange: (value: string) => void;
  onBioChange: (value: string) => void;
  onAvatarChange: (url: string | null) => void;
  onNext: () => void;
  onBack: () => void;
  isLoading?: boolean;
}

/**
 * Maximum avatar file size (2MB)
 */
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

/**
 * Allowed avatar file types
 */
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Step 2: Profile Setup
 *
 * Collects display name (required), bio (optional), and profile photo (optional).
 * Kept simple to reduce friction - users can complete profile later.
 */
export function StepProfile({
  displayName,
  bio,
  avatarUrl,
  onDisplayNameChange,
  onBioChange,
  onAvatarChange,
  onNext,
  onBack,
  isLoading = false,
}: StepProfileProps) {
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate display name
  const validateDisplayName = (value: string): boolean => {
    if (value.trim().length < 2) {
      setDisplayNameError("Display name must be at least 2 characters");
      return false;
    }
    if (value.length > 50) {
      setDisplayNameError("Display name must be no more than 50 characters");
      return false;
    }
    setDisplayNameError(null);
    return true;
  };

  const handleDisplayNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onDisplayNameChange(value);
    if (value.length >= 2) {
      validateDisplayName(value);
    } else {
      setDisplayNameError(null);
    }
  };

  const handleBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= 500) {
      onBioChange(value);
    }
  };

  const canProceed = displayName.trim().length >= 2 && displayName.length <= 50;

  // Get initials for avatar fallback
  const getInitials = (name: string): string => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  /**
   * Trigger file input click
   */
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  /**
   * Handle avatar file selection
   */
  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset error state
    setAvatarError(null);

    // Validate file type
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      setAvatarError("Please select a JPG, PNG, or WebP image");
      return;
    }

    // Validate file size
    if (file.size > MAX_AVATAR_SIZE) {
      setAvatarError("Image must be less than 2MB");
      return;
    }

    setIsUploadingAvatar(true);

    try {
      // Convert file to base64 data URL for localStorage storage
      // In production, this would upload to R2 and return a URL
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        onAvatarChange(dataUrl);
        setIsUploadingAvatar(false);
      };
      reader.onerror = () => {
        setAvatarError("Failed to read image file");
        setIsUploadingAvatar(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setAvatarError("Failed to upload image");
      setIsUploadingAvatar(false);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /**
   * Remove avatar
   */
  const handleRemoveAvatar = () => {
    onAvatarChange(null);
    setAvatarError(null);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">
          Set up your profile
        </h2>
        <p className="text-muted-foreground">
          Tell your subscribers a bit about yourself.
        </p>
      </div>

      <div className="space-y-6">
        {/* Avatar upload */}
        <div className="flex flex-col items-center justify-center">
          <div className="relative">
            <Avatar
              className={cn("size-24", isUploadingAvatar && "opacity-50")}
            >
              <AvatarImage
                src={avatarUrl || undefined}
                alt={displayName || "Profile"}
              />
              <AvatarFallback className="text-2xl">
                {displayName ? (
                  getInitials(displayName)
                ) : (
                  <User className="size-8" />
                )}
              </AvatarFallback>
            </Avatar>
            {isUploadingAvatar && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="size-6 animate-spin text-primary" />
              </div>
            )}
            {/* Camera button to trigger upload */}
            <button
              type="button"
              onClick={triggerFileInput}
              disabled={isUploadingAvatar}
              className="absolute -bottom-1 -right-1 rounded-full bg-primary p-1.5 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50"
              aria-label="Upload profile photo"
            >
              <Camera className="size-4 text-primary-foreground" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarUpload}
              aria-label="Select profile photo"
            />
          </div>
          {/* Avatar actions and help text */}
          <div className="mt-3 flex flex-col items-center gap-2">
            {avatarUrl ? (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
                Remove photo
              </button>
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                JPG, PNG, or WebP (max 2MB)
              </p>
            )}
            {avatarError && (
              <p className="text-sm text-destructive" role="alert">
                {avatarError}
              </p>
            )}
          </div>
        </div>

        {/* Display Name */}
        <div className="space-y-2">
          <Label htmlFor="displayName">
            Display name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="displayName"
            type="text"
            value={displayName}
            onChange={handleDisplayNameChange}
            placeholder="Your name or brand"
            className={cn(
              "h-12 text-base",
              displayNameError &&
                "border-destructive focus-visible:border-destructive",
            )}
            maxLength={50}
            aria-describedby="displayName-description displayName-error"
          />
          <div className="flex items-center justify-between">
            <p
              id="displayName-description"
              className="text-sm text-muted-foreground"
            >
              This is how you will appear to subscribers.
            </p>
            <span className="text-xs text-muted-foreground">
              {displayName.length}/50
            </span>
          </div>
          {displayNameError && (
            <p
              id="displayName-error"
              className="text-sm text-destructive"
              role="alert"
            >
              {displayNameError}
            </p>
          )}
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <Label htmlFor="bio">Bio (optional)</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={handleBioChange}
            placeholder="Share what makes your practice unique..."
            className="min-h-[120px] resize-none text-base"
            maxLength={500}
            aria-describedby="bio-description"
          />
          <div className="flex items-center justify-between">
            <p id="bio-description" className="text-sm text-muted-foreground">
              You can add this later in your settings.
            </p>
            <span className="text-xs text-muted-foreground">
              {bio.length}/500
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isLoading}
          className="h-12 flex-1 text-base"
        >
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={!canProceed || isLoading}
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
    </div>
  );
}
