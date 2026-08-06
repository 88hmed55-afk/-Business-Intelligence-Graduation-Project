export function Footer() {
  return (
    <footer className="border-t py-4">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-2 px-4 text-xs text-muted-foreground sm:flex-row sm:px-6">
        <p>
          &copy; {new Date().getFullYear()} Nova BI · Business Intelligence Management System
        </p>
        <p className="flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
          All systems operational
        </p>
      </div>
    </footer>
  );
}
