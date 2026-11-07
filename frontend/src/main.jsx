import { ClerkProvider } from '@clerk/react'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles.css'
import { ThemeProvider } from './components/ui/theme/ThemeProvider'

function ConfigurationRequired() {
  return (
    <main className="min-h-screen bg-canvas p-8 text-foreground">
      <section className="mx-auto max-w-xl rounded-lg border border-border bg-surface p-6">
        <h1 className="text-xl font-semibold">Authentication configuration required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Set <code className="rounded bg-surface-muted px-1">VITE_CLERK_PUBLISHABLE_KEY</code> in
          <code className="rounded bg-surface-muted px-1">frontend/.env</code>, then restart Vite.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          The content review, evidence, and release pages require an authenticated Clerk account
          mapped to a BRANDCORE workspace.
        </p>
      </section>
    </main>
  )
}

const publishableKey =
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      {publishableKey ? (
        <ClerkProvider publishableKey={publishableKey} afterSignOutUrl="/">
          <App />
        </ClerkProvider>
      ) : (
        <ConfigurationRequired />
      )}
    </ThemeProvider>
  </React.StrictMode>
)
