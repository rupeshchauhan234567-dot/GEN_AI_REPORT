const express = require("express");
const router = express.Router();

const authUser = require("../middlewares/auth.middleware");

const {
  dashboard,
  listItems,
  createItem,
  updateItem,
  deleteItem,
  aiGenerate,
  chat
} = require("../controllers/workspace.controller");

router.use(authUser);

router.get("/dashboard", dashboard);

router.get("/items", listItems);
router.post("/items", createItem);
router.patch("/items/:id", updateItem);
router.delete("/items/:id", deleteItem);

router.post("/ai/generate", aiGenerate);
router.post("/ai/chat", chat);

module.exports = router;