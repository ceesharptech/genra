export default function SignupLoading() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-8 bg-background">
      <div
        className="size-8 animate-spin rounded-full border-2 border-border border-t-foreground"
        role="status"
        aria-label="Loading sign up"
      />
    </div>
  )
}
