"use client";

import { useState, useEffect } from "react";
import {
  X,
  Plus,
  Sparkles,
  Trash2,
  Loader2,
  CheckSquare,
  Square,
  User,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/Bagde";
import { createClientComponentClient } from "@/lib/supabase-browser";
import TaskTags from "@/components/TaskTags";

interface Subtask {
  id: string;
  title: string;
  description?: string;
  is_completed: boolean;
  position: number;
  created_at: string;
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
  status?: "todo" | "in-progress" | "completed";
  priority?: "low" | "medium" | "high" | "urgent";
  estimated_hours?: number;
  actual_hours?: number;
}

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
  tags?: string[];
}

interface TaskModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
}

export default function TaskModal({
  task,
  isOpen,
  onClose,
  onTaskUpdate,
}: TaskModalProps) {
  // Task edit state
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editTaskTitle, setEditTaskTitle] = useState(task.title);
  const [editTaskDescription, setEditTaskDescription] = useState(
    task.description || ""
  );
  // Subtask edit state
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editSubtaskTitle, setEditSubtaskTitle] = useState("");
  const [editSubtaskDescription, setEditSubtaskDescription] = useState("");
  const [editSubtaskDeadline, setEditSubtaskDeadline] = useState("");
  const [editSubtaskAssignedTo, setEditSubtaskAssignedTo] = useState("");
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [isLoadingSubtasks, setIsLoadingSubtasks] = useState(false);
  const [isGeneratingSubtasks, setIsGeneratingSubtasks] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newSubtaskDescription, setNewSubtaskDescription] = useState("");
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  const supabase = createClientComponentClient();

  useEffect(() => {
    if (isOpen) {
      loadTeamMembers();
      loadSubtasks();
    }
  }, [isOpen, task.id]);

  const loadSubtasks = async () => {
    setIsLoadingSubtasks(true);
    try {
      const session = await supabase.auth.getSession();
      if (!session?.data?.session) return;

      const response = await fetch(`/api/subtasks?task_id=${task.id}`, {
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSubtasks(data.subtasks || []);
      }
    } catch (error) {
      console.error("Error loading subtasks:", error);
    } finally {
      setIsLoadingSubtasks(false);
    }
  };

  const loadTeamMembers = async () => {
    try {
      const session = await supabase.auth.getSession();
      if (!session?.data?.session) return;

      // Get team members by first getting all tasks and finding our task's team_id
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('team_id')
        .eq('id', task.id)
        .single();

      if (tasksError) {
        console.error("Error getting task team_id:", tasksError);
        return;
      }

      if (tasksData?.team_id) {
        const membersResponse = await fetch(`/api/team-members?team_id=${tasksData.team_id}`, {
          headers: {
            Authorization: `Bearer ${session.data.session.access_token}`,
          },
        });

        if (membersResponse.ok) {
          const membersData = await membersResponse.json();
          setTeamMembers(membersData.members || []);
        }
      }
    } catch (error) {
      console.error("Error loading team members:", error);
    }
  };

  const generateSubtasks = async () => {
    setIsGeneratingSubtasks(true);
    try {
      const session = await supabase.auth.getSession();
      if (!session?.data?.session) return;

      const response = await fetch("/api/generate-subtasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
        body: JSON.stringify({
          task_id: task.id,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSubtasks(data.subtasks || []);
      }
    } catch (error) {
      console.error("Error generating subtasks:", error);
    } finally {
      setIsGeneratingSubtasks(false);
    }
  };

  const addSubtask = async () => {
    if (!newSubtaskTitle.trim()) return;

    try {
      const session = await supabase.auth.getSession();
      if (!session?.data?.session) return;

      const response = await fetch("/api/subtasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
        body: JSON.stringify({
          task_id: task.id,
          title: newSubtaskTitle,
          description: newSubtaskDescription,
          position: subtasks.length,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSubtasks([...subtasks, data.subtask]);
        setNewSubtaskTitle("");
        setNewSubtaskDescription("");
        setIsAddingSubtask(false);
      }
    } catch (error) {
      console.error("Error adding subtask:", error);
    }
  };

  const toggleSubtask = async (subtaskId: string, isCompleted: boolean) => {
    try {
      const session = await supabase.auth.getSession();
      if (!session?.data?.session) return;

      const response = await fetch("/api/subtasks", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
        body: JSON.stringify({
          id: subtaskId,
          is_completed: isCompleted,
        }),
      });

      if (response.ok) {
        setSubtasks(
          subtasks.map((st) =>
            st.id === subtaskId ? { ...st, is_completed: isCompleted } : st
          )
        );
      }
    } catch (error) {
      console.error("Error updating subtask:", error);
    }
  };

  const deleteSubtask = async (subtaskId: string) => {
    try {
      const session = await supabase.auth.getSession();
      if (!session?.data?.session) return;

      const response = await fetch(`/api/subtasks?id=${subtaskId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      });

      if (response.ok) {
        setSubtasks(subtasks.filter((st) => st.id !== subtaskId));
      }
    } catch (error) {
      console.error("Error deleting subtask:", error);
    }
  };

  const getCompletionPercentage = () => {
    if (subtasks.length === 0) return 0;
    const completedCount = subtasks.filter((st) => st.is_completed).length;
    return Math.round((completedCount / subtasks.length) * 100);
  };

  const allSubtasksCompleted = () => {
    return subtasks.length > 0 && subtasks.every((st) => st.is_completed);
  };

  const statusColors = {
    todo: "bg-muted text-muted-foreground",
    "in-progress": "bg-primary/10 text-primary",
    completed: "bg-success/10 text-success",
  };

  // Save edited task
  const saveTaskEdit = async () => {
    if (!editTaskTitle.trim()) return;
    try {
      const session = await supabase.auth.getSession();
      if (!session?.data?.session) return;
      const response = await fetch("/api/tasks", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
        body: JSON.stringify({
          id: task.id,
          title: editTaskTitle,
          description: editTaskDescription,
        }),
      });
      if (response.ok) {
        onTaskUpdate(task.id, {
          title: editTaskTitle,
          description: editTaskDescription,
        });
        setIsEditingTask(false);
      }
    } catch (error) {
      console.error("Error saving task edit:", error);
    }
  };

  // Start editing subtask
  const startEditSubtask = (subtask: Subtask) => {
    setEditingSubtaskId(subtask.id);
    setEditSubtaskTitle(subtask.title);
    setEditSubtaskDescription(subtask.description || "");
    setEditSubtaskDeadline(subtask.deadline ? subtask.deadline.split('T')[0] : "");
    setEditSubtaskAssignedTo(subtask.assigned_to || "");
  };

  // Save edited subtask
  const saveSubtaskEdit = async (subtaskId: string) => {
    if (!editSubtaskTitle.trim()) return;
    try {
      const session = await supabase.auth.getSession();
      if (!session?.data?.session) return;
      const response = await fetch("/api/subtasks", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
        body: JSON.stringify({
          id: subtaskId,
          title: editSubtaskTitle,
          description: editSubtaskDescription,
          deadline: editSubtaskDeadline || null,
          assigned_to: editSubtaskAssignedTo || null,
        }),
      });
      if (response.ok) {
        setSubtasks(
          subtasks.map((st) =>
            st.id === subtaskId
              ? {
                  ...st,
                  title: editSubtaskTitle,
                  description: editSubtaskDescription,
                  deadline: editSubtaskDeadline || undefined,
                  assigned_to: editSubtaskAssignedTo || undefined,
                  assigned_user: editSubtaskAssignedTo 
                    ? (() => {
                        const member = teamMembers.find(m => m.id === editSubtaskAssignedTo);
                        return member ? {
                          id: member.id,
                          email: member.email,
                          raw_user_meta_data: {
                            full_name: member.name,
                            field: member.field,
                          }
                        } : undefined;
                      })()
                    : undefined,
                }
              : st
          )
        );
        setEditingSubtaskId(null);
      }
    } catch (error) {
      console.error("Error saving subtask edit:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto border border-input custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-input bg-background rounded-t-xl">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {isEditingTask ? (
                <input
                  className="text-xl font-semibold text-foreground bg-background border border-input rounded px-2 py-1 w-full"
                  value={editTaskTitle}
                  onChange={(e) => setEditTaskTitle(e.target.value)}
                />
              ) : (
                <h2 className="text-xl font-semibold text-foreground">
                  {task.title}
                </h2>
              )}
            </div>
                {isEditingTask ? (
              <div className="mt-2 flex gap-2">
                <textarea
                  className="text-sm text-foreground bg-background border border-input rounded px-2 py-1 w-full"
                  value={editTaskDescription}
                  onChange={(e) => setEditTaskDescription(e.target.value)}
                  rows={2}
                />
                <Button
                  variant="default"
                  size="sm"
                  onClick={saveTaskEdit}
                  disabled={!editTaskTitle.trim()}
                >
                  Save
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingTask(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : null}
            <div className="flex items-center gap-2 mt-2">
              <Badge
                className={`px-2 py-1 text-xs font-medium rounded-full ${
                  statusColors[task.status]
                }`}
              >
                {task.status === "todo"
                  ? "To Do"
                  : task.status === "in-progress"
                  ? "In Progress"
                  : "Completed"}
              </Badge>
              {subtasks.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {getCompletionPercentage()}% complete
                </span>
              )}
            </div>
        
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-6 w-6" />
          </Button>
        </div>
        {/* Content */}
        <div className="p-6 bg-background rounded-b-xl">
          {/* Description */}
          {task.description && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Description
              </h3>
              <p className="text-foreground/80 text-sm leading-relaxed">
                {task.description}
              </p>
            </div>
          )}

          {/* Task Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Categories
              </h3>
              <TaskTags tags={task.tags} size="md" />
            </div>
          )}

          {/* Task Details */}
          <div className="mb-6 grid grid-cols-2 gap-4">
            {task.assigned_user && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Assigned to
                </h3>
                <p className="text-sm text-muted-foreground">
                  {task.assigned_user.raw_user_meta_data?.full_name ||
                    task.assigned_user.email?.split("@")[0] ||
                    "Unknown"}
                </p>
              </div>
            )}

            {task.deadline && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Deadline
                </h3>
                <p className="text-sm text-muted-foreground">
                  {new Date(task.deadline).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {subtasks.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Progress
                </h3>
                <span className="text-sm text-muted-foreground">
                  {getCompletionPercentage()}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getCompletionPercentage()}%` }}
                />
              </div>
            </div>
          )}

          {/* Subtasks */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-foreground">Subtasks</h3>
              <div className="flex gap-2 items-center">
                {/* Edit Task Button (moved here) */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="mr-1"
                  onClick={() => setIsEditingTask(true)}
                  title="Edit Title/Description"
                  aria-label="Edit Title/Description"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                {/* Delete Task Button (Destructive Icon) */}
                <Button
                  onClick={async () => {
                    setIsDeletingTask(true);
                    try {
                      const session = await supabase.auth.getSession();
                      if (!session?.data?.session) return;
                      const response = await fetch(`/api/tasks?id=${task.id}`, {
                        method: "DELETE",
                        headers: {
                          Authorization: `Bearer ${session.data.session.access_token}`,
                        },
                      });
                      if (response.ok) {
                        onClose();
                      }
                    } catch (error) {
                      console.error("Error deleting task:", error);
                    } finally {
                      setIsDeletingTask(false);
                    }
                  }}
                  variant="destructive"
                  className="cursor-pointer"
                  size="icon"
                  title="Delete Task"
                  aria-label="Delete Task"
                  disabled={isDeletingTask}
                >
                  {isDeletingTask ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                </Button>
                {subtasks.length === 0 && (
                  <Button
                    onClick={generateSubtasks}
                    disabled={isGeneratingSubtasks}
                    variant="secondary"
                    className="flex items-center gap-2 px-3 py-1.5 text-sm"
                  >
                    {isGeneratingSubtasks ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {isGeneratingSubtasks ? "Generating..." : "AI Generate"}
                  </Button>
                )}
                <Button
                  onClick={() => setIsAddingSubtask(true)}
                  variant="default"
                  className="flex items-center gap-2 px-3 py-1.5 text-sm"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>
            </div>

            {isLoadingSubtasks ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-2">
                {subtasks.map((subtask) => (
                  <div
                    key={subtask.id}
                    className="flex items-start gap-3 p-3 border border-input rounded-lg bg-card hover:bg-accent/40 transition-colors shadow-sm"
                  >
                    <Button
                      onClick={() =>
                        toggleSubtask(subtask.id, !subtask.is_completed)
                      }
                      variant="ghost"
                      size="icon"
                      className={`mt-0.5 ${
                        subtask.is_completed
                          ? "text-success"
                          : "text-muted-foreground hover:text-primary"
                      }`}
                    >
                      {subtask.is_completed ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </Button>

                    <div className="flex-1">
                      {editingSubtaskId === subtask.id ? (
                        <div className="flex flex-col gap-2">
                          <input
                            className="font-medium text-sm text-foreground bg-background border border-input rounded px-2 py-1"
                            value={editSubtaskTitle}
                            onChange={(e) =>
                              setEditSubtaskTitle(e.target.value)
                            }
                            placeholder="Subtask title"
                          />
                          <textarea
                            className="text-xs text-muted-foreground bg-background border border-input rounded px-2 py-1"
                            value={editSubtaskDescription}
                            onChange={(e) =>
                              setEditSubtaskDescription(e.target.value)
                            }
                            placeholder="Description (optional)"
                            rows={2}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">
                                Deadline
                              </label>
                              <input
                                type="date"
                                className="text-xs bg-background border border-input rounded px-2 py-1 w-full"
                                value={editSubtaskDeadline}
                                onChange={(e) =>
                                  setEditSubtaskDeadline(e.target.value)
                                }
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">
                                Assigned to
                              </label>
                              <select
                                className="text-xs bg-background border border-input rounded px-2 py-1 w-full"
                                value={editSubtaskAssignedTo}
                                onChange={(e) =>
                                  setEditSubtaskAssignedTo(e.target.value)
                                }
                              >
                                <option value="">Unassigned</option>
                                {teamMembers.map((member) => (
                                  <option key={member.id} value={member.id}>
                                    {member.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-1">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => saveSubtaskEdit(subtask.id)}
                              disabled={!editSubtaskTitle.trim()}
                            >
                              Save
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingSubtaskId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <h4
                            className={`font-medium text-sm ${
                              subtask.is_completed
                                ? "line-through text-muted-foreground"
                                : "text-foreground"
                            }`}
                          >
                            {subtask.title}
                          </h4>
                          {subtask.description && (
                            <p
                              className={`text-xs mt-1 ${
                                subtask.is_completed
                                  ? "line-through text-muted-foreground"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {subtask.description}
                            </p>
                          )}
                          
                          {/* Assignment and deadline info */}
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            {subtask.assigned_user && (
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                <span>
                                  {subtask.assigned_user.raw_user_meta_data?.full_name ||
                                    subtask.assigned_user.email?.split("@")[0] ||
                                    "Unknown"}
                                </span>
                              </div>
                            )}
                            
                            {subtask.deadline && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>
                                  {new Date(subtask.deadline).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                              </div>
                            )}
                            
                            {subtask.priority && subtask.priority !== 'medium' && (
                              <div className="flex items-center gap-1">
                                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                  subtask.priority === 'high' || subtask.priority === 'urgent' 
                                    ? 'bg-red-100 text-red-700' 
                                    : subtask.priority === 'low'
                                    ? 'bg-gray-100 text-gray-700'
                                    : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {subtask.priority}
                                </span>
                              </div>
                            )}
                            
                            {subtask.status && subtask.status !== 'todo' && (
                              <div className="flex items-center gap-1">
                                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                  subtask.status === 'completed' 
                                    ? 'bg-green-100 text-green-700' 
                                    : subtask.status === 'in-progress'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {subtask.status}
                                </span>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      <Button
                        onClick={() => deleteSubtask(subtask.id)}
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => startEditSubtask(subtask)}
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-primary"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Add new subtask form */}
                {isAddingSubtask && (
                  <div className="border border-input rounded-lg p-3 bg-muted/40">
                    <input
                      type="text"
                      placeholder="Subtask title"
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      className="w-full mb-2 px-3 py-2 border border-input rounded-md focus:ring-2 focus:ring-primary/30 focus:border-primary/50 bg-background text-foreground"
                    />
                    <textarea
                      placeholder="Description (optional)"
                      value={newSubtaskDescription}
                      onChange={(e) => setNewSubtaskDescription(e.target.value)}
                      className="w-full mb-3 px-3 py-2 border border-input rounded-md focus:ring-2 focus:ring-primary/30 focus:border-primary/50 resize-none bg-background text-foreground"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={addSubtask}
                        disabled={!newSubtaskTitle.trim()}
                        variant="default"
                        className="px-3 py-1.5 text-sm"
                      >
                        Add
                      </Button>
                      <Button
                        onClick={() => {
                          setIsAddingSubtask(false);
                          setNewSubtaskTitle("");
                          setNewSubtaskDescription("");
                        }}
                        variant="outline"
                        className="px-3 py-1.5 text-sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {subtasks.length === 0 && !isAddingSubtask && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No subtasks yet. Add some to break down this task.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Warning for completed status */}
          {task.status !== "completed" &&
            subtasks.length > 0 &&
            !allSubtasksCompleted() && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-yellow-800">
                  Complete all subtasks before moving this task to "Completed".
                </p>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
