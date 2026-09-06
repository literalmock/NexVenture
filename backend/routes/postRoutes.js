import { Router } from "express";
import {
  addComment,
  createPost,
  deleteComment,
  deletePost,
  getFeedPosts,
  getPostComments,
  getPostsByUser,
  likePost,
} from "../controllers/postController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", getFeedPosts); // Public feed
router.get("/user/:userId", getPostsByUser); // Posts by a specific user
router.post("/", requireAuth, createPost); // Create post (auth required)
router.patch("/:id/like", requireAuth, likePost); // Like/unlike (auth required)
router.get("/:id/comments", getPostComments); // Paginated comment history (public)
router.post("/:id/comments", requireAuth, addComment); // Add comment (auth required)
router.delete("/:id/comments/:commentId", requireAuth, deleteComment); // Delete comment (auth required)
router.delete("/:id", requireAuth, deletePost); // Delete own post (auth required)

export default router;
