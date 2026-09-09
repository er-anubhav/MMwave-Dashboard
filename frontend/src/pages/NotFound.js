import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import EmptyState from "../components/ui/EmptyState";
import { Compass } from "lucide-react";
import { Card, CardContent } from "../components/ui/card";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md rounded-lg border border-border bg-card">
        <CardContent>
          <EmptyState
            icon={<Compass className="h-5 w-5" />}
            title="Page not found"
            description="The page you're looking for doesn't exist or has been moved."
            action={
              <Link to="/">
                <Button variant="outline">Back to Overview</Button>
              </Link>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}