import AppShell from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp, DollarSign, Factory } from "lucide-react";

export default function Markets() {
  return (
    <AppShell>
      <div className="pb-4">
        <h1 className="text-3xl font-semibold">Markets</h1>
        <p className="text-sm text-muted-foreground">Economic indicators, commodities, and market data across simulated nations.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-primary" /> Forex</CardTitle>
            <CardDescription>Currency exchange rates vs USD</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Coming soon — currency pairs and exchange rate tracking.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> Commodities</CardTitle>
            <CardDescription>Global commodity prices</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Coming soon — oil, gas, metals, and agricultural commodities.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Factory className="h-5 w-5 text-primary" /> Corporations</CardTitle>
            <CardDescription>Simulated company stock data</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Coming soon — corporation listings, stock prices, and CEO management.</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 rounded-lg border border-dashed border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">
          The Markets system is on the roadmap. It will include corporation stocks, forex pairs,
          commodity prices, and central bank interest rates — all driven by in-game policy decisions
          and global events.
        </p>
      </div>
    </AppShell>
  );
}
