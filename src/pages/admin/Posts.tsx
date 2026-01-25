import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2, MessageCircle, Heart, User } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Post {
  id: string;
  content: string;
  image_url: string | null;
  user_id: string;
  likes_count: number;
  comments_count: number;
  category: string | null;
  created_at: string;
  is_reported?: boolean;
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

export default function Posts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const postsPerPage = 10;
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);

  useEffect(() => {
    fetchPosts();
  }, [currentPage]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const from = (currentPage - 1) * postsPerPage;
      const to = from + postsPerPage - 1;

      // Fetch posts with pagination
      const { data, error, count } = await supabase
        .from("posts")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      // Check which posts are reported
      const postIds = data?.map(post => post.id) || [];
      const { data: reports } = await supabase
        .from("post_reports")
        .select("post_id")
        .in("post_id", postIds)
        .eq("status", "pending");

      const reportedPostIds = new Set(reports?.map(r => r.post_id) || []);

      const postsWithReportStatus = data?.map(post => ({
        ...post,
        is_reported: reportedPostIds.has(post.id)
      })) || [];

      setPosts(postsWithReportStatus);
      setTotalCount(count || 0);
    } catch (error) {
      console.error("Error fetching posts:", error);
      toast({
        title: "Error",
        description: "Failed to fetch posts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deletePost = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    try {
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Post deleted successfully",
      });

      fetchPosts(); // Refresh the list
    } catch (error) {
      console.error("Error deleting post:", error);
      toast({
        title: "Error",
        description: "Failed to delete post",
        variant: "destructive",
      });
    }
  };

  const openPostDetails = async (post: Post) => {
    setSelectedPost(post);
    setDetailsDialogOpen(true);

    // Fetch comments for this post
    if (post.id) {
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
          .eq("post_id", post.id)
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

  const totalPages = Math.ceil(totalCount / postsPerPage);

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
          <h1 className="heading-responsive-xl font-bold text-foreground">Posts Management</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Manage all posts on your platform ({totalCount} total)
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">All Posts</CardTitle>
          <CardDescription className="text-sm">
            View and manage posts from your users
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Mobile Card View */}
          <div className="block md:hidden space-y-4">
            {posts.map((post) => (
              <div
                key={post.id}
                className="border rounded-lg p-4 space-y-3 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => openPostDetails(post)}
              >
                <div className="flex items-start gap-3">
                  {post.image_url ? (
                    <img
                      src={post.image_url}
                      alt="Post image"
                      className="w-20 h-20 object-cover rounded-md shrink-0"
                      onClick={() => window.open(post.image_url!, '_blank')}
                    />
                  ) : (
                    <div className="w-20 h-20 bg-muted rounded-md flex items-center justify-center shrink-0">
                      <span className="text-xs text-muted-foreground">No image</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-3">{post.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">ID: {post.id.substring(0, 8)}...</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground text-xs">User ID:</span>
                    <p className="text-xs font-mono truncate">{post.user_id.substring(0, 12)}...</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Category:</span>
                    <div className="text-xs">
                      {post.category ? (
                        <Badge variant="secondary" className="mt-1">{post.category}</Badge>
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Engagement:</span>
                    <p className="text-xs">❤️ {post.likes_count} 💬 {post.comments_count}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Status:</span>
                    <div className="text-xs">
                      {post.is_reported ? (
                        <Badge variant="destructive" className="mt-1">Reported</Badge>
                      ) : (
                        <Badge variant={post.likes_count > 10 ? "default" : "secondary"} className="mt-1">
                          {post.likes_count > 10 ? "Popular" : "Normal"}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  {formatDate(post.created_at)}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePost(post.id);
                    }}
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
                  <TableHead>Content</TableHead>
                  <TableHead>Image</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Engagement</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell className="max-w-xs">
                      <div className="space-y-1">
                        <p className="text-sm">{truncateText(post.content)}</p>
                        <p className="text-xs text-muted-foreground">ID: {post.id.substring(0, 8)}...</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {post.image_url ? (
                        <img
                          src={post.image_url}
                          alt="Post image"
                          className="w-20 h-20 object-cover rounded cursor-pointer hover:opacity-80"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(post.image_url!, '_blank');
                          }}
                        />
                      ) : (
                        <span className="text-muted-foreground text-sm">No image</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {post.user_id.substring(0, 8)}...
                      </code>
                    </TableCell>
                    <TableCell>
                      {post.category ? (
                        <Badge variant="secondary">{post.category}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">Uncategorized</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        <div>❤️ {post.likes_count}</div>
                        <div>💬 {post.comments_count}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {post.is_reported ? (
                        <Badge variant="destructive">Reported</Badge>
                      ) : (
                        <Badge variant={post.likes_count > 10 ? "default" : "secondary"}>
                          {post.likes_count > 10 ? "Popular" : "Normal"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(post.created_at)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePost(post.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
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

      {/* Post Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Post Details</DialogTitle>
            <DialogDescription>
              Complete information about this post
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh] pr-4">
            {selectedPost ? (
              <div className="space-y-6">
                {/* Post Image */}
                {selectedPost.image_url && (
                  <div className="rounded-lg overflow-hidden border">
                    <img
                      src={selectedPost.image_url}
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
                    {selectedPost.content}
                  </p>
                </div>

                {/* Post Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Heart className="h-4 w-4" />
                      <span className="text-xs">Likes</span>
                    </div>
                    <p className="text-2xl font-bold">{selectedPost.likes_count}</p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <MessageCircle className="h-4 w-4" />
                      <span className="text-xs">Comments</span>
                    </div>
                    <p className="text-2xl font-bold">{selectedPost.comments_count}</p>
                  </div>
                </div>

                {/* Post Information */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Post Information</h3>
                  <div className="space-y-2 text-sm">
                    {selectedPost.category && (
                      <div>
                        <span className="text-muted-foreground">Category:</span>
                        <div className="mt-1">
                          <Badge variant="secondary">{selectedPost.category}</Badge>
                        </div>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">Posted on:</span>
                      <p className="mt-1">{formatDate(selectedPost.created_at)}</p>
                    </div>
                    {selectedPost.is_reported && (
                      <div>
                        <Badge variant="destructive">This post has been reported</Badge>
                      </div>
                    )}
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
                <p>Post not found</p>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}