"use client";
import { useEffect, useState } from "react";
import { getDashboardStats, listAnalyses, getFindingBreakdown, DashboardStats, AnalysisSummary, FindingCategory } from "@/lib/api";

const VERDICT_BADGE: Record<string, string> = {
  BLOCK_DEPLOYMENT: "bg-red-100 text-red-700",
  REVIEW_REQUIRED:  "bg-amber-100 text-amber-700",
  SAFE_TO_DEPLOY:   "bg-green-100 text-green-700",
};
const VERDICT_SHORT: Record<string, string> = {
  BLOCK_DEPLOYMENT: "BLOCKED",
  REVIEW_REQUIRED:  "REVIEW",
  SAFE_TO_DEPLOY:   "SAFE",
};
const SCORE_COLOR = (s: number) =>
  s >= 81 ? "text-red-600" : s >= 61 ? "text-amber-600" : s >= 31 ? "text-blue-600" : "text-green-600";
const CATEGORY_COLOR: Record<string, string> = {
  Security:     "bg-red-500",
  Availability: "bg-amber-500",
  Compliance:   "bg-blue-500",
  Cost:         "bg-green-500",
};

export default function DashboardPage() {
  const [stats,     setStats]     = useState<DashboardStats | null>(null);
  const [analyses,  setAnalyses]  = useState<AnalysisSummary[]>([]);
  const [breakdown, setBreakdown] = useState<FindingCategory[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([getDashboardStats(), listAnalyses(), getFindingBreakdown()])
      .then(([s, a, b]) => { setStats(s); setAnalyses(a); setBreakdown(b); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const maxCount = Math.max(...breakdown.map(b => b.count), 1);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 font-medium text-sm">🛡️ AI Change Risk Agent</div>
        <div className="flex gap-1">
          {[["Dashboard","/dashboard"],["Analyze","/analyze"],["History","/dashboard"]].map(([label, href]) => (
            <a key={label} href={href}
              className={`text-sm px-3 py-1.5 rounded-lg ${label === "Dashboard" ? "bg-gray-100 font-medium" : "text-gray-500 hover:text-gray-800"}`}>
              {label}
            </a>
          ))}
        </div>
        <a href="/analyze" className="bg-blue-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-blue-700">
          + New analysis
        </a>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-4">
        <div>
          <h1 className="text-xl font-medium">Risk dashboard</h1>
          <p className="text-sm text-gray-500">Last 30 days · {loading ? "Loading..." : `${stats?.total || 0} total analyses`}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total analyses", value: stats?.total ?? "—",       color: "" },
            { label: "Blocked",        value: stats?.blocked ?? "—",     color: "text-red-600" },
            { label: "Review required",value: stats?.review ?? "—",      color: "text-amber-600" },
            { label: "Safe to deploy", value: stats?.safe ?? "—",        color: "text-green-600" },
          ].map(card => (
            <div key={card.label} className="bg-gray-100 rounded-xl p-3">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{card.label}</p>
              <p className={`text-2xl font-medium ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Finding breakdown */}
        {breakdown.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Finding categories</p>
            <div className="space-y-3">
              {breakdown.map(b => (
                <div key={b.category}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{b.category}</span>
                    <span className="font-medium">{b.count} findings</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full">
                    <div
                      className={`h-1.5 rounded-full ${CATEGORY_COLOR[b.category] || "bg-gray-400"}`}
                      style={{ width: `${(b.count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent analyses */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Recent analyses</p>
            <a href="/analyze" className="text-xs text-blue-600 hover:underline">New analysis →</a>
          </div>
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-8">Loading...</p>
          ) : analyses.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-gray-500 mb-3">No analyses yet</p>
              <a href="/analyze" className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700">
                Run your first analysis
              </a>
            </div>
          ) : (
            analyses.slice(0, 10).map(a => (
              <a key={a.id} href={`/results/${a.id}`}
                className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${VERDICT_BADGE[a.verdict || ""] || "bg-gray-100 text-gray-500"}`}>
                  {VERDICT_SHORT[a.verdict || ""] || "PENDING"}
                </span>
                <span className="font-mono text-sm flex-1 text-gray-700">{a.file_name}</span>
                {a.risk_score !== null && (
                  <span className={`text-sm font-medium ${SCORE_COLOR(a.risk_score)}`}>{a.risk_score}</span>
                )}
                <span className="text-xs text-gray-400">{new Date(a.created_at).toLocaleDateString()}</span>
              </a>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
