import express from "express"
import cors from "cors"
import { router } from "./Routers/OrganizationRouter.js"


const app = express()
app.use(cors())
app.use(express.json())

app.use('/api/', router);

const PORT= process.env.PORT || 8081;

app.listen(PORT,'0.0.0.0', () => console.log(`Server running on port ${PORT}`));