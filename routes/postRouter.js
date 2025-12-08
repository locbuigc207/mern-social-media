const router = require("express").Router();
const auth = require("../middleware/auth");
const postCtrl = require("../controllers/postCtrl");

router.route("/posts")
  .post(auth, postCtrl.createPost)
  .get(auth, postCtrl.getPosts);

router.get("/drafts", auth, postCtrl.getDraftPosts);
router.post("/draft", auth, postCtrl.saveDraft);
router.patch("/draft/:id", auth, postCtrl.updateDraft);
router.delete("/draft/:id", auth, postCtrl.deleteDraft);
router.post("/draft/:id/publish", auth, postCtrl.publishDraft);

router.get("/scheduled-posts", auth, postCtrl.getScheduledPosts);
router.post("/schedule-post", auth, postCtrl.schedulePost);
router.patch("/scheduled-post/:id", auth, postCtrl.updateScheduledPost);
router.post("/scheduled-post/:id/cancel", auth, postCtrl.cancelScheduledPost);

router.route("/post/:id")
  .patch(auth, postCtrl.updatePost)
  .get(auth, postCtrl.getPost)
  .delete(auth, postCtrl.deletePost);

router.patch("/post/:id/like", auth, postCtrl.likePost);
router.patch("/post/:id/unlike", auth, postCtrl.unLikePost);

router.patch("/post/:id/report", auth, postCtrl.reportPost);

router.get("/user_posts/:id", auth, postCtrl.getUserPosts);

router.get("/post_discover", auth, postCtrl.getPostDiscover);

router.patch("/savePost/:id", auth, postCtrl.savePost);
router.patch("/unSavePost/:id", auth, postCtrl.unSavePost);
router.get("/getSavePosts", auth, postCtrl.getSavePost);

module.exports = router;