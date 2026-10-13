export default function HomeLoading() {
  return (
    <div className="flex min-h-[50vh] flex-1 items-center justify-center p-8">
      <div
        className="size-8 animate-spin rounded-full border-2 border-border border-t-foreground"
        role="status"
        aria-label="Loading homepage"
      />
    </div>
  )
}
