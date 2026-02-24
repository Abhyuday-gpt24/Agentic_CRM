import React from "react";

export default function TasksPage() {
  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto w-full animate-in fade-in duration-500">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">
        Tasks & Activities
      </h1>

      <div className="bg-[#242E3D] rounded-2xl shadow-lg border border-slate-700/50 p-2">
        {[
          {
            text: "Follow up email with Bruce Wayne",
            due: "Today, 2:00 PM",
            type: "Email",
            done: false,
          },
          {
            text: "Prepare contract for Stark Industries",
            due: "Tomorrow",
            type: "Doc",
            done: false,
          },
          {
            text: "Check in on Acme Corp integration",
            due: "Overdue",
            type: "Call",
            done: true,
          },
        ].map((task, i) => (
          <div
            key={i}
            className={`flex items-center gap-4 p-4 rounded-xl transition-colors hover:bg-slate-800/50 ${task.done ? "opacity-50" : ""}`}
          >
            <input
              type="checkbox"
              defaultChecked={task.done}
              className="w-5 h-5 rounded border-slate-500 text-blue-500 focus:ring-blue-500 bg-transparent"
            />
            <div className="flex-1">
              <p
                className={`text-sm font-medium ${task.done ? "text-slate-500 line-through" : "text-slate-200"}`}
              >
                {task.text}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {task.type} • Due:{" "}
                <span className={task.due === "Overdue" ? "text-red-400" : ""}>
                  {task.due}
                </span>
              </p>
            </div>
            <button className="text-slate-500 hover:text-white">⋮</button>
          </div>
        ))}
      </div>
    </div>
  );
}
