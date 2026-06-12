const API_URL = "https://ai-change-risk-agent-production-c11b.up.railway.app";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

// Auth
export async function login(email: string, password: string) {
  const data = await request<{ access_token: string }>("/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  localStorage.setItem("token", data.access_token);
  return data;
}

export async function register(email: string, password: string, full_name: string, org_name: string) {
  const data = await request<{ access_token: string }>("/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, full_name, org_name }),
  });
  localStorage.setItem("token", data.access_token);
  return data;
}

export async function getMe() {
  return request<{ id: string; email: string; full_name: string; role: string }>("/v1/auth/me");
}

export function logout() {
  localStorage.removeItem("token");
  window.location.href = "/login";
}

// Analyses
export async function createAnalysis(formData: FormData) {
  const token = getToken();
  const res = await fetch(`${API_URL}/v1/analyses`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Analysis failed" }));
    throw new Error(err.detail || "Analysis failed");
  }
  return res.json();
}

export async function listAnalyses() {
  return request<AnalysisSummary[]>("/v1/analyses");
}

export async function getAnalysis(id: string) {
  return request<AnalysisDetail>(`/v1/analyses/${id}`);
}

// Dashboard
export async function getDashboardStats() {
  return request<DashboardStats>("/v1/dashboard/stats");
}

export async function getDashboardTrends(days = 30) {
  return request<TrendPoint[]>(`/v1/dashboard/trends?days=${days}`);
}

export async function getFindingBreakdown() {
  return request<FindingCategory[]>("/v1/dashboard/findings");
}

// Types
export interface AnalysisSummary {
  id: string;
  file_name: string;
  risk_score: number | null;
  risk_level: string | null;
  verdict: string | null;
  status: string;
  created_at: string;
}

export interface Finding {
  id: string;
  finding_code: string;
  severity: string;
  category: string;
  title: string;
  resource: string;
  attribute: string;
  evidence: string;
  risk_points: number;
  explanation: string;
  remediation: string;
  remediation_code: string;
  compliance: { framework: string; control: string }[];
}

export interface ComplianceResult {
  framework: string;
  control_id: string;
  control_name: string | null;
  status: string;
  description: string | null;
}

export interface CostImpact {
  resource: string;
  change_desc: string;
  cost_before_usd: number;
  cost_after_usd: number;
  delta_usd: number;
}

export interface AnalysisDetail extends AnalysisSummary {
  confidence: number | null;
  change_summary: string | null;
  change_types: string[];
  reasoning_summary: string | null;
  availability_impact: string | null;
  monthly_cost_delta: number | null;
  annual_cost_delta: number | null;
  processing_ms: number | null;
  findings: Finding[];
  compliance_results: ComplianceResult[];
  cost_impacts: CostImpact[];
}

export interface DashboardStats {
  total: number;
  blocked: number;
  review: number;
  safe: number;
  avg_risk_score: number;
}

export interface TrendPoint {
  date: string;
  risk_score: number;
  verdict: string;
}

export interface FindingCategory {
  category: string;
  count: number;
}
