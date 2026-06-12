"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getAnalysis, AnalysisDetail } from "@/lib/api";

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800 border-red-200",
  HIGH:     "bg-amber-100 text-amber-800 border-amber-200",
  MEDIUM:   "bg-blue-100 text-blue-800 border-blue-200",
  LOW:      "bg-green-100 text-green-800 border-green-200",
};
const SEVERITY_DOT: Record<string, string> = {
  CRITICAL: "bg-red-500", HIGH: "bg-amber-500",
  MEDIUM: "bg-blue-500", LOW: "bg-green-500",
};
const VERDICT_STYLE: Record<string, string> = {
  BLOCK_DEPLOYMENT: "bg-red-50 border-red-200 text-red-800",
  REVIEW_REQUIRED:  "bg-amber-50 border-amber-200 text-amber-800",
  SAFE_TO_DEPLOY:   "bg-green-50 border-green-200 text-green-800",
};
const VERDICT_ICON: Record<string, string> = {
  BLOCK_DEPLOYMENT: "🚫", REVIEW_REQUIRED: "⚠️", SAFE_TO_DEPLOY: "✅",
};
const STATUS_STYLE: Record<string, string> = {
  PASS: "bg-green-100 text-green-700", FAIL: "bg-red-100 text-red-700",
  WARN: "bg-amber-100 text-amber-700", NOT_APPLICABLE: "bg-gray-100 text-gray-500",
};

export default function ResultsPage() {
  const { id } = useParams();
  const [analysis, setAnalysis] = useState<AnalysisDetail | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");

  useEffect(() => {
    if (!id) return;
    getAnalysis(id as string)
      .then(setAnalysis)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500 text-sm">Loading analysis...</p>
    </div>
  );
  if (error || !analysis) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-red-600 text-sm">{error || "Analysis not found"}</p>
    </div>
  );

  const verdict = analysis.verdict || "REVIEW_REQUIRED";
  const costDelta = analysis.monthly_cost_delta || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <a href="/dashboard" className="text-sm text-gray-500 hover:text-gray-800">← Back to dashboard</a>
        <div className="flex items-center gap-2 font-medium text-sm">🛡️ AI Change Risk Agent</div>
        <span className="text-xs text-gray-400">{analysis.processing_ms ? `${analysis.processing_ms}ms` : ""}</span>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-6 space-y-4">
        {/* Verdict banner */}
        <div className={`border rounded-xl p-4 flex items-center justify-between ${VERDICT_STYLE[verdict]}`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{VERDICT_ICON[verdict]}</span>
            <div>
              <p className="font-medium">{verdict.replace(/_/g, " ")}</p>
              <p className="text-sm opacity-80">{analysis.reasoning_summary?.slice(0, 120)}...</p>
            </div>
          </div>
          <div className="text-right text-sm">
            <p className="font-medium">{analysis.file_name}</p>
            <p>Risk score: {analysis.risk_score} / 100</p>
          </div>
        </div>

        {/* Score grid */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Overall risk", value: `${analysis.risk_score}`, sub: analysis.risk_level || "" },
            { label: "Security", value: `${analysis.risk_score}`, sub: `${analysis.findings.filter(f => f.category === "Security" && f.severity === "CRITICAL").length} critical` },
            { label: "Availability", value: analysis.availability_impact || "NONE", sub: "" },
            { label: "Cost impact", value: costDelta >= 0 ? `+$${Math.round(costDelta)}` : `-$${Math.abs(Math.round(costDelta))}`, sub: "per month" },
          ].map(card => (
            <div key={card.label} className="bg-white border border-gray-200 rounded-xl p-3">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{card.label}</p>
              <p className="text-xl font-medium">{card.value}</p>
              {card.sub && <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>}
            </div>
          ))}
        </div>

        {/* Change summary */}
        {analysis.change_summary && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Change summary</p>
            <p className="text-sm text-gray-700">{analysis.change_summary}</p>
            {analysis.change_types.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {analysis.change_types.map(t => (
                  <span key={t} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">{t}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Findings */}
        {analysis.findings.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Findings ({analysis.findings.length})</p>
            </div>
            {analysis.findings
              .sort((a, b) => {
                const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
                return (order[a.severity as keyof typeof order] ?? 4) - (order[b.severity as keyof typeof order] ?? 4);
              })
              .map((f, i) => (
              <div key={f.id || i} className="p-4 border-b border-gray-100 last:border-0">
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${SEVERITY_DOT[f.severity] || "bg-gray-400"}`}></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${SEVERITY_COLORS[f.severity] || ""}`}>{f.severity}</span>
                      <span className="font-medium text-sm">{f.title}</span>
                    </div>
                    {f.resource && <p className="font-mono text-xs text-gray-400 mb-1">{f.resource}{f.attribute ? ` · ${f.attribute}` : ""}</p>}
                    {f.evidence  && <p className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1 mb-2 font-mono">{f.evidence}</p>}
                    {f.explanation && <p className="text-xs text-gray-600 mb-2">{f.explanation}</p>}
                    {f.remediation && (
                      <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                        <p className="text-xs font-medium text-green-700 mb-1">Fix</p>
                        <p className="text-xs text-green-700">{f.remediation}</p>
                      </div>
                    )}
                    {f.compliance.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {f.compliance.map((c, ci) => (
                          <span key={ci} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{c.framework} {c.control}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 font-medium flex-shrink-0">+{f.risk_points}pts</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Compliance + Cost side by side */}
        <div className="grid grid-cols-2 gap-4">
          {/* Compliance */}
          {analysis.compliance_results.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Compliance</p>
              </div>
              {analysis.compliance_results.slice(0, 8).map((cr, i) => (
                <div key={i} className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 last:border-0">
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${STATUS_STYLE[cr.status] || ""}`}>{cr.status}</span>
                  <span className="font-mono text-xs text-gray-600">{cr.framework} {cr.control_id}</span>
                  <span className="text-xs text-gray-400 truncate flex-1">{cr.description?.slice(0, 40)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Cost */}
          {analysis.cost_impacts.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Cost impact</p>
                <span className={`text-sm font-medium ${costDelta >= 0 ? "text-red-600" : "text-green-600"}`}>
                  {costDelta >= 0 ? "+" : ""}${Math.round(costDelta)}/mo
                </span>
              </div>
              {analysis.cost_impacts.map((ci, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-mono text-xs text-gray-600">{ci.resource}</p>
                    <p className="text-xs text-gray-400">{ci.change_desc}</p>
                  </div>
                  <span className={`text-xs font-medium ${ci.delta_usd >= 0 ? "text-red-600" : "text-green-600"}`}>
                    {ci.delta_usd >= 0 ? "+" : ""}${Math.round(ci.delta_usd)}
                  </span>
                </div>
              ))}
              <div className="px-4 py-2 bg-gray-50 flex justify-between text-xs font-medium">
                <span>Annual impact</span>
                <span className={costDelta >= 0 ? "text-red-600" : "text-green-600"}>
                  {costDelta >= 0 ? "+" : ""}${Math.round((analysis.annual_cost_delta || 0))}/yr
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <a href="/analyze" className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700">+ New analysis</a>
          <a href="/dashboard" className="border border-gray-300 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50">Back to dashboard</a>
        </div>
      </div>
    </div>
  );
}
