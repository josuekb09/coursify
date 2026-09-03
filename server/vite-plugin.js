import { handleApiRequest } from "./api.js"

export function coursifyApiPlugin() {
  return {
    name: "coursify-api",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        void handleApiRequest(req, res)
          .then((handled) => {
            if (!handled) next()
          })
          .catch(next)
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        void handleApiRequest(req, res)
          .then((handled) => {
            if (!handled) next()
          })
          .catch(next)
      })
    },
  }
}
