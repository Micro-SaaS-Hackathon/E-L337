"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-provider";
import AuthForm from "@/components/AuthForm";
import { useRouter } from "next/navigation";

export default function JoinTeamPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-screen">
          Loading...
        </div>
      }
    >
      <JoinTeamPageContent />
    </Suspense>
  );
}

function JoinTeamPageContent() {
  const searchParams = useSearchParams();
  const teamId = searchParams.get("teamId");
  const { user, session, loading } = useAuth();
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const joinTeam = async () => {
      if (!user || !session?.access_token || !teamId) return;
      try {
        const res = await fetch("/api/team-members", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            team_id: teamId,
            email: user.email,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setJoined(true);
        } else {
          setError(data.error || "Failed to join team");
        }
      } catch (err: any) {
        setError(err.message || "Failed to join team");
      }
    };
    if (user && session?.access_token && teamId && !joined) {
      joinTeam();
    }
  }, [user, session, teamId, joined]);

  if (!teamId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Invalid Team Link</h1>
        <p className="text-lg">No team ID provided in the link.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Register or Sign In</h1>
        <AuthForm />
      </div>
    );
  }

  if (joined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Success!</h1>
        <p className="text-lg">
          You have joined team: <span className="font-mono">{teamId}</span>
        </p>
        <button
          className="mt-6 px-4 py-2 bg-blue-600 text-white rounded"
          onClick={() => router.push("/dashboard")}
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Joining Team...</h1>
      {error && <p className="text-red-600">{error}</p>}
    </div>
  );
}
