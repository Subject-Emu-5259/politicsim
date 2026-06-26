import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/hooks/useApi";
import { ChevronRight, ChevronLeft, User, Mail, Lock, Vote, Flag } from "lucide-react";

const IDEOLOGIES = ["far-left", "left", "center-left", "center", "center-right", "right", "far-right"] as const;

export default function Register() {
  const navigate = useNavigate();
  const { registerWithPolitician } = useAuth();
  const { data: countryRes } = useApi<{ countries: { id: string; name: string; code: string }[] }>({ url: "/api/countries" });
  const countries = countryRes?.countries ?? [];

  const [step, setStep] = useState<1 | 2>(1);

  // Account fields
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");

  // Politician fields
  const [politicianName, setPoliticianName] = useState("");
  const [countryId, setCountryId] = useState("");
  const [ideology, setIdeology] = useState<(typeof IDEOLOGIES)[number]>("center");
  const [partyId, setPartyId] = useState("");
  const [homeRegion, setHomeRegion] = useState("");

  const [submitting, setSubmitting] = useState(false);

  // Load parties when country is selected
  const { data: partiesRes } = useApi<{ parties: { id: string; name: string; shortName: string; color: string }[] }>({
    url: countryId ? `/api/countries/${countryId}/parties` : "",
  });
  const parties = partiesRes?.parties ?? [];

  // Auto-select first country
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
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-lg">
        {/* Progress indicator */}
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className={`flex items-center gap-2 text-sm ${step >= 1 ? "text-primary font-medium" : "text-muted-foreground"}`}>
            <span className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${step >= 1 ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>1</span>
            Account
          </div>
          <div className={`h-0.5 w-12 ${step >= 2 ? "bg-primary" : "bg-border"}`} />
          <div className={`flex items-center gap-2 text-sm ${step >= 2 ? "text-primary font-medium" : "text-muted-foreground"}`}>
            <span className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${step >= 2 ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>2</span>
            Politician
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{step === 1 ? "Create your account" : "Create your politician"}</CardTitle>
            <CardDescription>
              {step === 1 ? "Sign up to enter the world of PolitySim." : "Who will you be in the political arena?"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 1 ? (
              <form onSubmit={nextStep} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="displayName" className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Display name</Label>
                  <Input id="displayName" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> Email</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Password</Label>
                  <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
                </div>
                <Button type="submit" className="w-full">
                  Continue <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </form>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="politicianName" className="flex items-center gap-1.5"><Vote className="h-3.5 w-3.5" /> Politician name</Label>
                  <Input id="politicianName" required value={politicianName} onChange={(e) => setPoliticianName(e.target.value)} placeholder="e.g. Alex Rivera" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="country">Country</Label>
                    <select id="country" value={countryId} onChange={(e) => setCountryId(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="homeRegion" className="flex items-center gap-1.5"><Flag className="h-3.5 w-3.5" /> Home region</Label>
                    <Input id="homeRegion" required value={homeRegion} onChange={(e) => setHomeRegion(e.target.value)} placeholder="e.g. California" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ideology">Ideology</Label>
                  <select id="ideology" value={ideology} onChange={(e) => setIdeology(e.target.value as typeof ideology)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    {IDEOLOGIES.map((i) => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="party">Party (optional)</Label>
                  <select id="party" value={partyId} onChange={(e) => setPartyId(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">Independent</option>
                    {parties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep(1)}>
                    <ChevronLeft className="mr-1 h-4 w-4" /> Back
                  </Button>
                  <Button type="submit" className="flex-1" disabled={submitting}>
                    {submitting ? "Creating…" : "Create account & enter politics"}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account? <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
