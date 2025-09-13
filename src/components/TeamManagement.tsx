"use client";

import { useState, useEffect, useCallback } from "react";
import { createClientComponentClient } from "@/lib/supabase-browser";
import { useAuth } from "@/lib/auth-provider";
import TeamPage from "@/components/TeamPage";
import { TechStack } from "@/types/techStack";
import AITechStackChat from "./AITechStackChat";
import { LucideCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Bagde";
import { ChartRadialLabel } from "./RadialChartStack";

interface Team {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  created_at: string;
  tech_stack?: Partial<TechStack>;
  role: "owner" | "admin" | "member";
  member_count: number;
}

interface TeamMembership {
  team_id: string;
  role: "owner" | "admin" | "member";
}

export default function TeamManagement() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [currentStep, setCurrentStep] = useState<"basic" | "tech-stack">(
    "basic"
  );
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [techStack, setTechStack] = useState<Partial<TechStack>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { user } = useAuth();
  const supabase = createClientComponentClient();

  const loadUserTeams = useCallback(async () => {
    try {
      setLoading(true);

      const { data: memberships, error: membershipError } = await supabase
        .from("team_members")
        .select("team_id, role")
        .eq("user_id", user?.id);

      if (membershipError) throw membershipError;

      if (!memberships || memberships.length === 0) {
        setTeams([]);
        return;
      }

      const teamIds = memberships.map((m: TeamMembership) => m.team_id);

      const { data: teamsData, error: teamsError } = await supabase
        .from("teams")
        .select("id, name, description, created_by, created_at, tech_stack")
        .in("id", teamIds);

      if (teamsError) throw teamsError;

      const teamsWithDetails = await Promise.all(
        (teamsData || []).map(async (team: any) => {
          const { count } = await supabase
            .from("team_members")
            .select("*", { count: "exact", head: true })
            .eq("team_id", team.id);

          const membership = memberships.find(
            (m: TeamMembership) => m.team_id === team.id
          );

          return {
            id: team.id,
            name: team.name,
            description: team.description || undefined,
            created_by: team.created_by,
            created_at: team.created_at,
            tech_stack: team.tech_stack || undefined,
            role: membership?.role || "member",
            member_count: count || 0,
          };
        })
      );

      setTeams(teamsWithDetails);
    } catch (error: any) {
      console.error("Error loading teams:", error);
      setError("Failed to load teams: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  }, [user?.id, supabase]);

  useEffect(() => {
    if (user) {
      loadUserTeams();
    }
  }, [user, loadUserTeams]);

  if (selectedTeam) {
    return (
      <TeamPage team={selectedTeam} onBack={() => setSelectedTeam(null)} />
    );
  }

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!teamName.trim()) {
      setError("Team name is required");
      return;
    }

    // Validate required tech stack fields (only frontend and backend required)
    if (currentStep === "tech-stack") {
      console.log("Current tech stack:", techStack);

      const hasBasicFrontend = techStack.frontend?.framework;
      const hasBasicBackend = techStack.backend?.language;

      console.log("Required fields validation:", {
        frontendFramework: techStack.frontend?.framework,
        backendLanguage: techStack.backend?.language,
      });

      if (!hasBasicFrontend || !hasBasicBackend) {
        setError(
          "Please select at least a frontend framework and backend language"
        );
        return;
      }
    }

    try {
      setError("");
      setSuccess("");

      // Get the session token for API authentication
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("No valid session found. Please log in again.");
      }

      // Create the team using the API route
      const response = await fetch("/api/teams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: teamName.trim(),
          description: teamDescription.trim() || null,
          tech_stack: currentStep === "tech-stack" ? techStack : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create team");
      }

      const { team } = await response.json();

      setSuccess("Team created successfully!");
      setTeamName("");
      setTeamDescription("");
      setTechStack({});
      setCurrentStep("basic");
      setIsCreating(false);

      // Reload teams to show the new team
      await loadUserTeams();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
    } catch (error: any) {
      console.error("Error creating team:", error);
      setError(error.message || "Failed to create team");
    }
  };

  const handleNextStep = () => {
    if (!teamName.trim()) {
      setError("Team name is required");
      return;
    }
    setError("");
    setCurrentStep("tech-stack");
  };

  const handlePreviousStep = () => {
    setCurrentStep("basic");
    setError("");
  };

  const resetForm = () => {
    setIsCreating(false);
    setCurrentStep("basic");
    setTeamName("");
    setTeamDescription("");
    setTechStack({});
    setError("");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-primary/10 text-primary";
      case "admin":
        return "bg-accent text-accent-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="bg-card p-6 rounded-lg shadow-md">
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Create Team Section */}
      <div className="bg-card p-3 px-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center py-2 ">
          <h2 className="text-xl font-semibold text-foreground">
            Team Management
          </h2>
          {!isCreating && (
            <Button onClick={() => setIsCreating(true)}>Create New Team</Button>
          )}
        </div>

        {isCreating && (
          <div className="pt-6">
            {/* Step Progress Indicator */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div
                  className={`flex items-center ${
                    currentStep === "basic" ? "text-primary" : "text-success"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      currentStep === "basic"
                        ? "bg-primary/10"
                        : "bg-success/10"
                    }`}
                  >
                    {currentStep === "basic" ? "1" : <LucideCheck size={14} />}
                  </div>
                  <span className="ml-2 font-medium">Basic Information</span>
                </div>
                <div
                  className={`h-0.5 flex-1 mx-4 ${
                    currentStep === "tech-stack" ? "bg-primary/20" : "bg-muted"
                  }`}
                ></div>
                <div
                  className={`flex items-center ${
                    currentStep === "tech-stack"
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      currentStep === "tech-stack"
                        ? "bg-primary/10"
                        : "bg-muted"
                    }`}
                  >
                    2
                  </div>
                  <span className="ml-2 font-medium">Tech Stack</span>
                </div>
              </div>
            </div>

            {currentStep === "basic" ? (
              <form onSubmit={handleNextStep} className="space-y-4">
                <div>
                  <label
                    htmlFor="teamName"
                    className="block text-sm font-medium text-foreground mb-1"
                  >
                    Team Name *
                  </label>
                  <input
                    type="text"
                    id="teamName"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
                    placeholder="Enter team name"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="teamDescription"
                    className="block text-sm font-medium text-foreground mb-1"
                  >
                    Description (Optional)
                  </label>
                  <textarea
                    id="teamDescription"
                    value={teamDescription}
                    onChange={(e) => setTeamDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
                    placeholder="Describe your team's purpose"
                  />
                </div>

                <div className="flex space-x-3">
                  <Button type="submit">Next: Choose Tech Stack →</Button>
                  <Button variant={"outline"} type="button" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Select Your Tech Stack
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Chat with our AI expert to get personalized tech stack
                    recommendations based on your project needs.
                  </p>
                </div>

                <AITechStackChat
                  onStackChange={setTechStack}
                  initialStack={techStack}
                />

                <div className="flex space-x-3 py-6 border-t">
                  <Button onClick={handleCreateTeam}>Create Team</Button>
                  <Button variant={"destructive"} onClick={handlePreviousStep}>
                    Back
                  </Button>
                  <Button variant={"ghost"} onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error and Success Messages */}
        {error && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/40 text-destructive rounded-md">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-md">
            {success}
          </div>
        )}
      </div>

      {/* Teams List Section */}
      <div className="bg-card p-3 px-6 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold text-foreground mb-4">
          Your Teams
        </h3>

        {teams.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>You haven't joined any teams yet.</p>
            <p className="text-sm mt-1">
              Create your first team using the button above!
            </p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-4 ">
            {teams.map((team) => (
              <TeamRow
                key={team.id}
                team={team}
                onClick={() => setSelectedTeam(team)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Module-scope helpers so nested components can reuse them
function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getRoleColor(role: string) {
  switch (role) {
    case "owner":
      return "bg-primary/10 text-primary";
    case "admin":
      return "bg-accent text-accent-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function TeamRow({ team, onClick }: { team: Team; onClick: () => void }) {
  // Placeholder for member avatars (replace with real avatars if available)
  const memberAvatars = Array.from({
    length: Math.min(team.member_count, 5),
  }).map((_, i) => (
    <div
      key={i}
      className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground border-2 border-background -ml-2 first:ml-0"
      style={{ zIndex: 10 - i }}
      title={`Member ${i + 1}`}
    >
      {String.fromCharCode(65 + i)}
    </div>
  ));

  return (
    <div
      className="rounded-xl max-w-none w-full border bg-card text-card-foreground shadow cursor-pointer transition-colors hover:bg-accent/40"
      onClick={onClick}
    >
      <div className="flex justify-between items-start p-4 pb-2">
        <div className="flex flex-col gap-1 items-start">
          <div className="flex items-center gap-3">
            <h4 className="font-semibold tracking-tight text-2xl truncate">
              {team.name}
            </h4>
            <Badge
              className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(
                team.role
              )}`}
            >
              {team.role}
            </Badge>
          </div>
          {team.description && (
            <span className="text-sm font-normal tracking-normal text-muted-foreground">
              {team.description}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2 text-xs mb-1 items-end">
          <div className="flex items-center gap-2">
            <div className="flex items-center ">
              <div className="flex -space-x-2">{memberAvatars}</div>
              <span className="ml-3 text-xs text-blue-400">
                {team.member_count} member{team.member_count !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          <span className="text-right">
            Created {formatDate(team.created_at)}
          </span>
        </div>
      </div>

      <div className="pb-4">
        {/* Tech Stack Summary as badges */}
        <ChartRadialLabel tech_stack={team.tech_stack} />
      </div>
    </div>
  );
}
