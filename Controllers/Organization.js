import db from "../db/db.js";

const formatResponse = (status, message, data = null, error = null, response_token = null) => {
  return {
    status: status ? 1 : 0,
    message,
    error,
    data,
    response_token
  };
};

// CREATE - Add new organization
export const add = async (req, res) => {
  try {
    const { name, code } = req.body;

    // Validation
    if (!name || !code) {
      return res.status(400).json(
        formatResponse(0, "Name and code are required", null, "Missing required fields")
      );
    }

    const query = "INSERT INTO organization (name, code) VALUES (?, ?)";
    const [result] = await db.execute(query, [name, code]);

    res.status(201).json(
      formatResponse(1, "Organization created successfully", {
        id: result.insertId,
        name,
        code
      })
    );
  } catch (error) {
    res.status(500).json(
      formatResponse(0, "Error creating organization", null, error.message)
    );
  }
};

// READ - Get all organizations
export const list = async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM organization");
    
    res.json({
      status: 1,
      message: "Organizations retrieved successfully",
      data: rows,
      error: null,
      response_token: null
    });
  } catch (error) {
    console.error("Error retrieving organizations:", error);
    res.status(500).json({
      status: 0,
      message: "Error retrieving data",
      error: error.message,
      data: null,
      response_token: null
    });
  }
};

// READ - Get organization by ID
export const view = async (req, res) => {
  try {
    const { id } = req.params;

    const query = "SELECT * FROM organization WHERE id = ?";
    const [rows] = await db.execute(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json(
        formatResponse(0, "Organization not found", null, "No organization with this ID")
      );
    }

    res.json(formatResponse(1, "Organization fetched successfully", rows[0]));
  } catch (error) {
    res.status(500).json(
      formatResponse(0, "Error retrieving organization", null, error.message)
    );
  }
};

// UPDATE - Update organization
export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code } = req.body;

    // Check if organization exists
    const [existing] = await db.execute("SELECT * FROM organization WHERE id = ?", [id]);
    
    if (existing.length === 0) {
      return res.status(404).json(
        formatResponse(0, "Organization not found", null, "No organization with this ID")
      );
    }

    // Build update query dynamically based on provided fields
    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push("name = ?");
      values.push(name);
    }
    if (code !== undefined) {
      updates.push("code = ?");
      values.push(code);
    }

    if (updates.length === 0) {
      return res.status(400).json(
        formatResponse(0, "No fields to update", null, "Provide at least one field to update")
      );
    }

    values.push(id);
    const query = `UPDATE organization SET ${updates.join(", ")} WHERE id = ?`;
    
    await db.execute(query, values);

    // Fetch updated record
    const [updated] = await db.execute("SELECT * FROM organization WHERE id = ?", [id]);

    res.json(formatResponse(1, "Organization updated successfully", updated[0]));
  } catch (error) {
    res.status(500).json(
      formatResponse(0, "Error updating organization", null, error.message)
    );
  }
};

// DELETE - Delete organization
export const deleteOrganization = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if organization exists
    const [existing] = await db.execute("SELECT * FROM organization WHERE id = ?", [id]);
    
    if (existing.length === 0) {
      return res.status(404).json(
        formatResponse(0, "Organization not found", null, "No organization with this ID")
      );
    }

    const query = "DELETE FROM organization WHERE id = ?";
    await db.execute(query, [id]);

    res.json(formatResponse(1, "Organization deleted successfully", { id }));
  } catch (error) {
    res.status(500).json(
      formatResponse(0, "Error deleting organization", null, error.message)
    );
  }
};