import { Link } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <AppShell>
      <div className="text-center py-24">
        <h1 className="text-6xl font-semibold mb-2">404</h1>
        <p className="text-muted-foreground mb-6">This page doesn't exist in any simulated jurisdiction.</p>
        <Button asChild>
          <Link to="/">Return to the homepage</Link>
        </Button>
      </div>
    </AppShell>
  );
}