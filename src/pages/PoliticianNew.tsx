import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApi } from "@/hooks/useApi";

const IDEOLOGIES = ["far-left", "left", "center-left", "center", "center-right", "right", "far-right"] as const;

interface Party { id: string; name: string; shortName: string; color: string; }
interface Country { id: string; name: string; code: string; }

export default function PoliticianNew() {
  const navigate = useNavigate();
  const { data: countriesRes } = useApi<{ countries: Country[] }>({ url: "/api/countries" });
  const countries = countriesRes?.countries ?? [];
  const [countryId, setCountryId] = useState("");
  const [name, setName] = useState("");
  const [ideology, setIdeology] = useState<(typeof IDEOLOGIES)[number]>("center");
  const [partyId, setPartyId] = useState("");
  const [homeRegion, setHomeRegion] = useState("");
  const { data: partiesRes } = useApi<{ parties: Party[] }>({
    url: countryId ? `/api/countries/${countryId}/parties` : "",
  });
  const parties = partiesRes?.parties ?? [];
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (countries?.length && !countryId) setCountryId(countries[0].id); }, [countries, countryId]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/politicians", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countryId, name, ideology, partyId: partyId || null, homeRegion }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Could not create politician");
        return;
      }
      const data = await res.json();
      toast.success(`${name} is ready to run`);
      navigate(`/politicians/${data.politician.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <Button variant="ghost" size="sm" asChild className="mb-3"><Link to="/dashboard"><ArrowLeft className="h-4 w-4" /> Back</Link></Button>
        <Card>
          <CardHeader>
            <CardTitle>Create a politician</CardTitle>
            <CardDescription>You can change most stats later by taking actions.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" required minLength={2} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Alex Rivera" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="country">Country</Label>
                  <select id="country" value={countryId} onChange={(e) => setCountryId(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    {countries?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="region">Home region</Label>
                  <Input id="region" required value={homeRegion} onChange={(e) => setHomeRegion(e.target.value)} placeholder="e.g. California" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ideology">Ideology</Label>
                  <select id="ideology" value={ideology} onChange={(e) => setIdeology(e.target.value as typeof ideology)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    {IDEOLOGIES.map((i) => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="party">Party (optional)</Label>
                  <select id="party" value={partyId} onChange={(e) => setPartyId(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={!parties?.length}>
                    <option value="">Independent</option>
                    {parties?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              <Button type="submit" disabled={submitting}><Save className="h-4 w-4" /> {submitting ? "Creating…" : "Create politician"}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}