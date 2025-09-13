"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  LucideTimer,
} from "lucide-react";
import { Badge } from "@/components/ui/Bagde";
import { Button } from "@/components/ui/Button";

interface Task {
  id: string;
  title: string;
  deadline?: string;
  status: "todo" | "in-progress" | "completed";
  assigned_user?: {
    id: string;
    email: string;
    raw_user_meta_data?: {
      full_name?: string;
    };
  };
}

interface Subtask {
  id: string;
  title: string;
  deadline?: string;
  status: "todo" | "in-progress" | "completed";
  task_id: string;
  assigned_user?: {
    id: string;
    email: string;
    raw_user_meta_data?: {
      full_name?: string;
    };
  };
  tasks?: {
    id: string;
    title: string;
    team_id: string;
  };
}

type CalendarItem = Task | (Subtask & { type: 'subtask' });

interface TeamCalendarProps {
  tasks: Task[];
  subtasks?: Subtask[];
}

export default function TeamCalendar({ tasks, subtasks = [] }: TeamCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const today = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Combine tasks and subtasks for calendar display
  const allItems: CalendarItem[] = [
    ...tasks,
    ...subtasks.map(subtask => ({ ...subtask, type: 'subtask' as const }))
  ];

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const firstDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getTasksForDate = (date: Date) => {
    return allItems.filter((item) => {
      if (!item.deadline) return false;
      const itemDate = new Date(item.deadline);
      return (
        itemDate.getDate() === date.getDate() &&
        itemDate.getMonth() === date.getMonth() &&
        itemDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const getDateCellClass = (date: Date) => {
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    const isCurrentMonth = date.getMonth() === currentMonth;
    const tasksForDate = getTasksForDate(date);
    const hasOverdueTasks = tasksForDate.some(
      (item) =>
        item.deadline &&
        new Date(item.deadline) < today &&
        item.status !== "completed"
    );

    let baseClasses =
      "min-h-[80px] p-3 border text-sm m-0.5 rounded-lg  transition-colors ";

    if (!isCurrentMonth) {
      baseClasses += " bg-muted text-muted-foreground border-muted";
    } else {
      baseClasses +=
        " bg-background hover:bg-accent border-input text-foreground";
    }

    if (isToday) {
      baseClasses +=
        " ring-2 ring-primary bg-primary/10 text-primary font-bold";
    }

    if (hasOverdueTasks) {
      baseClasses +=
        " bg-destructive/10 border-destructive/40 text-destructive";
    }

    return baseClasses;
  };

  const renderCalendarDays = () => {
    const days = [];

    // Add previous month's days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth, -i);
      days.push(
        <div key={`prev-${date.getDate()}`} className={getDateCellClass(date)}>
          <div className="font-medium">{date.getDate()}</div>
          <div className="mt-1 space-y-1">
            {getTasksForDate(date)
              .slice(0, 2)
              .map((item) => {
                const isSubtask = 'type' in item && item.type === 'subtask';
                const subtaskItem = isSubtask ? item as (Subtask & { type: 'subtask' }) : null;
                
                return (
                  <Badge
                    key={item.id}
                    className={`w-full text-xs px-2 py-1 rounded-full truncate  ${
                      item.status === "completed"
                        ? "bg-success/10 text-success"
                        : item.deadline && new Date(item.deadline) < today
                        ? "bg-destructive/10 text-destructive"
                        : isSubtask
                        ? "bg-blue-100 text-blue-800 border border-blue-200"
                        : "bg-primary/10 text-primary"
                    }`}
                    title={`${isSubtask ? `[Subtask] ${item.title}` : item.title}${subtaskItem?.tasks ? ` (${subtaskItem.tasks.title})` : ''}`}
                  >
                    {isSubtask && (
                      <span className="mr-1 text-xs opacity-75">S</span>
                    )}
                    {item.title}
                    {item.deadline && (
                      <span className="ml-1 text-muted-foreground">
                        {" "}
                        {new Date(item.deadline).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </Badge>
                );
              })}
            {getTasksForDate(date).length > 2 && (
              <div className="text-xs text-gray-500">
                +{getTasksForDate(date).length - 2} more
              </div>
            )}
          </div>
        </div>
      );
    }

    // Add current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      days.push(
        <div key={day} className={getDateCellClass(date)}>
          <div className="font-medium">{day}</div>
          <div className="mt-1 space-y-1">
            {getTasksForDate(date)
              .slice(0, 2)
              .map((item) => {
                const isSubtask = 'type' in item && item.type === 'subtask';
                const subtaskItem = isSubtask ? item as (Subtask & { type: 'subtask' }) : null;
                
                return (
                  <div
                    key={item.id}
                    className={`text-xs p-1 rounded truncate ${
                      item.status === "completed"
                        ? "bg-green-200 text-green-800"
                        : item.deadline && new Date(item.deadline) < today
                        ? "bg-destructive text-destructive-foreground"
                        : isSubtask
                        ? "bg-blue-100 text-blue-800 border border-blue-200"
                        : "bg-primary/10 text-primary"
                    }`}
                    title={`${isSubtask ? `[Subtask] ${item.title}` : item.title}${subtaskItem?.tasks ? ` (${subtaskItem.tasks.title})` : ''} - ${
                      item.assigned_user?.raw_user_meta_data?.full_name ||
                      item.assigned_user?.email ||
                      "Unassigned"
                    }`}
                  >
                    {isSubtask && (
                      <span className="mr-1 text-xs opacity-75 font-bold">S</span>
                    )}
                    {item.title}
                  </div>
                );
              })}
            {getTasksForDate(date).length > 2 && (
              <div className="text-xs text-gray-500">
                +{getTasksForDate(date).length - 2} more
              </div>
            )}
          </div>
        </div>
      );
    }

    // Add next month's days
    const remainingDays = 42 - days.length; // 6 rows × 7 days
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(currentYear, currentMonth + 1, day);
      days.push(
        <div key={`next-${day}`} className={getDateCellClass(date)}>
          <div className="font-medium">{day}</div>
          <div className="mt-1 space-y-1">
            {getTasksForDate(date)
              .slice(0, 2)
              .map((item) => {
                const isSubtask = 'type' in item && item.type === 'subtask';
                
                return (
                  <div
                    key={item.id}
                    className={`text-xs p-1 rounded truncate ${
                      item.status === "completed"
                        ? "bg-green-100 text-green-800"
                        : item.deadline && new Date(item.deadline) < today
                        ? "bg-red-100 text-red-800"
                        : isSubtask
                        ? "bg-blue-50 text-blue-700 border border-blue-100"
                        : "bg-blue-100 text-blue-800"
                    }`}
                    title={`${isSubtask ? `[Subtask] ${item.title}` : item.title}`}
                  >
                    {isSubtask && (
                      <span className="mr-1 text-xs opacity-75 font-bold">S</span>
                    )}
                    {item.title}
                  </div>
                );
              })}
            {getTasksForDate(date).length > 2 && (
              <div className="text-xs text-gray-500">
                +{getTasksForDate(date).length - 2} more
              </div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  const upcomingTasks = allItems
    .filter((item) => item.deadline && new Date(item.deadline) >= today)
    .sort(
      (a, b) =>
        new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime()
    )
    .slice(0, 5);

  return (
    <div className="bg-card rounded-lg shadow-md  border-input p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CalendarIcon className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">
            Team Calendar
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="px-4 py-2 text-lg font-medium min-w-[200px] text-center">
            {monthNames[currentMonth]} {currentYear}
          </div>
          <Button variant="outline" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button className="ml-2" onClick={goToToday}>
            <LucideTimer /> To Today
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0 mb-4">
        {dayNames.map((day) => (
          <div
            key={day}
            className="p-2 text-center font-medium text-muted-foreground bg-muted  border-b border-input"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0  border-input rounded-b-lg">
        {renderCalendarDays()}
      </div>

      {upcomingTasks.length > 0 && (
        <div className="mt-6 pt-6 border-t border-input">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Upcoming Deadlines
          </h3>
          <div className="space-y-2">
            {upcomingTasks.map((item) => {
              const isSubtask = 'type' in item && item.type === 'subtask';
              const subtaskItem = isSubtask ? item as (Subtask & { type: 'subtask' }) : null;
              
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-sm bg-background rounded-lg px-3 py-2 shadow-sm border border-muted"
                >
                  <div className="flex-1 truncate flex items-center gap-2">
                    <Badge
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        item.status === "completed"
                          ? "bg-primary/10 text-primary"
                          : item.deadline && new Date(item.deadline) < today
                          ? "bg-destructive/10 text-destructive"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      {item.status}
                    </Badge>
                    <span className="font-medium text-foreground">
                      {isSubtask && (
                        <span className="mr-1 text-xs opacity-75 bg-blue-100 text-blue-700 px-1 rounded">S</span>
                      )}
                      {item.title}
                      {subtaskItem?.tasks && (
                        <span className="text-xs text-muted-foreground ml-1">
                          ({subtaskItem.tasks.title})
                        </span>
                      )}
                    </span>
                    {item.assigned_user && (
                      <span className="text-muted-foreground ml-2">
                        -{" "}
                        {item.assigned_user.raw_user_meta_data?.full_name ||
                          item.assigned_user.email}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground ml-2">
                    <Clock className="h-4 w-4" />
                    <span>
                      {new Date(item.deadline!).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                      {item.deadline && (
                        <span className="ml-1">
                          {new Date(item.deadline!).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
