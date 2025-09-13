"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Calendar,
  Clock,
  User,
  CheckCircle2,
  Pencil,
  X,
  Loader2,
  Plus,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/Dialog";
import TaskModal from "@/components/TaskModal";
import TaskTags from "@/components/TaskTags";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: "todo" | "in-progress" | "completed";
  deadline?: string;
  created_at: string;
  position: number;
  tags?: string[];
  isGenerating?: boolean; // Add this for skeleton tasks
}

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

interface KanbanBoardProps {
  tasks: Task[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onTaskStatusChange: (taskId: string, newStatus: Task["status"]) => void;
  generatingTasks?: Task[]; // Add this for skeleton tasks
  showSkeletonCard?: boolean; // Add this to control skeleton visibility
  teamId?: string; // Needed for creating tasks
  onGenerateSubtasks?: (task: Task) => void;
}

interface TaskCardProps {
  task: Task;
  isDragging?: boolean;
  onTaskClick: (task: Task) => void;
  onEditClick?: (task: Task) => void;
  onGenerateSubtasks?: (task: Task) => void;
  isGeneratingSubtasks?: boolean;
}

const SkeletonTaskCard: React.FC = () => {
  return (
    <div className="bg-card p-3 rounded-lg shadow-sm border border-muted animate-pulse">
      <div className="space-y-3">
        {/* Title skeleton */}
        <div className="h-4 bg-muted rounded w-3/4"></div>

        {/* Description skeleton */}
        <div className="space-y-2">
          <div className="h-3 bg-muted rounded w-full"></div>
          <div className="h-3 bg-muted rounded w-2/3"></div>
        </div>

        {/* Tags skeleton */}
        <div className="flex gap-2">
          <div className="h-5 bg-muted rounded-full w-12"></div>
          <div className="h-5 bg-muted rounded-full w-16"></div>
        </div>

        {/* Footer skeleton */}
        <div className="flex justify-between items-center pt-2">
          <div className="h-3 bg-muted rounded w-20"></div>
          <div className="h-3 bg-muted rounded w-16"></div>
        </div>
      </div>
    </div>
  );
};

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  isDragging,
  onTaskClick,
  onEditClick,
  onGenerateSubtasks,
  isGeneratingSubtasks,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: task.id,
    disabled: task.isGenerating, // Disable drag for generating tasks
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging || isSortableDragging ? 0.5 : 1,
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const isOverdue = task.deadline && new Date(task.deadline) < new Date();

  const handleClick = (e: React.MouseEvent) => {
    // Only trigger click if not dragging and not generating
    if (!isDragging && !isSortableDragging && !task.isGenerating) {
      e.stopPropagation();
      onTaskClick(task);
    }
  };

  // If task is generating, show different styles
  const cardClasses = task.isGenerating
    ? "bg-background p-3 rounded-lg shadow-sm border border-blue-200 animate-in slide-in-from-bottom-2 duration-500"
    : "bg-background p-3 rounded-lg shadow-sm border border-muted hover:shadow-md transition-shadow cursor-pointer active:cursor-grabbing";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(task.isGenerating ? {} : { ...attributes, ...listeners })}
      onClick={handleClick}
      className={cardClasses}
    >
      {/* No edit button for In Progress tasks */}
      <h4 className="font-medium text-foreground mb-2 line-clamp-2">
        {task.title}
      </h4>

      {task.description && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
          {task.description}
        </p>
      )}

      {/* AI Generate Subtasks Button */}
      {!task.isGenerating && (
        <div className="mb-3">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onGenerateSubtasks?.(task);
            }}
            disabled={isGeneratingSubtasks}
            className="w-full text-xs"
          >
            {isGeneratingSubtasks ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                Adding & Allocating...
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3 mr-1" />
                AI Generate Subtasks
              </>
            )}
          </Button>
        </div>
      )}

      {/* Task Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="mb-3">
          <TaskTags tags={task.tags} size="sm" />
        </div>
      )}

      <div className="space-y-2">
        {task.deadline && (
          <div
            className={`flex items-center gap-2 text-xs ${
              isOverdue ? "text-red-500" : "text-muted-foreground"
            }`}
          >
            <Clock size={12} />
            <span>Due {formatDate(task.deadline)}</span>
            {isOverdue && (
              <span className="text-red-500 font-medium">OVERDUE</span>
            )}
          </div>
        )}

        {/* Show generating indicator */}
        {task.isGenerating && (
          <div className="flex items-center gap-2 text-xs text-blue-600">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span>Just created</span>
          </div>
        )}
      </div>
    </div>
  );
};

