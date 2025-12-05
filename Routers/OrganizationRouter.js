import express from "express";
import {
  list,
  view,
  add,
  update,
  deleteOrganization
} from '../Controllers/Organization.js';

const router = express.Router();

// Test route
router.get("/", (req, res) => res.send("Server is running and Router is working"));

// Test hello route
router.get("/hello", (req, res) => {
  res.send("Hello World!");
});

// CREATE - Add new organization
router.post("/organization/add", add);

// READ - Get all organizations
router.get("/organization/list", list);

// READ - Get organization by ID
router.get("/organization/view/:id", view);

// UPDATE - Update organization
router.put("/organization/update/:id", update);

// DELETE - Delete organization
router.delete("/organization/delete/:id", deleteOrganization);

export { router };