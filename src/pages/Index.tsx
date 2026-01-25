import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Users, FileImage, AlertTriangle } from "lucide-react";
import { MobileNav } from "@/components/MobileNav";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <MobileNav />
      {/* Hero Section */}
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="text-center space-y-6 md:space-y-8 max-w-4xl px-4 md:px-6">
          <div className="space-y-3 md:space-y-4">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Fitness Social Admin
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
              Powerful admin dashboard to manage your fitness social media platform.
              Monitor users, manage posts, and review reports all in one place.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center px-4">
            <Button asChild size="lg" className="text-base md:text-lg px-6 md:px-8 touch-target">
              <Link to="/admin">
                <Shield className="mr-2 h-5 w-5" />
                Access Admin Dashboard
              </Link>
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Index;
