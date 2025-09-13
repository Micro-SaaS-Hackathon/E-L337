"use client";

import { useAuth } from "@/lib/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LogOut, LucideMoveLeft } from "lucide-react";
import Navbar from "@/components/navbar";
import { Button } from "@/components/ui/Button";

export default function Dashboard() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    } else if (!loading && user && !user.user_metadata?.onboarding_completed) {
      router.push("/onboarding");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <>
      <div className="mb-8">
        <Navbar user={user} />
      </div>
      <div className="min-h-screen p-8 bg-background">
        <div className="max-w-6xl mx-auto">
          {/* User Info Section */}
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <div className="bg-card p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-2 text-foreground">
                Profile Info
              </h2>
              <div className="space-y-2 text-muted-foreground">
                <p>
                  <strong>Name:</strong>{" "}
                  {user.user_metadata?.full_name || "Not provided"}
                </p>
                <p>
                  <strong>Email:</strong> {user.email}
                </p>
                <p>
                  <strong>Field:</strong>{" "}
                  {user.user_metadata?.field || "Not specified"}
                </p>

                <p>
                  <strong>Email Verified:</strong>{" "}
                  {user.email_confirmed_at ? "Yes" : "No"}
                </p>
              </div>
            </div>

            <div className="bg-card p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-2 text-foreground">
                Account Details
              </h2>
              <div className="space-y-2 text-muted-foreground">
                <p>
                  <strong>Created:</strong>{" "}
                  {new Date(user.created_at).toLocaleDateString()}
                </p>
                <p>
                  <strong>Last Sign In:</strong>{" "}
                  {user.last_sign_in_at
                    ? new Date(user.last_sign_in_at).toLocaleDateString()
                    : "Never"}
                </p>
                <p>
                  <strong>User ID:</strong> {user.id}
                </p>
              </div>
            </div>

            <div className="bg-card p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-2 text-foreground">
                Actions
              </h2>
              <div className="space-y-2 mt-4">
                <Button
                  onClick={() => router.push("/dashboard")}
                  className="w-full flex items-center gap-2 text-left px-3 py-2  border-border border  hover:bg-muted rounded"
                >
                  <LucideMoveLeft size={16} /> Back to Home
                </Button>
                <Button
                  onClick={handleSignOut}
                  className="flex items-center  gap-2 w-full text-left bg-background px-3 py-2 text-destructive hover:bg-muted border-border border   rounded"
                >
                  <LogOut size={16} /> Sign Out
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
