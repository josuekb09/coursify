import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import ErrorBoundary from "./components/error-boundary"
import AppProvider from "./store"
import "./index.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppProvider>
        <App />
      </AppProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
