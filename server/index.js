import express from "express"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { handleApiRequest } from "./api.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dist = path.join(__dirname, "..", "dist")
const port = Number(process.env.PORT || 8443)

const app = express()
app.disable("x-powered-by")

app.use(async (req, res, next) => {
  if (!req.path.startsWith("/api")) return next()
  req.url = req.originalUrl
  const handled = await handleApiRequest(req, res)
  if (!handled) next()
})

app.use(express.static(dist))
app.get("*", (_req, res) => {
  res.sendFile(path.join(dist, "index.html"))
})

app.listen(port, "0.0.0.0", () => {
  console.log(`Coursify is running on port ${port}`)
})
