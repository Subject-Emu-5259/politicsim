import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/hooks/useApi";
import { useLiveEvents } from "@/hooks/useLiveEvents";
import { 
  Shield, Globe, Zap, Landmark, Building2, 
  Coins, Scale, Activity, FileText, User 
} from "lucide-react";
import { toast } from "sonner";
import { fetchApi } from "@/lib/fetchClient";

interface CabinetSeat {
  id: string;
  name: string;
  type: string;
  currentMinisterId: string | null;
  ministerName: string | null;
  specialization: string;
  budgetUSD: number;
}

export default function CabinetOffice() {
  const { user } = useAuth();
  const { data: seatData, loading } = useApi<{ seats: CabinetSeat[] }>({ 
    url: "/api/cabinet/seats", 
    pollIntervalMs: 30000 
  });
  
  if (!user) return null;
  if (loading && !seatData) return <AppShell><p>Loading Cabinet Office...</p></AppShell>;

  const seats = seatData?.seats ?? [];
  const mySeat = seats.find(s => s.currentMinisterId === user.id);

  return (
    <AppShell>
      <div className="flex items-center justify-between pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cabinet Office</h1>
          <p className="text-muted-foreground">High Government Administration & Executive Dossiers</p>
        </div>
        {mySeat && (
          <div className="flex items-center gap-3 bg-primary/10 border border-primary/20 px-4 py-2 rounded-full">
            <div className="text-xs font-medium uppercase text-primary">Current Post:</div>
            <div className="text-sm font-bold">{mySeat.name}</div>
          </div>
        )}
      </div>

      <div className="grid gap-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {seats.map(seat => (
            <Card key={seat.id} className={mySeat?.id === seat.id ? "ring-2 ring-primary" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px]">{seat.type}</Badge>
                  {seat.currentMinisterId === user.id && <Badge className="bg-primary">My Post</Badge>}
                </div>
                <CardTitle className="text-lg">{seat.name}</CardTitle>
                <CardDescription>
                  {seat.ministerName ? `Minister: ${seat.ministerName}` : "Vacant"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Budget:</span>
                  <span className="font-mono">${(seat.budgetUSD / 1_000_000).toFixed(1)}M</span>
                </div>
                <Button 
                  variant="ghost" 
                  className="w-full mt-4 text-xs" 
                  asChild
                  disabled={seat.currentMinisterId !== user.id}
                >
                  <Link to={`/cabinet/office/${seat.id}`}>Open Dossier</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
