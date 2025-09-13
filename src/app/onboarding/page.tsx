"use client";

import OnboardingForm from "@/components/OnboardingForm";
import { useAuth } from "@/lib/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function OnboardingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Not authenticated, redirect to home
        router.push("/");
      } else if (user.user_metadata?.onboarding_completed) {
        // Already completed onboarding, redirect to dashboard
        router.push("/dashboard");
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="bg-card min-h-screen flex items-center justify-center">
        <div className="text-xl text-foreground">Loading...</div>
      </div>
    );
  }

  // If user is not authenticated or already completed onboarding, don't show form
  if (!user || user.user_metadata?.onboarding_completed) {
    return null;
  }

  return (
    <div className="h-screen flex items-center justify-center">
      <OnboardingForm />
    </div>
  );
}
