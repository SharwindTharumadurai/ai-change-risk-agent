"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createAnalysis } from "@/lib/api";

export default function AnalyzePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile]         = useState<File | null>(null);
  const [content, setContent]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [dragging, setDragging] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }

  async function handleSubmit() {
    if (!file && !content.trim()) {
      setError("Upload a file or paste your code");
      return;
    }
    setLoading(true); setError("");
    try {
      const fd = new FormData();
      if (file)           fd.append("file", file);
      else if (content)   fd.append("content", content);
      const result = await createAnalysis(fd);
      router.push(`/results/${result.id}`);
    } catch (err: any) {
      setError(err.message || "Analysis failed. Check your API key and try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 font-medium">🛡️ AI Change Risk Agent</div>
        <div className="flex gap-1">
          {["Dashboard","Analyze","History"].map(p => (
            <a key={p} href={p === "Analyze" ? "/analyze" : `/${p.toLowerCase()}`}
              className={`text-sm px-3 py-1.5 rounded-lg ${p === "Analyze" ? "bg-gray-100 font-medium" : "text-gray-500 hover:text-gray-800"}`}>
              {p}
            </a>
          ))}
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-xl font-medium mb-1">Analyze infrastructure change</h1>
        <p className="text-sm text-gray-500 mb-6">Upload Terraform, git diff, or Kubernetes YAML for instant risk assessment</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">{error}</div>
        )}

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer mb-4 transition-colors
            ${dragging ? "border-blue-400 bg-blue-50" : "border-gray-300 bg-white hover:border-gray-400"}`}
        >
          <div className="text-3xl mb-3">☁️</div>
          {file ? (
            <>
              <p className="font-medium text-sm">{file.name}</p>
              <p className="text-xs text-gray-400 mt-1">{(file.size / 1024).toFixed(1)} KB — click to change</p>
            </>
          ) : (
            <>
              <p className="font-medium text-sm mb-1">Drop your file here</p>
              <p className="text-xs text-gray-500 mb-3">or click to browse</p>
              <div className="flex gap-2 justify-center flex-wrap">
                {[".tf",".tfplan",".diff",".yaml",".json"].map(t => (
                  <span key={t} className="text-xs bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">{t}</span>
                ))}
              </div>
            </>
          )}
          <input ref={fileRef} type="file" className="hidden"
            accept=".tf,.json,.yaml,.yml,.diff,.txt"
            onChange={e => e.target.files?.[0] && setFile(e.target.files[0])} />
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gray-200"></div>
          <span className="text-xs text-gray-400">or paste code directly</span>
          <div className="flex-1 h-px bg-gray-200"></div>
        </div>

        <textarea
          value={content} onChange={e => setContent(e.target.value)}
          placeholder="Paste Terraform code, git diff, or YAML here..."
          className="w-full border border-gray-200 rounded-xl p-3 font-mono text-xs bg-gray-50 resize-none h-28 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
        />

        <button
          onClick={handleSubmit} disabled={loading}
          className="w-full bg-blue-600 text-white font-medium py-3 rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="animate-spin">⏳</span>
              Analyzing infrastructure change...
            </>
          ) : "▶ Run analysis"}
        </button>

        {loading && (
          <p className="text-center text-xs text-gray-400 mt-3">
            AI is reasoning through security, availability, compliance, and cost impact...
          </p>
        )}
      </div>
    </div>
  );
}
