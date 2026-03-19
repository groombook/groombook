import { useState } from "react";
import { X, Filter } from "lucide-react";
import type { AuditEntry } from "./mockData.js";

interface Props {
  auditLog: AuditEntry[];
  onClose: () => void;
}

export function AuditLogViewer({ auditLog, onClose }: Props) {
  const [filterAction, setFilterAction] = useState<string>("all");

  const actionTypes = ["all", ...new Set(auditLog.map(e => e.action))];
  const filtered = filterAction === "all" ? auditLog : auditLog.filter(e => e.action === filterAction);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
          <h2 className="font-semibold text-stone-800">Impersonation Audit Log</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-stone-100 rounded-lg">
            <X size={18} className="text-stone-500" />
          </button>
        </div>
        <div className="px-6 py-3 border-b border-stone-100 flex items-center gap-2">
          <Filter size={14} className="text-stone-400" />
          <select
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
            className="text-sm border border-stone-200 rounded-lg px-2 py-1"
          >
            {actionTypes.map(a => (
              <option key={a} value={a}>{a === "all" ? "All actions" : a.replace(/_/g, " ")}</option>
            ))}
          </select>
          <span className="text-xs text-stone-400 ml-auto">{filtered.length} entries</span>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-3">
          {filtered.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-8">No audit entries</p>
          ) : (
            <div className="space-y-3">
              {filtered.map(entry => (
                <div key={entry.id} className="flex gap-3 text-sm">
                  <div className="text-xs text-stone-400 whitespace-nowrap pt-0.5 w-20 shrink-0">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </div>
                  <div>
                    <span className="inline-block px-2 py-0.5 bg-stone-100 text-stone-600 rounded text-xs font-medium mb-0.5">
                      {entry.action.replace(/_/g, " ")}
                    </span>
                    <p className="text-stone-700">{entry.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
