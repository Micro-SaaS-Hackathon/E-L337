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

interface TeamCalendarProps {
  tasks: Task[];
}

export default function TeamCalendar({ tasks }: TeamCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const today = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

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
    return tasks.filter((task) => {
      if (!task.deadline) return false;
      const taskDate = new Date(task.deadline);
      return (
        taskDate.getDate() === date.getDate() &&
        taskDate.getMonth() === date.getMonth() &&
        taskDate.getFullYear() === date.getFullYear()
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
      (task) =>
        task.deadline &&
        new Date(task.deadline) < today &&
        task.status !== "completed"
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
              .map((task) => (
                <Badge
                  key={task.id}
                  className={`w-full text-xs px-2 py-1 rounded-full truncate  ${
                    task.status === "completed"
                      ? "bg-success/10 text-success"
                      : task.deadline && new Date(task.deadline) < today
                      ? "bg-destructive/10 text-destructive"
                      : "bg-primary/10 text-primary"
                  }`}
                  title={task.title}
                >
                  {task.title}
                  {task.deadline && (
                    <span className="ml-1 text-muted-foreground">
                      {" "}
                      {new Date(task.deadline).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </Badge>
              ))}
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
              .map((task) => (
                <div
                  key={task.id}
                  className={`text-xs p-1 rounded truncate ${
                    task.status === "completed"
                      ? "bg-green-200 text-green-800"
                      : task.deadline && new Date(task.deadline) < today
                      ? "bg-destructive text-destructive-foreground"
                      : "bg-primary/10 text-primary"
                  }`}
                  title={`${task.title} - ${
                    task.assigned_user?.raw_user_meta_data?.full_name ||
                    task.assigned_user?.email ||
                    "Unassigned"
                  }`}
                >
                  {task.title}
                </div>
              ))}
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
              .map((task) => (
                <div
                  key={task.id}
                  className={`text-xs p-1 rounded truncate ${
                    task.status === "completed"
                      ? "bg-green-100 text-green-800"
                      : task.deadline && new Date(task.deadline) < today
                      ? "bg-red-100 text-red-800"
                      : "bg-blue-100 text-blue-800"
                  }`}
                  title={task.title}
                >
                  {task.title}
                </div>
              ))}
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

  const upcomingTasks = tasks
    .filter((task) => task.deadline && new Date(task.deadline) >= today)
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
            {upcomingTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between text-sm bg-background rounded-lg px-3 py-2 shadow-sm border border-muted"
              >
                <div className="flex-1 truncate flex items-center gap-2">
                  <Badge
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      task.status === "completed"
                        ? "bg-primary/10 text-primary"
                        : task.deadline && new Date(task.deadline) < today
                        ? "bg-destructive/10 text-destructive"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {task.status}
                  </Badge>
                  <span className="font-medium text-foreground">
                    {task.title}
                  </span>
                  {task.assigned_user && (
                    <span className="text-muted-foreground ml-2">
                      -{" "}
                      {task.assigned_user.raw_user_meta_data?.full_name ||
                        task.assigned_user.email}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground ml-2">
                  <Clock className="h-4 w-4" />
                  <span>
                    {new Date(task.deadline!).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                    {task.deadline && (
                      <span className="ml-1">
                        {new Date(task.deadline!).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
