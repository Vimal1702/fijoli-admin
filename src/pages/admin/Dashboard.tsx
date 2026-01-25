import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileImage, AlertTriangle, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface DashboardStats {
  totalUsers: number;
  totalPosts: number;
  reportedPosts: number;
  recentSignups: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalPosts: 0,
    reportedPosts: 0,
    recentSignups: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Fetch total users
      const { count: totalUsers } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true });

      // Fetch total posts
      const { count: totalPosts } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true });

      // Fetch reported posts count
      const { count: reportedPosts } = await supabase
        .from("post_reports")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      // Fetch recent signups (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { count: recentSignups } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgo.toISOString());

      setStats({
        totalUsers: totalUsers || 0,
        totalPosts: totalPosts || 0,
        reportedPosts: reportedPosts || 0,
        recentSignups: recentSignups || 0,
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      description: "Registered users",
      icon: Users,
      color: "text-blue-600",
    },
    {
      title: "Total Posts",
      value: stats.totalPosts,
      description: "Published posts",
      icon: FileImage,
      color: "text-green-600",
    },
    {
      title: "Reported Posts",
      value: stats.reportedPosts,
      description: "Pending review",
      icon: AlertTriangle,
      color: "text-red-600",
    },
    {
      title: "New Signups",
      value: stats.recentSignups,
      description: "Last 7 days",
      icon: TrendingUp,
      color: "text-purple-600",
    },
  ];

  if (loading) {
    return (
      <div className="p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Loading...</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">--</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page-padding space-y-6">
      <div>
        <h1 className="heading-responsive-xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Overview of your fitness social media platform
        </p>
      </div>

      <div className="grid-responsive-stats">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}