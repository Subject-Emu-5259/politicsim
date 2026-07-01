import { useState, type FormEvent } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { AHDPanel, AHDTag, countryFlag } from "@/components/ahd/primitives";
import { LogIn, Mail, Lock } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const next = (location.state as { from?: string })?.from ?? "/dashboard";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await login(email, password);
      if (!result.ok) {
        toast.error(result.error ?? "Login failed");
        return;
      }
      toast.success("Signed in");
      navigate(next, { replace: true });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="ahd-page-login flex items-center justify-center px-4 py-12">
      <AHDPanel className="w-full max-w-md p-6">
        <div className="flex items-center gap-2 mb-1">
          <AHDTag tone="amber">🔐 LOGIN</AHDTag>
          <AHDTag tone="country">{countryFlag("usa")} USA</AHDTag>
        </div>
        <h1 className="ahd-h1 mt-1">Sign in</h1>
        <p className="ahd-meta mt-1">Welcome back to PolitySim.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email" className="ahd-meta uppercase tracking-wider text-[10px]">Email</Label>
            <div className="relative mt-1.5">
              <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500/60" />
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="ahd-input pl-8" />
            </div>
          </div>
          <div>
            <Label htmlFor="password" className="ahd-meta uppercase tracking-wider text-[10px]">Password</Label>
            <div className="relative mt-1.5">
              <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500/60" />
              <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="ahd-input pl-8" />
            </div>
          </div>
          <Button type="submit" className="w-full ahd-cta" disabled={submitting}>
            <LogIn className="h-4 w-4" />
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="ahd-meta mt-6 text-center">
          New here? <Link to="/register" className="text-amber-400 hover:underline font-medium">Create an account</Link>
        </p>
      </AHDPanel>
    </div>
  );
}
