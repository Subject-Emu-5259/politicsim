import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/hooks/useApi";
import { AHDPanel, AHDTag } from "@/components/ahd/primitives";
import { ChevronRight, ChevronLeft, User, Mail, Lock, Vote, Flag, UserPlus } from "lucide-react";

const IDEOLOGIES = ["far-left", "left", "center-left", "center", "center-right", "right", "far-right"] as const;

export default function Register() {
  const navigate = useNavigate();
  const { registerWithPolitician } = useAuth();
  const { data: countryRes } = useApi<{ countries: { id: string; name: string; code: string }[] }>({ url: "/api/countries" });
  const countries = countryRes?.countries ?? [];

  const [step, setStep] = useState<1 | 2>(1);

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [politicianName, setPoliticianName] = useState("");
  const [countryId, setCountryId] = useState("");
  const [ideology, setIdeology] = useState<(typeof IDEOLOGIES)[number]>("center");
  const [partyId, setPartyId] = useState("");
  const [homeRegion, setHomeRegion] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: partiesRes } = useApi<{ parties: { id: string; name: string; shortName: string; color: string }[] }>({
    url: countryId ? `/api/countries/${countryId}/parties` : "",
  });
  const parties = partiesRes?.parties ?? [];

  if (countries.length && !countryId) setCountryId(countries[0].id);

  function nextStep(e: FormEvent) {
    e.preventDefault();
    if (step === 1) {
      if (!email || !displayName || password.length < 8) {
        toast.error("Fill all fields. Password must be ≥8 characters.");
        return;
      }
      setStep(2);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!politicianName || !countryId || !homeRegion) {
      toast.error("Fill all politician fields.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await registerWithPolitician({
        email, password, displayName,
        politicianName, countryId, ideology,
        partyId: partyId || null, homeRegion,
      });
      if (!result.ok) {
        toast.error(result.error ?? "Registration failed");
        setStep(1);
        return;
      }
      toast.success(`Welcome, ${displayName}! ${politicianName} is ready to enter politics.`);
      navigate(result.politicianId ? `/politicians/${result.politicianId}` : "/dashboard", { replace: true });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="ahd-page-login flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Stepper */}
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className={`flex items-center gap-2 text-xs uppercase tracking-wider font-mono ${step >= 1 ? "text-amber-400" : "text-zinc-600"}`}>
            <span className={`flex h-7 w-7 items-center justify-center rounded-sm border ${step >= 1 ? "border-amber-500 bg-amber-500/10 text-amber-300" : "border-zinc-700 text-zinc-600"}`}>1</span>
            Account
          </div>
          <div className={`h-px w-12 ${step >= 2 ? "bg-amber-500" : "bg-zinc-700"}`} />
          <div className={`flex items-center gap-2 text-xs uppercase tracking-wider font-mono ${step >= 2 ? "text-amber-400" : "text-zinc-600"}`}>
            <span className={`flex h-7 w-7 items-center justify-center rounded-sm border ${step >= 2 ? "border-amber-500 bg-amber-500/10 text-amber-300" : "border-zinc-700 text-zinc-600"}`}>2</span>
            Politician
          </div>
        </div>

        <AHDPanel className="p-6">
          <div className="flex items-center gap-2 mb-1">
            <AHDTag tone="amber">📝 REGISTER</AHDTag>
            <AHDTag tone="country">Step {step}/2</AHDTag>
          </div>
          <h1 className="ahd-h1 mt-1">{step === 1 ? "Create your account" : "Create your politician"}</h1>
          <p className="ahd-meta mt-1">{step === 1 ? "Sign up to enter the world of PolitySim." : "Who will you be in the political arena?"}</p>

          {step === 1 ? (
            <form onSubmit={nextStep} className="mt-6 space-y-4">
              <div>
                <Label htmlFor="displayName" className="ahd-meta uppercase tracking-wider text-[10px] flex items-center gap-1.5"><User className="h-3 w-3" /> Display name</Label>
                <Input id="displayName" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" className="ahd-input mt-1.5" />
              </div>
              <div>
                <Label htmlFor="email" className="ahd-meta uppercase tracking-wider text-[10px] flex items-center gap-1.5"><Mail className="h-3 w-3" /> Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="ahd-input mt-1.5" />
              </div>
              <div>
                <Label htmlFor="password" className="ahd-meta uppercase tracking-wider text-[10px] flex items-center gap-1.5"><Lock className="h-3 w-3" /> Password</Label>
                <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" className="ahd-input mt-1.5" />
              </div>
              <Button type="submit" className="w-full ahd-cta">
                Continue <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </form>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div>
                <Label htmlFor="politicianName" className="ahd-meta uppercase tracking-wider text-[10px] flex items-center gap-1.5"><Vote className="h-3 w-3" /> Politician name</Label>
                <Input id="politicianName" required value={politicianName} onChange={(e) => setPoliticianName(e.target.value)} placeholder="e.g. Alex Rivera" className="ahd-input mt-1.5" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="country" className="ahd-meta uppercase tracking-wider text-[10px]">Country</Label>
                  <select id="country" value={countryId} onChange={(e) => setCountryId(e.target.value)} className="ahd-input mt-1.5 w-full">
                    {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <Label htmlFor="homeRegion" className="ahd-meta uppercase tracking-wider text-[10px] flex items-center gap-1.5"><Flag className="h-3 w-3" /> Home region</Label>
                  <Input id="homeRegion" required value={homeRegion} onChange={(e) => setHomeRegion(e.target.value)} placeholder="e.g. California" className="ahd-input mt-1.5" />
                </div>
              </div>
              <div>
                <Label htmlFor="ideology" className="ahd-meta uppercase tracking-wider text-[10px]">Ideology</Label>
                <select id="ideology" value={ideology} onChange={(e) => setIdeology(e.target.value as typeof ideology)} className="ahd-input mt-1.5 w-full">
                  {IDEOLOGIES.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="party" className="ahd-meta uppercase tracking-wider text-[10px]">Party (optional)</Label>
                <select id="party" value={partyId} onChange={(e) => setPartyId(e.target.value)} className="ahd-input mt-1.5 w-full">
                  <option value="">Independent</option>
                  {parties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="ahd-btn-ghost">
                  <ChevronLeft className="mr-1 h-4 w-4" /> Back
                </Button>
                <Button type="submit" className="flex-1 ahd-cta" disabled={submitting}>
                  <UserPlus className="h-4 w-4" />
                  {submitting ? "Creating…" : "Create account & enter politics"}
                </Button>
              </div>
            </form>
          )}
        </AHDPanel>

        <p className="ahd-meta mt-4 text-center">
          Already have an account? <Link to="/login" className="text-amber-400 hover:underline font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
