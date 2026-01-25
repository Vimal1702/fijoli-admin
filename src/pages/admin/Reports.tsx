import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Eye, ExternalLink, MessageCircle, Heart, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ReportedPost {
  id: string;
  post_id: string;
  reported_by: string;
  reason: string | null;
  status: "pending" | "resolved" | "dismissed";
  created_at: string;
  post: {
    content: string;
    image_url: string | null;
    user_id: string;
    likes_count: number;
    comments_count: number;
  } | null;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  users?: {
    name: string;
  };
}
export default function Reports() {
  const [reports, setReports] = useState<ReportedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<{ postId: string; reportId: string } | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<ReportedPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("post_reports")
        .select(`
          id,
          post_id,
          reported_by,
          reason,
          status,
          created_at,
          posts:post_id (
            content,
            image_url,
            user_id,
            likes_count,
            comments_count
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Transform the data to match our interface
      const transformedReports = (data?.map(report => ({
        ...report,
        post: report.posts,
        status: report.status as "pending" | "resolved" | "dismissed"
      })) || []) as ReportedPost[];

      setReports(transformedReports);
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast({
        title: "Error",
        description: "Failed to fetch reports",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateReportStatus = async (reportId: string, status: "resolved" | "dismissed") => {
    try {
      const { error } = await supabase
        .from("post_reports")
        .update({ status })
        .eq("id", reportId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Report ${status} successfully`,
      });

      fetchReports(); // Refresh the list
    } catch (error) {
      console.error("Error updating report status:", error);
      toast({
        title: "Error",
        description: "Failed to update report status",
        variant: "destructive",
      });
    }
  };

  const openDeleteDialog = (postId: string, reportId: string) => {
    setPostToDelete({ postId, reportId });
    setDeleteDialogOpen(true);
  };

  const deleteReportedPost = async () => {
    if (!postToDelete) return;

    try {
      // Delete the post
      const { error: postError } = await supabase
        .from("posts")
        .delete()
        .eq("id", postToDelete.postId);

      if (postError) throw postError;

      // Mark report as resolved
      await updateReportStatus(postToDelete.reportId, "resolved");

      toast({
        title: "Success",
        description: "Reported post deleted successfully",
      });

      fetchReports(); // Refresh the list
    } catch (error) {
      console.error("Error deleting reported post:", error);
      toast({
        title: "Error",
        description: "Failed to delete reported post",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setPostToDelete(null);
    }
  };

  const openPostDetails = async (report: ReportedPost) => {
    setSelectedPost(report);
    setDetailsDialogOpen(true);

    // Fetch comments for this post
    if (report.post_id) {
      try {
        const { data, error } = await supabase
          .from("post_comments")
          .select(`
            id,
            content,
            created_at,
            user_id,
            users:user_id (name)
          `)
          .eq("post_id", report.post_id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setComments((data as any) || []);
      } catch (error) {
        console.error("Error fetching comments:", error);
        setComments([]);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "resolved":
        return <Badge variant="default">Resolved</Badge>;
      case "dismissed":
        return <Badge variant="outline">Dismissed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const pendingReports = reports.filter(report => report.status === "pending");
  const resolvedReports = reports.filter(report => report.status !== "pending");

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
          <h1 className="heading-responsive-xl font-bold text-foreground">Reported Posts</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Review and manage reported content ({pendingReports.length} pending)
          </p>
        </div>
      </div>

      {/* Pending Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <Badge variant="destructive">{pendingReports.length}</Badge>
            Pending Reports
          </CardTitle>
          <CardDescription className="text-sm">
            Reports that require your review and action
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingReports.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No pending reports! 🎉</p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="block md:hidden space-y-4">
                {pendingReports.map((report) => (
                  <div
                    key={report.id}
                    className="border rounded-lg p-4 space-y-3 cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => openPostDetails(report)}
                  >
                    {report.post && (
                      <div className="flex items-start gap-3">
                        {report.post.image_url ? (
                          <img
                            src={report.post.image_url}
                            alt="Post image"
                            className="w-20 h-20 object-cover rounded-md shrink-0"
                            onClick={() => window.open(report.post?.image_url!, '_blank')}
                          />
                        ) : (
                          <div className="w-20 h-20 bg-muted rounded-md flex items-center justify-center shrink-0">
                            <span className="text-xs text-muted-foreground">No image</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-3">{report.post.content}</p>
                          <p className="text-xs text-muted-foreground mt-1">❤️ {report.post.likes_count} 💬 {report.post.comments_count}</p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground text-xs">Reporter ID:</span>
                        <p className="text-xs font-mono truncate">{report.reported_by.substring(0, 16)}...</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Reason:</span>
                        <p className="text-xs">{report.reason || "No reason provided"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Reported:</span>
                        <p className="text-xs">{formatDate(report.created_at)}</p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateReportStatus(report.id, "dismissed")}
                        className="flex-1 touch-target"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Dismiss
                      </Button>
                      {report.post && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => openDeleteDialog(report.post_id, report.id)}
                          className="flex-1 touch-target"
                        >
                          Delete Post
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Post Content</TableHead>
                      <TableHead>Image</TableHead>
                      <TableHead>Reporter</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Reported</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="max-w-xs">
                          {report.post ? (
                            <div className="space-y-2">
                              <p className="text-sm">{truncateText(report.post.content)}</p>
                              <div className="flex gap-4 text-xs text-muted-foreground">
                                <span>❤️ {report.post.likes_count}</span>
                                <span>💬 {report.post.comments_count}</span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Post ID: {report.post_id.substring(0, 8)}...
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">Post deleted</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {report.post?.image_url ? (
                            <div className="flex items-center space-x-2">
                              <img
                                src={report.post.image_url}
                                alt="Post image"
                                className="w-12 h-12 object-cover rounded-md"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(report.post?.image_url!, '_blank')}
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">No image</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {report.reported_by.substring(0, 8)}...
                          </code>
                        </TableCell>
                        <TableCell>
                          {report.reason ? (
                            <span className="text-sm">{report.reason}</span>
                          ) : (
                            <span className="text-muted-foreground text-sm">No reason provided</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(report.created_at)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateReportStatus(report.id, "dismissed");
                              }}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Dismiss
                            </Button>
                            {report.post && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDeleteDialog(report.post_id, report.id);
                                }}
                              >
                                Delete Post
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* End Desktop Table */}
            </>
          )}
        </CardContent>
      </Card>

      {/* Resolved Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Recent Actions</CardTitle>
          <CardDescription className="text-sm">
            Recently resolved or dismissed reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          {resolvedReports.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground">No recent actions</p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="block md:hidden space-y-4">
                {resolvedReports.slice(0, 5).map((report) => (
                  <div key={report.id} className="border rounded-lg p-4 space-y-2">
                    <div>
                      <span className="text-muted-foreground text-xs">Content:</span>
                      <p className="text-sm mt-1">
                        {report.post ? (
                          truncateText(report.post.content, 80)
                        ) : (
                          <span className="text-muted-foreground">Post deleted</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-muted-foreground text-xs">Status:</span>
                        <div className="mt-1">{getStatusBadge(report.status)}</div>
                      </div>
                      <div className="text-right">
                        <span className="text-muted-foreground text-xs">Date:</span>
                        <p className="text-xs mt-1">{formatDate(report.created_at)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Post Content</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resolvedReports.slice(0, 5).map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>
                          {report.post ? (
                            truncateText(report.post.content)
                          ) : (
                            <span className="text-muted-foreground">Post deleted</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(report.status)}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(report.created_at)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* End Desktop Table */}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Reported Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this reported post? This action cannot be undone.
              The post will be permanently removed from the platform.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPostToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteReportedPost}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Post
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Post Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Reported Post Details</DialogTitle>
            <DialogDescription>
              Complete information about this reported post
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh] pr-4">
            {selectedPost?.post ? (
              <div className="space-y-6">
                {/* Post Image */}
                {selectedPost.post.image_url && (
                  <div className="rounded-lg overflow-hidden border">
                    <img
                      src={selectedPost.post.image_url}
                      alt="Post content"
                      className="w-full h-auto max-h-96 object-contain bg-muted"
                    />
                  </div>
                )}

                {/* Post Content */}
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Post Caption
                  </h3>
                  <p className="text-sm bg-muted p-4 rounded-lg whitespace-pre-wrap">
                    {selectedPost.post.content}
                  </p>
                </div>

                {/* Post Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Heart className="h-4 w-4" />
                      <span className="text-xs">Likes</span>
                    </div>
                    <p className="text-2xl font-bold">{selectedPost.post.likes_count}</p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <MessageCircle className="h-4 w-4" />
                      <span className="text-xs">Comments</span>
                    </div>
                    <p className="text-2xl font-bold">{selectedPost.post.comments_count}</p>
                  </div>
                </div>

                {/* Report Information */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Report Information</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Reported by:</span>
                      <p className="font-mono text-xs mt-1">{selectedPost.reported_by}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Reason:</span>
                      <p className="mt-1">{selectedPost.reason || "No reason provided"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Reported on:</span>
                      <p className="mt-1">{formatDate(selectedPost.created_at)}</p>
                    </div>
                  </div>
                </div>

                {/* Comments Section */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Comments ({comments.length})
                  </h3>
                  {comments.length > 0 ? (
                    <div className="space-y-3">
                      {comments.map((comment) => (
                        <div key={comment.id} className="bg-muted p-3 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">
                              {comment.users?.name || "Unknown User"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(comment.created_at)}
                            </span>
                          </div>
                          <p className="text-sm">{comment.content}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No comments on this post
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Post has been deleted</p>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}