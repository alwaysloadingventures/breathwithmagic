"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  OnboardingProgress,
  StepHandle,
  StepProfile,
  StepContent,
  StepCategoryPricing,
  StepPreview,
  type OnboardingContentDraft,
} from "@/components/creator-onboarding";
import {
  type CreatorCategory,
  type SubscriptionPriceTier,
} from "@/lib/validations/creator";
import { Loader2 } from "lucide-react";

/**
 * Onboarding step definitions
 * Order follows PRD: Handle -> Profile -> First Content -> Category & Pricing -> Preview
 */
const STEPS = [
  { title: "Choose Handle", description: "Select your unique URL" },
  { title: "Profile Setup", description: "Tell subscribers about yourself" },
  { title: "First Content", description: "Share your first practice" },
  { title: "Category & Pricing", description: "Set your focus and price" },
  { title: "Preview & Confirm", description: "Review and go live" },
];

/**
 * Onboarding state type
 */
interface OnboardingState {
  handle: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  contentDraft: OnboardingContentDraft | null;
  category: CreatorCategory | null;
  subscriptionPrice: SubscriptionPriceTier;
  trialEnabled: boolean;
}

/**
 * Initial state for onboarding
 */
const initialState: OnboardingState = {
  handle: "",
  displayName: "",
  bio: "",
  avatarUrl: null,
  contentDraft: null,
  category: null,
  subscriptionPrice: "TIER_1000",
  trialEnabled: true,
};

/**
 * localStorage key for persisting onboarding draft
 * Made user-specific to prevent state bleeding between users
 */
const getStorageKey = (userId: string) => `creator-onboarding-draft-${userId}`;

/**
 * Creator Onboarding Page
 *
 * Multi-step wizard for setting up a creator profile.
 * Steps:
 * 1. Handle Selection
 * 2. Profile Setup (name, bio, photo)
 * 3. Category & Pricing
 * 4. Preview & Confirm
 */
