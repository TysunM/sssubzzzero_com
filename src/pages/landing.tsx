import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Landing() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center">
            Welcome to SubZero
          </CardTitle>
          <CardDescription className="text-center pt-2">
            Your universal subscription tracker.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <p className="text-center text-sm text-muted-foreground">
            Please log in to continue.
          </p>
          <Button className="w-full">
            Login / Sign Up
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}