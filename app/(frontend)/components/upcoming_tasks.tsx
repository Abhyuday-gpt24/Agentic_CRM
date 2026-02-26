import React from "react";
import Link from "next/link";

interface Task {
  id: string;
  title: string;
  dueDate: Date | null;
  contact?: {
    name: string;
  } | null;
}

export default function UpcomingTasks({ tasks }: { tasks: Task[] }) {
  return (
    <div className="bg-[#242E3D] rounded-2xl shadow-lg border border-slate-700/50 overflow-hidden flex flex-col">
      <div className="p-6 border-b border-slate-700/50 flex justify-between items-center">
        <h3 className="font-bold text-white">Upcoming Tasks</h3>
        <Link
          href="/tasks"
          className="text-xs text-blue-400 hover:text-blue-300 transition"
        >
          View All &rarr;
        </Link>
      </div>

      <div className="p-2 flex-1">
        {tasks.length > 0 ? (
          tasks.map((task) => {
            // Check if task is overdue
            const isOverdue =
              task.dueDate && new Date(task.dueDate) < new Date();

            return (
              <Link
                href="/tasks"
                key={task.id}
                className="flex items-start gap-4 p-4 hover:bg-[#1E2532] rounded-xl transition group"
              >
                {/* Status Indicator Dot */}
                <div
                  className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${
                    isOverdue
                      ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                      : "bg-orange-500"
                  }`}
                />

                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-slate-200 group-hover:text-blue-400 transition truncate">
                    {task.title}
                  </h4>

                  <div className="flex flex-wrap gap-3 text-xs font-medium mt-1.5">
                    {task.dueDate && (
                      <span
                        className={
                          isOverdue ? "text-red-400" : "text-slate-500"
                        }
                      >
                        {isOverdue ? "⚠️ Overdue: " : "📅 Due: "}
                        {new Date(task.dueDate).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}

                    {/* Displays the related Contact name from the refactored schema */}
                    {task.contact && (
                      <span className="text-blue-400 flex items-center gap-1">
                        <span className="opacity-70">👤</span>{" "}
                        {task.contact.name}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="p-8 text-center text-slate-500 text-sm italic">
            You are all caught up! No pending tasks.
          </div>
        )}
      </div>
    </div>
  );
}
