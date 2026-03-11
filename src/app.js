import express from "express"
import cors from "cors"

import employeeRoutes from "./routes/employee-routes.js";

const app = express()
app.use(cors())

app.get("/", (req, res) => {
  res.send("API is running");
});

// IMPORTANT: Add both JSON and URL-encoded parsers
app.use(express.json())              // For JSON payloads
app.use(express.urlencoded({ extended: true }))  // For form-data and x-www-form-urlencoded

app.use('/api/portal/Employee', employeeRoutes);

const PORT = process.env.PORT || 8081;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));

export default app;