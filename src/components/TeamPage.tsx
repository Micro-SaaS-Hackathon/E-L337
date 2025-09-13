"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-provider";
import { createClientComponentClient } from "@/lib/supabase-browser";
import TeamMembers from "@/components/TeamMembers";
import {
  Target,
  Sparkles,
  Users,
  UserPlus,
  Calendar,
  BarChart3,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: "todo" | "in-progress" | "completed";
  assigned_to?: string;
  assigned_user?: {
    id: string;
    email: string;
    raw_user_meta_data?: {
      full_name?: string;
      field?: string;
    };
  };
  deadline?: string;
  created_at: string;
  position: number;
}

interface TeamMember {
  id: string;
  email: string;
  name: string;
  field: string;
  role: "owner" | "admin" | "member";
  joined_at: string;
}

interface Team {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  created_at: string;
  role: "owner" | "admin" | "member";
  member_count: number;
}

interface TeamPageProps {
  team: Team;
  onBack: () => void;
}

export default function TeamPage({ team, onBack }: TeamPageProps) {
  const [goalInput, setGoalInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showMemberInput, setShowMemberInput] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [generationStatus, setGenerationStatus] = useState("");
  const [generatingTasks, setGeneratingTasks] = useState<Task[]>([]);
  const [generationProgress, setGenerationProgress] = useState({
    current: 0,
    total: 0,
  });
  const [showSkeletonCard, setShowSkeletonCard] = useState(false);
  const [isAllocating, setIsAllocating] = useState(false);
  const [hasProcessedGoal, setHasProcessedGoal] = useState(false);

  const { user } = useAuth();
  const supabase = createClientComponentClient();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    loadTasks();
    loadMembers();
    checkForProcessedGoals();
  }, []);

  const checkForProcessedGoals = async () => {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) return;

      const { data, error } = await supabase
        .from("team_goals")
        .select("is_processed")
        .eq("team_id", team.id)
        .eq("is_processed", true)
        .limit(1);

      if (!error && data && data.length > 0) {
        setHasProcessedGoal(true);
        setShowMemberInput(true);
      }
    } catch (error) {
      console.error("Error checking processed goals:", error);
    }
  };

  const loadTasks = async () => {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) return;

      const response = await fetch(`/api/tasks?team_id=${team.id}`, {
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error("Error loading tasks:", error);
    } finally {
      setIsLoadingTasks(false);
    }
  };

  const loadMembers = async () => {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) return;

      const response = await fetch(`/api/team-members?team_id=${team.id}`, {
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
      }
    } catch (error) {
      console.error("Error loading members:", error);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const handleGoalGenerate = async () => {
    if (!goalInput.trim() || isGenerating) return;

    setIsGenerating(true);
    setGenerationStatus("");
    setGeneratingTasks([]);
    setGenerationProgress({ current: 0, total: 0 });
    setShowSkeletonCard(false);

    // Create a new AbortController for this request
    abortControllerRef.current = new AbortController();

    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) return;

      const response = await fetch("/api/generate-tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
        body: JSON.stringify({
          team_id: team.id,
          goal: goalInput,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.substring(6));

              if (
                data.status === "generating" ||
                data.status === "parsing" ||
                data.status === "creating"
              ) {
                setGenerationStatus(data.message);
                if (data.totalTasks) {
                  setGenerationProgress((prev) => ({
                    ...prev,
                    total: data.totalTasks,
                  }));
                }
              } else if (data.status === "creating_task") {
                setGenerationStatus(data.message);
                setGenerationProgress({
                  current: data.currentTask,
                  total: data.totalTasks,
                });
                setShowSkeletonCard(true);
              } else if (data.status === "task_created") {
                setShowSkeletonCard(false);
                // Add the new task with animation directly to the generating tasks
                const taskWithGenerating = { ...data.task, isGenerating: true };
                setGeneratingTasks((prev) => [...prev, taskWithGenerating]);
                setGenerationProgress({
                  current: data.currentTask,
                  total: data.totalTasks,
                });

                // Remove the generating flag after a short delay to allow animation
                setTimeout(() => {
                  setGeneratingTasks((prev) =>
                    prev.map((t) =>
                      t.id === data.task.id ? { ...t, isGenerating: false } : t
                    )
                  );
                }, 1000);
              } else if (data.status === "complete") {
                setGenerationStatus(data.message);
                // Clear generating tasks since they'll be in the main tasks array now
                setGeneratingTasks([]);
                setShowSkeletonCard(false);
                // Tasks have been created, reload them
                await loadTasks();
                setHasProcessedGoal(true);
                setShowMemberInput(true);
                setGoalInput("");
                break;
              } else if (data.status === "error") {
                console.error("Generation error:", data.error);
                setGenerationStatus(`Error: ${data.error}`);
                setGeneratingTasks([]);
                setShowSkeletonCard(false);
                break;
              }
            } catch (parseError) {
              console.error("Error parsing SSE data:", parseError);
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Error generating tasks:", error);
        setGenerationStatus("Error generating tasks. Please try again.");
      }
      setGeneratingTasks([]);
      setShowSkeletonCard(false);
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleAddMember = async (email: string) => {
    const session = await supabase.auth.getSession();
    if (!session.data.session) throw new Error("Not authenticated");

    const response = await fetch("/api/team-members", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.data.session.access_token}`,
      },
      body: JSON.stringify({
        team_id: team.id,
        email,
        role: "member",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to add member");
    }

    // Reload members
    await loadMembers();
  };

  const handleAllocateTasks = async () => {
    if (isAllocating) return;

    setIsAllocating(true);
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) return;

      const response = await fetch("/api/allocate-tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
        body: JSON.stringify({
          team_id: team.id,
        }),
      });

      if (response.ok) {
        // Reload tasks to show the assignments
        await loadTasks();
      } else {
        const errorData = await response.json();
        console.error("Allocation error:", errorData.error);
      }
    } catch (error) {
      console.error("Error allocating tasks:", error);
    } finally {
      setIsAllocating(false);
    }
  };

  const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) return;

      const response = await fetch("/api/tasks", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
        body: JSON.stringify({
          id: taskId,
          ...updates,
        }),
      });

      if (response.ok) {
        // Optimistically update the local state
        setTasks((prevTasks) =>
          prevTasks.map((task) =>
            task.id === taskId ? { ...task, ...updates } : task
          )
        );
      }
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const handleTaskStatusChange = async (
    taskId: string,
    newStatus: Task["status"]
  ) => {
    await handleTaskUpdate(taskId, { status: newStatus });
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px";
    }
  };

  const canAddMembers = team.role === "owner" || team.role === "admin";
  const unassignedTasksCount = tasks.filter((task) => !task.assigned_to).length;

  return (
    <div className="min-h-screen bg-background">
      <div className=" mx-auto  pt-0">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {team.name}
              </h1>
              {team.description && (
                <p className="text-muted-foreground mt-2">{team.description}</p>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {members.length} members
              </div>
              <div className="flex items-center gap-1">
                <BarChart3 className="h-4 w-4" />
                {tasks.length} tasks
              </div>
            </div>
          </div>
        </div>

        {/* Goal Input or Member Input */}
        <div className="mb-8 bg-card border rounded-lg shadow-md p-6">
          {!hasProcessedGoal ? (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Target className="h-6 w-6 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">
                  Team Goal
                </h2>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <textarea
                    ref={textareaRef}
                    value={goalInput}
                    onChange={(e) => {
                      setGoalInput(e.target.value);
                      adjustTextareaHeight();
                    }}
                    onFocus={adjustTextareaHeight}
                    placeholder="Describe your team's goal (e.g., 'I want to create a Notion-like app')..."
                    className="w-full px-4 py-3 border border-muted rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none min-h-[48px]"
                    disabled={isGenerating}
                  />
                </div>

                <Button
                  onClick={handleGoalGenerate}
                  disabled={!goalInput.trim() || isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate
                    </>
                  )}
                </Button>
              </div>

              {isGenerating && (
                <div className="mt-6">
                  {/* Status and Progress */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <span className="text-blue-900 font-medium">
                        Generating Tasks
                      </span>
                    </div>
                    <p className="text-blue-700 text-sm mb-3">
                      {generationStatus}
                    </p>
                    {generationProgress.total > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-primary">
                          <span>Progress</span>
                          <span>
                            {generationProgress.current} /{" "}
                            {generationProgress.total}
                          </span>
                        </div>
                        <div className="w-full bg-blue-100 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                            style={{
                              width: `${
                                (generationProgress.current /
                                  generationProgress.total) *
                                100
                              }%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    )}
                    <p className="text-primary text-xs mt-2">
                      ✨ Tasks are appearing in the board below as they're
                      created
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : showMemberInput ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <UserPlus className="h-6 w-6 text-primary" />
                  <h2 className="text-xl font-semibold text-foreground">
                    Add Team Members
                  </h2>
                </div>

                {unassignedTasksCount > 0 && members.length > 0 && (
                  <Button
                    onClick={handleAllocateTasks}
                    disabled={isAllocating}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {isAllocating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Allocating...
                      </>
                    ) : (
                      <>
                        <Calendar className="h-4 w-4" />
                        Allocate Tasks ({unassignedTasksCount})
                      </>
                    )}
                  </Button>
                )}
              </div>

              <p className="text-muted-foreground mb-4">
                Add team members by email to automatically assign tasks based on
                their roles and expertise.
              </p>
            </div>
          ) : null}
        </div>

        {/* Kanban Board */}
        <div className="mb-8 w-full">
          {isLoadingTasks ? (
<div>
    // Loading state for tasks
</div>
          ) : (
<div>
// Place for kanban board. 
</div>
          )}
        </div>

        {/* Calendar */}
        <div className="mb-8">
        </div>

        {/* Team Members */}
        <div className="pb-6">
          <TeamMembers
            members={members}
            onAddMember={handleAddMember}
            isLoading={isLoadingMembers}
            canAddMembers={canAddMembers}
          />
        </div>
      </div>
    </div>
  );
}