const Column: React.FC<{
  title: string;
  status: Task["status"];
  tasks: Task[];
  count: number;
  onTaskClick: (task: Task) => void;
  subtasksMap: Record<string, Subtask[]>;
  isGenerating?: boolean;
  showSkeletonCard?: boolean;
  headerActions?: React.ReactNode;
  onEditClick?: (task: Task) => void;
  onGenerateSubtasks?: (task: Task) => void;
  generatingSubtasksTaskId?: string | null;
}> = ({
  title,
  status,
  tasks,
  count,
  onTaskClick,
  subtasksMap,
  isGenerating,
  showSkeletonCard,
  headerActions,
  onEditClick,
  onGenerateSubtasks,
  generatingSubtasksTaskId,
}) => {
  const { setNodeRef } = useDroppable({
    id: `column-${status}`,
    data: {
      type: "column",
      status: status,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 bg-card border rounded-lg p-4`}
      data-status={status}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-foreground">{title}</h3>
        <div className="flex items-center gap-2">
          {headerActions}
          <span className="text-sm px-2 py-1 rounded-full bg-background text-foreground">
            {count}
          </span>
        </div>
      </div>

      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          className="space-y-3 min-h-[200px] px-1 max-h-[500px] h-full overflow-y-auto"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "#444 #222",
          }}
        >
          <style jsx>{`
            div::-webkit-scrollbar {
              width: 8px;
              background: #222;
            }
            div::-webkit-scrollbar-thumb {
              background: #444;
              border-radius: 6px;
            }
            div::-webkit-scrollbar-button {
              display: none;
              height: 0;
              width: 0;
            }
          `}</style>
          {/* Show skeleton card if generating and this is the todo column and we're actively creating a task */}
          {isGenerating && status === "todo" && showSkeletonCard && (
            <SkeletonTaskCard />
          )}

          {tasks.map((task) => {
            const subtasks = subtasksMap[task.id] || [];
            const completedSubtasks = subtasks.filter(
              (st) => st.is_completed
            ).length;

            return (
              <div key={task.id} className="relative">
                <TaskCard
                  task={task}
                  onTaskClick={onTaskClick}
                  onEditClick={onEditClick}
                  onGenerateSubtasks={onGenerateSubtasks}
                  isGeneratingSubtasks={generatingSubtasksTaskId === task.id}
                />
                {subtasks.length > 0 && (
                  <div className="absolute -bottom-1 -right-1 bg-blue-100 text-blue-800 text-xs px-1.5 py-0.5 rounded-full border border-blue-200">
                    {completedSubtasks}/{subtasks.length}
                  </div>
                )}
              </div>
            );
          })}
          {tasks.length === 0 && !isGenerating && (
            <div className="text-center text-muted-foreground text-sm py-8">
              No tasks yet
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
};

export default function KanbanBoard({
  tasks,
  onTaskUpdate,
  onTaskStatusChange,
  generatingTasks = [],
  showSkeletonCard = false,
  teamId,
  onGenerateSubtasks,
}: KanbanBoardProps) {
  // Track which column is being hovered during drag
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [subtasksMap, setSubtasksMap] = useState<Record<string, Subtask[]>>({});
  const [generatingSubtasksTaskId, setGeneratingSubtasksTaskId] = useState<
    string | null
  >(null);
  // Local created tasks (so UI updates without parent refetch)
  const [createdTasks, setCreatedTasks] = useState<Task[]>([]);
  // Add Task modal for To Do
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDeadline, setNewDeadline] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string>("");
  // New fields for role
  const roleOptions = [
    "frontend",
    "backend",
    "fullstack",
    "devops",
    "design",
    "qa",
    "product",
  ];
  const [newRole, setNewRole] = useState<string>("");
  const [teamMembers, setTeamMembers] = useState<
    Array<{
      id: string;
      name: string;
      email: string;
      role: string;
      field: string;
    }>
  >([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  // Edit state for In Progress tasks
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDeadline, setEditDeadline] = useState<string>("");
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string>("");
  // Fetch team members when Add Task modal opens
  useEffect(() => {
    const loadMembers = async () => {
      if (!showAddModal || !teamId) return;
      try {
        setLoadingMembers(true);
        const token = await getAuthToken();
        if (!token) return;
        const res = await fetch(`/api/team-members?team_id=${teamId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setTeamMembers(
            (data.members || []).map((m: any) => ({
              id: m.id,
              name: m.name,
              email: m.email,
              role: m.role,
              field: m.field,
            }))
          );
        }
      } catch (e) {
        console.error("Failed to load team members", e);
      } finally {
        setLoadingMembers(false);
      }
    };
    loadMembers();
  }, [showAddModal, teamId]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Combine regular tasks with generating tasks, avoiding duplicates
  const creatingIds = new Set(createdTasks.map((t) => t.id));
  const generatingTaskIds = new Set(generatingTasks.map((t) => t.id));
  const filteredTasks = tasks.filter(
    (t) => !generatingTaskIds.has(t.id) && !creatingIds.has(t.id)
  );
  const allTasks = [...filteredTasks, ...generatingTasks, ...createdTasks];
  const isGenerating = generatingTasks.length > 0;

  const handleTaskClick = (task: Task) => {
    // Don't open modal for generating tasks
    if (task.isGenerating) return;

    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
  };

  // Load subtasks for all tasks to check completion status
  const loadSubtasksForAllTasks = async () => {
    try {
      const supabase = (
        await import("@/lib/supabase-browser")
      ).createClientComponentClient();
      const session = await supabase.auth.getSession();
      if (!session?.data?.session) return;

      const subtasksData: Record<string, Subtask[]> = {};

      await Promise.all(
        tasks.map(async (task) => {
          try {
            const response = await fetch(`/api/subtasks?task_id=${task.id}`, {
              headers: {
                Authorization: `Bearer ${session.data.session!.access_token}`,
              },
            });

            if (response.ok) {
              const data = await response.json();
              subtasksData[task.id] = data.subtasks || [];
            }
          } catch (error) {
            console.error("Error loading subtasks for task:", task.id, error);
            subtasksData[task.id] = [];
          }
        })
      );

      setSubtasksMap(subtasksData);
    } catch (error) {
      console.error("Error loading subtasks:", error);
    }
  };

  useEffect(() => {
    if (tasks.length > 0) {
      loadSubtasksForAllTasks();
    }
  }, [tasks]);

  const canMoveToCompleted = (task: Task): boolean => {
    const subtasks = subtasksMap[task.id] || [];
    // If there are no subtasks, allow moving to completed
    if (subtasks.length === 0) return true;
    // If there are subtasks, all must be completed
    return subtasks.every((subtask) => subtask.is_completed);
  };

  const columns = [
    { title: "To Do", status: "todo" as const },
    { title: "In Progress", status: "in-progress" as const },
    { title: "Completed", status: "completed" as const },
  ];

  const getTasksByStatus = (status: Task["status"]) => {
    return allTasks
      .filter((task) => task.status === status)
      .sort((a, b) => a.position - b.position);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = allTasks.find((t) => t.id === event.active.id);
    if (task && !task.isGenerating) {
      setActiveTask(task);
    }
    setHoveredColumn(null);
  };

  const handleDragOver = (event: any) => {
    // event.over?.data?.current?.type === "column" and status
    if (
      event.over &&
      event.over.data &&
      event.over.data.current &&
      event.over.data.current.type === "column"
    ) {
      setHoveredColumn(event.over.data.current.status);
    } else {
      setHoveredColumn(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    setHoveredColumn(null);

    if (!over) return;

    const activeTaskId = active.id as string;
    const activeTask = allTasks.find((t) => t.id === activeTaskId);

    if (!activeTask || activeTask.isGenerating) return;

    // Handle dropping over different columns
    const overData = over.data.current;
    let newStatus = activeTask.status;
    let newPosition = activeTask.position;

    // Check if dropping over a column
    if (overData && overData.type === "column") {
      const columnStatus = overData.status as Task["status"];
      if (columnStatus !== activeTask.status) {
        // Check if can move to completed
        if (columnStatus === "completed" && !canMoveToCompleted(activeTask)) {
          console.warn(
            "Cannot move to completed: not all subtasks are completed"
          );
          return;
        }

        newStatus = columnStatus;
        // When moving to a new column, put at the end
        const tasksInNewColumn = getTasksByStatus(columnStatus);
        newPosition = tasksInNewColumn.length;
      }
    }
    // Handle dropping over another task
    else {
      const overTask = tasks.find((t) => t.id === over.id);
      if (overTask && overTask.status === activeTask.status) {
        // Reordering within the same column
        const tasksInColumn = getTasksByStatus(activeTask.status);
        const oldIndex = tasksInColumn.findIndex((t) => t.id === activeTaskId);
        const newIndex = tasksInColumn.findIndex((t) => t.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          newPosition = newIndex;
        }
      }
    }

    // Update task if status or position changed
    if (newStatus !== activeTask.status) {
      onTaskStatusChange(activeTaskId, newStatus);
    } else if (newPosition !== activeTask.position) {
      onTaskUpdate(activeTaskId, { position: newPosition });
    }
  };

  // Helpers: auth token
  const getAuthToken = async (): Promise<string | null> => {
    try {
      const supabase = (
        await import("@/lib/supabase-browser")
      ).createClientComponentClient();
      const session = await supabase.auth.getSession();
      return session?.data?.session?.access_token || null;
    } catch (e) {
      console.error("Failed to get auth token", e);
      return null;
    }
  };

  // Create Task in To Do via modal
  const createTodoTask = async () => {
    if (!teamId) {
      setCreateError("Missing team context");
      return;
    }
    if (!newTitle.trim()) return;
    setCreating(true);
    setCreateError("");
    try {
      const token = await getAuthToken();
      if (!token) throw new Error("No auth token");
      // Compose description with role tag if provided (non-destructive augmentation)
      const finalDescription = newDescription.trim();
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          team_id: teamId,
          title: newTitle.trim(),
          description: finalDescription || null,
          status: "todo",
          deadline: newDeadline || null,
        }),
      });
      if (!res.ok) throw new Error("Create failed");
      const data = await res.json();
      const task: Task = {
        id: data.task.id,
        title: data.task.title,
        description: data.task.description || undefined,
        status: data.task.status,
        deadline: data.task.deadline || undefined,
        created_at: data.task.created_at,
        position: getTasksByStatus("todo").length,
        tags: newRole ? [newRole] : [],
      };
      setCreatedTasks((prev) => [...prev, task]);
      setShowAddModal(false);
      setNewTitle("");
      setNewDescription("");
      setNewDeadline("");
      setNewRole("");
    } catch (e: any) {
      setCreateError(e?.message || "Failed to create");
    } finally {
      setCreating(false);
    }
  };

  // Edit existing In Progress task
  const startEditTask = (task: Task) => {
    if (task.status !== "in-progress") return;
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditDescription(task.description || "");
    setEditDeadline(task.deadline || "");
    setUpdateError("");
  };

  const cancelEdit = () => {
    setEditingTaskId(null);
    setUpdateError("");
  };

  const saveEdit = async () => {
    if (!editingTaskId) return;
    setUpdating(true);
    setUpdateError("");
    try {
      const token = await getAuthToken();
      if (!token) throw new Error("No auth token");
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: editingTaskId,
          title: editTitle,
          description: editDescription,
          deadline: editDeadline || null,
        }),
      });
      if (!res.ok) throw new Error("Update failed");
      onTaskUpdate(editingTaskId, {
        title: editTitle,
        description: editDescription,
        deadline: editDeadline || undefined,
      });
      setCreatedTasks((prev) =>
        prev.map((t) =>
          t.id === editingTaskId
            ? {
                ...t,
                title: editTitle,
                description: editDescription || undefined,
                deadline: editDeadline || undefined,
              }
            : t
        )
      );
      setEditingTaskId(null);
    } catch (e: any) {
      setUpdateError(e?.message || "Failed to update");
    } finally {
      setUpdating(false);
    }
  };
  return (
    <div className="w-full">
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
      >
        <div className="flex gap-6 overflow-x-auto pb-4">
          {columns.map((column) => {
            const columnTasks = getTasksByStatus(column.status);
            const showDropSkeleton =
              activeTask &&
              hoveredColumn === column.status &&
              activeTask.status !== column.status;
            return (
              <div key={column.status} className="min-w-[300px]">
                <Column
                  title={column.title}
                  status={column.status}
                  tasks={columnTasks}
                  count={columnTasks.filter((t) => !t.isGenerating).length}
                  onTaskClick={handleTaskClick}
                  subtasksMap={subtasksMap}
                  isGenerating={isGenerating}
                  showSkeletonCard={showSkeletonCard}
                  onGenerateSubtasks={onGenerateSubtasks}
                  generatingSubtasksTaskId={generatingSubtasksTaskId}
                  headerActions={
                    column.status === "todo" ? (
                      <Dialog
                        open={showAddModal}
                        onOpenChange={setShowAddModal}
                      >
                        <DialogTrigger asChild>
                          <Button size="sm" variant="secondary">
                            <Plus className="h-4 w-4 mr-1" /> Add Task
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[520px]">
                          <DialogHeader>
                            <DialogTitle>Create Task</DialogTitle>
                            <DialogDescription>
                              Add a new task to the To Do column.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-3 py-2">
                            <div>
                              <label className="text-sm text-muted-foreground">
                                Title
                              </label>
                              <input
                                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                                placeholder="Short descriptive title"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="text-sm text-muted-foreground">
                                Description
                              </label>
                              <textarea
                                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                                rows={3}
                                placeholder="Optional details"
                                value={newDescription}
                                onChange={(e) =>
                                  setNewDescription(e.target.value)
                                }
                              />
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                              <div>
                                <label className="text-sm text-muted-foreground">
                                  Role / Category
                                </label>
                                <select
                                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                                  value={newRole}
                                  onChange={(e) => setNewRole(e.target.value)}
                                >
                                  <option value="">Unspecified</option>
                                  {roleOptions.map((r) => (
                                    <option key={r} value={r}>
                                      {r}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <div>
                              <label className="text-sm text-muted-foreground">
                                Deadline
                              </label>
                              <input
                                type="date"
                                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                                value={newDeadline || ""}
                                onChange={(e) => setNewDeadline(e.target.value)}
                              />
                            </div>
                            {createError && (
                              <div className="text-xs text-destructive">
                                {createError}
                              </div>
                            )}
                          </div>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => setShowAddModal(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={createTodoTask}
                              disabled={creating || !newTitle.trim()}
                            >
                              {creating ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Create"
                              )}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    ) : null
                  }
                  onEditClick={startEditTask}
                />
                {showDropSkeleton && (
                  <div className="mt-3">
                    <SkeletonTaskCard />
                  </div>
                )}
                {column.status === "in-progress" &&
                  editingTaskId &&
                  columnTasks.some((t) => t.id === editingTaskId) && (
                    <div className="mt-3 bg-card border border-input rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">Edit Task</div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={cancelEdit}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <input
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                        placeholder="Title"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                      />
                      <textarea
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                        placeholder="Description"
                        rows={3}
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
                          value={editDeadline || ""}
                          onChange={(e) => setEditDeadline(e.target.value)}
                        />
                        <Button
                          size="sm"
                          onClick={saveEdit}
                          disabled={updating || !editTitle.trim()}
                        >
                          {updating ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Save"
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEdit}
                        >
                          Cancel
                        </Button>
                      </div>
                      {updateError && (
                        <div className="text-xs text-destructive">
                          {updateError}
                        </div>
                      )}
                    </div>
                  )}
              </div>
            );
          })}
        </div>

        <DragOverlay>
          {activeTask ? (
            <TaskCard task={activeTask} isDragging onTaskClick={() => {}} />
          ) : null}
        </DragOverlay>
      </DndContext>

      {selectedTask && (
        <TaskModal
          task={selectedTask}
          isOpen={isModalOpen}
          onClose={closeModal}
          onTaskUpdate={onTaskUpdate}
        />
      )}
    </div>
  );
}
