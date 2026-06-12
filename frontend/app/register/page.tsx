"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { register } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", full_name: "", org_name: "" });
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const update = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      await register(form.email, form.password, form.full_name, form.org_name);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-xl p-8 w-full max-w-md">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-2xl">🛡️</span>
          <span className="font-medium text-lg">AI Change Risk Agent</span>
        </div>
        <h1 className="text-xl font-medium mb-1">Create account</h1>
        <p className="text-sm text-gray-500 mb-6">Set up your team workspace</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { key: "full_name", label: "Full name",         type: "text",     placeholder: "Jane Smith" },
            { key: "org_name",  label: "Organization name", type: "text",     placeholder: "Acme Corp" },
            { key: "email",     label: "Work email",        type: "email",    placeholder: "jane@acme.com" },
            { key: "password",  label: "Password",          type: "password", placeholder: "min 8 characters" },
          ].map(({ key, label, type, placeholder }) => (
            <div key={key}>
              <label className="text-sm font-medium text-gray-700 block mb-1">{label}</label>
              <input
                type={type} value={form[key as keyof typeof form]}
                onChange={update(key)} placeholder={placeholder} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
          <button
            type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white font-medium py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>
        <p className="text-sm text-gray-500 text-center mt-4">
          Already have an account?{" "}
          <a href="/login" className="text-blue-600 hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  );
}
