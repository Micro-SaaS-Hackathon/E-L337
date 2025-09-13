"use client";

interface TaskTagsProps {
  tags: string[];
  size?: "sm" | "md" | "lg";
  className?: string;
}

// Update tagColors for more saturated and bright colors
const tagColors: { [key: string]: string } = {
  Frontend:
    "bg-blue-500 text-white border-blue-600 dark:bg-blue-700 dark:text-white dark:border-blue-800",
  Backend:
    "bg-green-500 text-white border-green-600 dark:bg-green-700 dark:text-white dark:border-green-800",
  Database:
    "bg-purple-500 text-white border-purple-600 dark:bg-purple-700 dark:text-white dark:border-purple-800",
  Authentication:
    "bg-amber-400 text-black border-amber-500 dark:bg-amber-500 dark:text-black dark:border-amber-600",
  DevOps:
    "bg-orange-500 text-white border-orange-600 dark:bg-orange-700 dark:text-white dark:border-orange-800",
  Mobile:
    "bg-pink-500 text-white border-pink-600 dark:bg-pink-700 dark:text-white dark:border-pink-800",
  Testing:
    "bg-red-500 text-white border-red-600 dark:bg-red-700 dark:text-white dark:border-red-800",
  Design:
    "bg-indigo-500 text-white border-indigo-600 dark:bg-indigo-700 dark:text-white dark:border-indigo-800",
  Security:
    "bg-gray-800 text-white border-gray-900 dark:bg-gray-900 dark:text-white dark:border-gray-950",
  "Data Science":
    "bg-cyan-400 text-black border-cyan-500 dark:bg-cyan-500 dark:text-black dark:border-cyan-600",
  "Machine Learning":
    "bg-teal-400 text-black border-teal-500 dark:bg-teal-500 dark:text-black dark:border-teal-600",
  Infrastructure:
    "bg-slate-500 text-white border-slate-600 dark:bg-slate-700 dark:text-white dark:border-slate-800",
  API: "bg-emerald-500 text-white border-emerald-600 dark:bg-emerald-700 dark:text-white dark:border-emerald-800",
  "UI/UX":
    "bg-rose-500 text-white border-rose-600 dark:bg-rose-700 dark:text-white dark:border-rose-800",
};

const sizeClasses = {
  sm: "px-2 py-1 text-xs",
  md: "px-2.5 py-1.5 text-sm",
  lg: "px-3 py-2 text-base",
};

// Add shadow, subtle hover, and spacing for modern look
export default function TaskTags({
  tags,
  size = "sm",
  className = "",
}: TaskTagsProps) {
  if (!tags || tags.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {tags.map((tag, index) => (
        <span
          key={index}
          className={`
            inline-flex items-center rounded-full border  shadow-sm transition-all duration-200
            ${
              tagColors[tag] ||
              "bg-gray-700 text-white border-gray-800 dark:bg-gray-900 dark:text-white dark:border-gray-950"
            }
            ${sizeClasses[size]}
            hover:scale-105 hover:shadow-md
          `}
          style={{
            letterSpacing: "0.01em",
            paddingLeft: "0.75em",
            paddingRight: "0.75em",
          }}
        >
          <span className="mr-1.5">#</span>
          {tag}
        </span>
      ))}
    </div>
  );
}