export default function BecomeCreatorPage() {
  const router = useRouter();
  const { user, isLoaded: userLoaded } = useUser();

  const [currentStep, setCurrentStep] = useState(0);
  const [state, setState] = useState<OnboardingState>(initialState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false);

  /**
   * Load draft from localStorage on mount (before API check)
   * This ensures progress is restored even if user refreshes
   * Uses user-specific key to prevent state bleeding between users
   */
  useEffect(() => {
    if (!user?.id) return; // Wait for user to be loaded

    try {
      const storageKey = getStorageKey(user.id);
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.state) {
          setState(parsed.state);
        }
        if (typeof parsed.step === "number") {
          setCurrentStep(parsed.step);
        }
      }
    } catch {
      // Ignore parse errors, start fresh
    }
    setHasLoadedFromStorage(true);
  }, [user?.id]);

  /**
   * Save draft to localStorage on state/step change
   * Only save after initial load to avoid overwriting with initial state
   * Uses user-specific key to prevent state bleeding between users
   */
  useEffect(() => {
    if (hasLoadedFromStorage && user?.id) {
      const storageKey = getStorageKey(user.id);
      localStorage.setItem(
        storageKey,
        JSON.stringify({ state, step: currentStep }),
      );
    }
  }, [state, currentStep, hasLoadedFromStorage, user?.id]);

  /**
   * Check if user already has a creator profile
   */
  const checkExistingProfile = useCallback(async () => {
    try {
      const response = await fetch("/api/creator/onboarding");
      const data = await response.json();

      if (data.creatorProfile) {
        // If profile exists and is active, redirect to dashboard
        if (data.creatorProfile.status === "active") {
          router.push("/creator/dashboard");
          return;
        }

        // If profile exists but pending, pre-fill the form
        setState({
          handle: data.creatorProfile.handle || "",
          displayName: data.creatorProfile.displayName || "",
          bio: data.creatorProfile.bio || "",
          avatarUrl: data.creatorProfile.avatarUrl || null,
          contentDraft: null, // Content draft is local-only, not from API
          category: data.creatorProfile.category || null,
          subscriptionPrice:
            data.creatorProfile.subscriptionPrice || "TIER_1000",
          trialEnabled: data.creatorProfile.trialEnabled ?? true,
        });
      } else {
        // Pre-fill display name from Clerk user if available
        if (user?.fullName) {
          setState((prev) => ({ ...prev, displayName: user.fullName || "" }));
        }
      }
    } catch (error) {
      console.error("Error checking existing profile:", error);
    } finally {
      setIsLoading(false);
    }
  }, [router, user?.fullName]);

  useEffect(() => {
    if (userLoaded) {
      checkExistingProfile();
    }
  }, [userLoaded, checkExistingProfile]);

  /**
   * Navigate to next step
   * Uses isSubmitting to prevent rapid clicks during transition
   */
  const handleNext = async () => {
    if (currentStep < STEPS.length - 1 && !isSubmitting) {
      setIsSubmitting(true);
      setCurrentStep(currentStep + 1);
      // Scroll to top of page
      window.scrollTo({ top: 0, behavior: "smooth" });
      // Small delay to prevent rapid clicks
      await new Promise((resolve) => setTimeout(resolve, 300));
      setIsSubmitting(false);
    }
  };

  /**
   * Navigate to previous step
   * Uses isSubmitting to prevent rapid clicks during transition
   */
  const handleBack = async () => {
    if (currentStep > 0 && !isSubmitting) {
      setIsSubmitting(true);
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      // Small delay to prevent rapid clicks
      await new Promise((resolve) => setTimeout(resolve, 300));
      setIsSubmitting(false);
    }
  };

  /**
   * Update state handlers
   */
  const updateHandle = (handle: string) => {
    setState((prev) => ({ ...prev, handle }));
  };

  const updateDisplayName = (displayName: string) => {
    setState((prev) => ({ ...prev, displayName }));
  };

  const updateBio = (bio: string) => {
    setState((prev) => ({ ...prev, bio }));
  };

  const updateAvatarUrl = (avatarUrl: string | null) => {
    setState((prev) => ({ ...prev, avatarUrl }));
  };

  const updateCategory = (category: CreatorCategory) => {
    setState((prev) => ({ ...prev, category }));
  };

  const updateSubscriptionPrice = (
    subscriptionPrice: SubscriptionPriceTier,
  ) => {
    setState((prev) => ({ ...prev, subscriptionPrice }));
  };

  const updateTrialEnabled = (trialEnabled: boolean) => {
    setState((prev) => ({ ...prev, trialEnabled }));
  };

  const updateContentDraft = (contentDraft: OnboardingContentDraft | null) => {
    setState((prev) => ({ ...prev, contentDraft }));
  };

  /**
   * Activate the creator profile
   */
  const handleActivate = async () => {
    // First, save the complete onboarding data
    const saveResponse = await fetch("/api/creator/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        handle: state.handle,
        displayName: state.displayName,
        bio: state.bio || null,
        avatarUrl: state.avatarUrl,
        category: state.category,
        subscriptionPrice: state.subscriptionPrice,
        trialEnabled: state.trialEnabled,
      }),
    });

    if (!saveResponse.ok) {
      const data = await saveResponse.json();
      throw new Error(data.error || "Failed to save profile");
    }

    // Then activate the profile
    const activateResponse = await fetch("/api/creator/activate", {
      method: "POST",
    });

    if (!activateResponse.ok) {
      const data = await activateResponse.json();
      throw new Error(data.error || "Failed to activate profile");
    }

    // Clear localStorage draft after successful activation
    if (user?.id) {
      localStorage.removeItem(getStorageKey(user.id));
    }

    // Redirect to creator dashboard or Stripe setup
    // For now, redirect to a success page (will be creator dashboard later)
    router.push("/creator/dashboard");
  };

  /**
   * Redirect unauthenticated users to sign-in page
   * This runs after userLoaded is true but user is null
   */
  useEffect(() => {
    if (userLoaded && !user) {
      router.replace("/sign-in?redirect_url=/become-creator");
    }
  }, [userLoaded, user, router]);

  // Show loading state while checking auth
  if (!userLoaded) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Show redirecting state for unauthenticated users
  if (!user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Redirecting to sign in...</p>
      </div>
    );
  }

  // Show loading state while fetching existing profile data
  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Progress indicator */}
      <OnboardingProgress
        currentStep={currentStep}
        totalSteps={STEPS.length}
        steps={STEPS}
      />

      {/* Step content */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        {currentStep === 0 && (
          <StepHandle
            value={state.handle}
            onChange={updateHandle}
            onNext={handleNext}
            isLoading={isSubmitting}
          />
        )}

        {currentStep === 1 && (
          <StepProfile
            displayName={state.displayName}
            bio={state.bio}
            avatarUrl={state.avatarUrl}
            onDisplayNameChange={updateDisplayName}
            onBioChange={updateBio}
            onAvatarChange={updateAvatarUrl}
            onNext={handleNext}
            onBack={handleBack}
            isLoading={isSubmitting}
          />
        )}

        {currentStep === 2 && (
          <StepContent
            draft={state.contentDraft}
            onDraftChange={updateContentDraft}
            onNext={handleNext}
            onBack={handleBack}
            isLoading={isSubmitting}
          />
        )}

        {currentStep === 3 && (
          <StepCategoryPricing
            category={state.category}
            subscriptionPrice={state.subscriptionPrice}
            trialEnabled={state.trialEnabled}
            onCategoryChange={updateCategory}
            onPriceChange={updateSubscriptionPrice}
            onTrialChange={updateTrialEnabled}
            onNext={handleNext}
            onBack={handleBack}
            isLoading={isSubmitting}
          />
        )}

        {currentStep === 4 && state.category && (
          <StepPreview
            handle={state.handle}
            displayName={state.displayName}
            bio={state.bio}
            avatarUrl={state.avatarUrl}
            category={state.category}
            subscriptionPrice={state.subscriptionPrice}
            trialEnabled={state.trialEnabled}
            onBack={handleBack}
            onActivate={handleActivate}
          />
        )}
      </div>

      {/* Help text */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Need help?{" "}
          <a
            href="mailto:support@breathwithmagic.com"
            className="text-primary underline-offset-4 hover:underline"
          >
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}
