import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, UserX, Ban, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  phone_e164: string;
  phone_verified: boolean;
  status: "active" | "inactive" | "suspended";
  created_at: string;
  updated_at: string;
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const usersPerPage = 10;

  useEffect(() => {
    fetchUsers();
  }, [currentPage, searchTerm]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const from = (currentPage - 1) * usersPerPage;
      const to = from + usersPerPage - 1;

      let query = supabase
        .from("users")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      // Add search filter if search term exists
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone_e164.ilike.%${searchTerm}%`);
      }

      const { data, error, count } = await query.range(from, to);

      if (error) throw error;

      setUsers((data || []) as User[]);
      setTotalCount(count || 0);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (userId: string, newStatus: "active" | "suspended") => {
    try {
      const { error } = await supabase
        .from("users")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `User ${newStatus === "suspended" ? "suspended" : "activated"} successfully`,
      });

      fetchUsers(); // Refresh the list
    } catch (error) {
      console.error("Error updating user status:", error);
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive",
      });
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to permanently delete this user? This action cannot be undone.")) return;

    try {
      const { error } = await supabase
        .from("users")
        .delete()
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User deleted successfully",
      });

      fetchUsers(); // Refresh the list
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string, phoneVerified: boolean) => {
    if (status === "suspended") {
      return <Badge variant="destructive">Suspended</Badge>;
    }
    if (!phoneVerified) {
      return <Badge variant="secondary">Unverified</Badge>;
    }
    return <Badge variant="default">Active</Badge>;
  };

  const totalPages = Math.ceil(totalCount / usersPerPage);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchUsers();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-padding space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="heading-responsive-xl font-bold text-foreground">Users Management</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Manage all users on your platform ({totalCount} total)
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">User Search & Management</CardTitle>
          <CardDescription className="text-sm">
            Search and manage user accounts
          </CardDescription>
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 max-w-full sm:max-w-md">
            <Input
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" variant="outline" className="touch-target sm:w-auto">
              <Search className="h-4 w-4 sm:mr-0 md:mr-2" />
              <span className="hidden md:inline">Search</span>
            </Button>
          </form>
        </CardHeader>
        <CardContent>
          {/* Mobile Card View */}
          <div className="block md:hidden space-y-4">
            {users.map((user) => (
              <div key={user.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-base truncate">{user.name || "No name provided"}</p>
                    <p className="text-xs text-muted-foreground truncate mt-1">ID: {user.id.substring(0, 12)}...</p>
                  </div>
                  {getStatusBadge(user.status, user.phone_verified)}
                </div>

                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground text-xs">Email:</span>
                    <p className="text-xs truncate">{user.email || "No email"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Phone:</span>
                    <p className="text-xs font-mono">{user.phone_e164}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Joined:</span>
                    <p className="text-xs">{formatDate(user.created_at)}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  {user.status === "active" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateUserStatus(user.id, "suspended")}
                      className="flex-1 touch-target"
                    >
                      <Ban className="h-4 w-4 mr-2" />
                      Suspend
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateUserStatus(user.id, "active")}
                      className="flex-1 touch-target"
                    >
                      <UserX className="h-4 w-4 mr-2" />
                      Activate
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteUser(user.id)}
                    className="flex-1 touch-target"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">
                          {user.name || "No name provided"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ID: {user.id.substring(0, 8)}...
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.email || (
                        <span className="text-muted-foreground text-sm">No email</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {user.phone_e164}
                      </code>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(user.status, user.phone_verified)}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(user.created_at)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {user.status === "active" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateUserStatus(user.id, "suspended")}
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateUserStatus(user.id, "active")}
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteUser(user.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {/* End Desktop Table */}

          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent className="flex-wrap gap-1">
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer touch-target"}
                    />
                  </PaginationItem>

                  {Array.from({ length: Math.min(window.innerWidth < 768 ? 3 : 5, totalPages) }, (_, i) => {
                    const maxPages = window.innerWidth < 768 ? 3 : 5;
                    let pageNum;
                    if (totalPages <= maxPages) {
                      pageNum = i + 1;
                    } else if (currentPage <= Math.floor(maxPages / 2) + 1) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - Math.floor(maxPages / 2)) {
                      pageNum = totalPages - maxPages + 1 + i;
                    } else {
                      pageNum = currentPage - Math.floor(maxPages / 2) + i;
                    }

                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          onClick={() => setCurrentPage(pageNum)}
                          isActive={currentPage === pageNum}
                          className="cursor-pointer touch-target"
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer touch-target"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}