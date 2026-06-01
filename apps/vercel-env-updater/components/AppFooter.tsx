export function AppFooter() {
  return (
    <footer className="border-t py-8 bg-muted/30 mt-auto">
      <div className="mx-auto max-w-7xl px-6 text-center text-sm text-muted-foreground">
        Built with <span className="font-medium text-foreground">@workspace/ui</span>,{' '}
        <span className="font-medium text-foreground">@workspace/db</span> (Prisma + Postgres 18), Zustand, and Axios.
        <div className="mt-1 text-xs">
          All Vercel API calls are executed via secure Server Actions in <code className="font-mono">/server</code>.
        </div>
      </div>
    </footer>
  )
}
