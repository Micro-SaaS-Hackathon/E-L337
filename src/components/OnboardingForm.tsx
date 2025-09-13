"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/Button";

const FIELD_OPTIONS = [
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Mobile Developer",
  "DevOps Engineer",
  "UI/UX Designer",
  "Product Designer",
  "Data Scientist",
  "Machine Learning Engineer",
  "QA Engineer",
  "Product Manager",
  "Project Manager",
  "System Administrator",
  "Database Administrator",
  "Security Engineer",
  "Other",
];

export default function OnboardingForm() {
  const [fullName, setFullName] = useState("");
  const [field, setField] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !field) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("Authentication error. Please try again.");
        return;
      }

      // Update user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim(),
          field: field,
          onboarding_completed: true,
        },
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg m-auto">
      <div className="bg-card rounded-lg shadow-lg border border-input p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-gradient-to-tr from-primary to-accent rounded-full p-2 mb-2">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-1 text-center">
            Complete Your Profile
          </h2>
          <p className="text-muted-foreground text-center">
            Just a few more details to get started
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="fullName"
                className="block text-sm font-medium text-foreground mb-1"
              >
                Full Name <span className="text-destructive">*</span>
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 text-foreground"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label
                htmlFor="field"
                className="block text-sm font-medium text-foreground mb-1"
              >
                Professional Field <span className="text-destructive">*</span>
              </label>
              <select
                id="field"
                value={field}
                onChange={(e) => setField(e.target.value)}
                required
                className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 text-foreground"
              >
                <option value="">Select your field</option>
                {FIELD_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="mt-2 p-2 bg-destructive/10 border border-destructive/40 text-destructive rounded-md text-center text-sm">
              {error}
            </div>
          )}

          <div className="pt-2 flex justify-center">
            <Button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 font-semibold text-white bg-primary hover:bg-primary/90 shadow focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              size="lg"
            >
              {loading ? "Saving..." : "Complete Setup"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
