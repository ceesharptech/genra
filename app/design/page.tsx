import { notFound } from 'next/navigation'
import Image from 'next/image'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ThemeToggle } from '@/components/theme-toggle'
import { GateDemo } from '@/components/auth/gate-demo'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default function DesignPage() {
  // In production, this dev-only showcase must return notFound()
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  const brandScale = [
    {
      token: 'brand-50',
      hex: '#F4F0FF',
      bg: 'bg-brand-50',
      text: 'text-foreground',
    },
    {
      token: 'brand-100',
      hex: '#EAE3FF',
      bg: 'bg-brand-100',
      text: 'text-foreground',
    },
    {
      token: 'brand-200',
      hex: '#D8CBFF',
      bg: 'bg-brand-200',
      text: 'text-foreground',
    },
    {
      token: 'brand-300',
      hex: '#BDA6FF',
      bg: 'bg-brand-300',
      text: 'text-foreground',
    },
    {
      token: 'brand-400',
      hex: '#9D7BFF',
      bg: 'bg-brand-400',
      text: 'text-foreground',
    },
    {
      token: 'brand-500',
      hex: '#774CFF',
      bg: 'bg-brand-500',
      text: 'text-white',
      highlight: true,
    },
    {
      token: 'brand-600',
      hex: '#6236E6',
      bg: 'bg-brand-600',
      text: 'text-white',
    },
    {
      token: 'brand-700',
      hex: '#4F28BF',
      bg: 'bg-brand-700',
      text: 'text-white',
    },
    {
      token: 'brand-800',
      hex: '#3F2296',
      bg: 'bg-brand-800',
      text: 'text-white',
    },
    {
      token: 'brand-900',
      hex: '#2F1A70',
      bg: 'bg-brand-900',
      text: 'text-white',
    },
    {
      token: 'brand-950',
      hex: '#1D1048',
      bg: 'bg-brand-950',
      text: 'text-white',
    },
  ]

  return (
    <div className="mx-auto w-full max-w-7xl space-y-16 px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="border-border flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-brand font-mono text-xs font-semibold tracking-wider uppercase">
            Development Only
          </span>
          <h1 className="text-foreground text-3xl font-semibold tracking-tight">
            Genra Design System
          </h1>
          <p className="text-subtle mt-1 text-sm">
            Visual tokens, components, and contrast verification in light & dark
            themes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-subtle font-mono text-xs">Toggle Theme:</span>
          <ThemeToggle />
        </div>
      </div>

      {/* 1. Brand Palette */}
      <section className="space-y-4">
        <h2 className="text-foreground text-lg font-semibold tracking-tight">
          Brand Scale: Lavender Purple (#774CFF)
        </h2>
        <p className="text-subtle text-xs">
          Primary brand colour is #774CFF (brand-500). Used deliberately on
          &lt;10% of any view.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-11">
          {brandScale.map((item) => (
            <div
              key={item.token}
              className={`border-border flex h-24 flex-col justify-between rounded-lg border p-3 ${item.bg} ${item.text} ${
                item.highlight ? 'ring-brand ring-2 ring-offset-2' : ''
              }`}
            >
              <span className="font-mono text-xs font-semibold">
                {item.token}
              </span>
              <span className="font-mono text-[10px] opacity-80">
                {item.hex}
              </span>
            </div>
          ))}
        </div>

        {/* Brand Identity / Logo Assets */}
        <div className="border-border bg-card mt-4 flex flex-col gap-6 rounded-xl border p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="border-border bg-surface-2 flex size-16 items-center justify-center rounded-2xl border p-2 shadow-xs">
              <Image
                src="/images/genra-logo.png"
                alt="Genra Logo Mark"
                width={48}
                height={48}
                className="size-12 rounded-full"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bricolage text-foreground text-xl font-semibold tracking-tight">
                  Genra
                </span>
                <span className="border-border bg-surface-2 text-muted-foreground rounded-full border px-2 py-0.5 font-mono text-[10px]">
                  Official Mark
                </span>
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                Geometric lavender-purple &quot;G&quot; logomark rendered in vector geometry at <code className="font-mono text-[11px]">public/images/genra-logo.png</code>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 shadow-2xs">
              <Image
                src="/images/genra-logo.png"
                alt="Genra 20px"
                width={20}
                height={20}
                className="size-5 rounded-full"
              />
              <span className="font-bricolage text-xs font-semibold">Header Size (28px)</span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 shadow-2xs">
              <Image
                src="/images/genra-logo.png"
                alt="Genra 16px"
                width={16}
                height={16}
                className="size-4 rounded-full"
              />
              <span className="font-mono text-[11px] text-muted-foreground">Favicon (16/32px)</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Surfaces & Neutrals */}
      <section className="space-y-4">
        <h2 className="text-foreground text-lg font-semibold tracking-tight">
          Surfaces & Neutrals (Monochrome First)
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
          <div className="border-border bg-background space-y-1 rounded-lg border p-4">
            <p className="font-mono text-xs font-medium">background</p>
            <p className="text-subtle text-[11px]">Default canvas</p>
          </div>
          <div className="border-border bg-card space-y-1 rounded-lg border p-4">
            <p className="font-mono text-xs font-medium">card</p>
            <p className="text-subtle text-[11px]">Containers</p>
          </div>
          <div className="border-border bg-surface space-y-1 rounded-lg border p-4">
            <p className="font-mono text-xs font-medium">surface</p>
            <p className="text-subtle text-[11px]">Subtle sections</p>
          </div>
          <div className="border-border bg-surface-2 space-y-1 rounded-lg border p-4">
            <p className="font-mono text-xs font-medium">surface-2</p>
            <p className="text-subtle text-[11px]">Badges / hovers</p>
          </div>
          <div className="border-border bg-accent space-y-1 rounded-lg border p-4">
            <p className="font-mono text-xs font-medium">accent</p>
            <p className="text-subtle text-[11px]">Neutral hover</p>
          </div>
          <div className="border-border bg-primary text-primary-foreground space-y-1 rounded-lg border p-4">
            <p className="font-mono text-xs font-medium">primary</p>
            <p className="text-[11px] opacity-80">Soft black action</p>
          </div>
        </div>
      </section>

      {/* 3. Typography Scale */}
      <section className="space-y-4">
        <h2 className="text-foreground text-lg font-semibold tracking-tight">
          Typography Scale (Geist Sans & Mono)
        </h2>
        <div className="border-border divide-border bg-card divide-y rounded-xl border">
          <div className="flex flex-col justify-between gap-2 p-4 md:flex-row md:items-baseline">
            <span className="text-subtle w-32 shrink-0 font-mono text-xs">
              display (48px)
            </span>
            <p className="text-4xl font-semibold tracking-tight md:text-5xl">
              AI Process Reimagined
            </p>
          </div>
          <div className="flex flex-col justify-between gap-2 p-4 md:flex-row md:items-baseline">
            <span className="text-subtle w-32 shrink-0 font-mono text-xs">
              h1 (36px)
            </span>
            <h1 className="text-3xl font-semibold tracking-tight">
              Explore AI Creations
            </h1>
          </div>
          <div className="flex flex-col justify-between gap-2 p-4 md:flex-row md:items-baseline">
            <span className="text-subtle w-32 shrink-0 font-mono text-xs">
              h2 (28px)
            </span>
            <h2 className="text-2xl font-semibold tracking-tight">
              Featured Workflows
            </h2>
          </div>
          <div className="flex flex-col justify-between gap-2 p-4 md:flex-row md:items-baseline">
            <span className="text-subtle w-32 shrink-0 font-mono text-xs">
              h3 (22px)
            </span>
            <h3 className="text-xl font-semibold tracking-tight">
              Step-by-step Execution
            </h3>
          </div>
          <div className="flex flex-col justify-between gap-2 p-4 md:flex-row md:items-baseline">
            <span className="text-subtle w-32 shrink-0 font-mono text-xs">
              body-lg (18px)
            </span>
            <p className="text-foreground text-lg">
              Learn directly from prompts and tools used by real builders.
            </p>
          </div>
          <div className="flex flex-col justify-between gap-2 p-4 md:flex-row md:items-baseline">
            <span className="text-subtle w-32 shrink-0 font-mono text-xs">
              body (16px)
            </span>
            <p className="text-foreground text-base">
              Default body text rendered in clean Geist Sans with comfortable
              line height.
            </p>
          </div>
          <div className="flex flex-col justify-between gap-2 p-4 md:flex-row md:items-baseline">
            <span className="text-subtle w-32 shrink-0 font-mono text-xs">
              small (14px)
            </span>
            <p className="text-subtle text-sm">
              Metadata, form labels, tool versions, and auxiliary guidance.
            </p>
          </div>
          <div className="flex flex-col justify-between gap-2 p-4 md:flex-row md:items-baseline">
            <span className="text-subtle w-32 shrink-0 font-mono text-xs">
              mono (13px)
            </span>
            <p className="bg-surface-2 border-border inline-block rounded border px-2 py-1 font-mono text-xs">
              claude-3-7-sonnet --temperature 0.2
            </p>
          </div>
        </div>
      </section>

      {/* 4. Buttons */}
      <section className="space-y-4">
        <h2 className="text-foreground text-lg font-semibold tracking-tight">
          Buttons (Variants, Rounded Pills &amp; Loading States)
        </h2>
        <p className="text-subtle text-xs">
          All buttons use pill geometry (rounded-full) with inline loading spinners replacing action text when busy.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="default">Primary Soft-Black</Button>
          <Button variant="brand">Brand Action (Publish)</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link Style</Button>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button size="sm">Small (32px)</Button>
          <Button size="default">Default (36px)</Button>
          <Button size="md">Medium (40px)</Button>
          <Button size="lg">Large (44px)</Button>
          <Button size="icon" aria-label="Icon button">
            G
          </Button>
        </div>

        <div className="space-y-2 pt-2">
          <p className="text-foreground text-xs font-medium">Loading Spinner States (spinner replaces busy text)</p>
          <div className="flex flex-wrap items-center gap-3">
            <Button loading variant="default">Primary Loading</Button>
            <Button loading variant="brand">Brand Loading</Button>
            <Button loading variant="secondary">Secondary Loading</Button>
            <Button loading variant="outline">Outline Loading</Button>
          </div>
        </div>
      </section>

      {/* 5. Inputs & Textarea */}
      <section className="space-y-4">
        <h2 className="text-foreground text-lg font-semibold tracking-tight">
          Inputs & Forms
        </h2>
        <div className="grid max-w-2xl grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-foreground text-xs font-medium">
              Standard Input
            </label>
            <Input placeholder="e.g. Minimalist SaaS Landing Page" />
          </div>
          <div className="space-y-1.5">
            <label className="text-foreground text-xs font-medium">
              Disabled Input
            </label>
            <Input disabled value="Read-only system field" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-foreground text-xs font-medium">
              Textarea
            </label>
            <Textarea placeholder="Describe the process behind this creation..." />
          </div>
        </div>
      </section>

      {/* 6. Chips & Badges */}
      <section className="space-y-4">
        <h2 className="text-foreground text-lg font-semibold tracking-tight">
          Chips & Badges (Neutral Taxonomy)
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="default">Websites</Badge>
          <Badge variant="secondary">Next.js</Badge>
          <Badge variant="secondary">Claude Code</Badge>
          <Badge variant="outline">Tailwind CSS</Badge>
          <Badge variant="brand">Verified</Badge>
          <Badge variant="destructive">Archived</Badge>
        </div>
      </section>

      {/* 7. Creation Card Preview */}
      <section className="space-y-4">
        <h2 className="text-foreground text-lg font-semibold tracking-tight">
          Creation Card (4:3 Media Frame & Micro-Interactions)
        </h2>
        <div className="border-border bg-card hover:border-border-strong group max-w-sm space-y-3 rounded-xl border p-4 transition-colors">
          <div className="bg-surface-2 border-border/80 relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-lg border">
            <span className="text-subtle font-mono text-xs">
              4:3 Cover Media Frame
            </span>
          </div>
          <div className="space-y-1">
            <h3 className="text-foreground group-hover:text-brand text-sm font-semibold transition-colors">
              Dark Mode Portfolio Generator
            </h3>
            <p className="text-subtle line-clamp-1 text-xs">
              Autonomous agent workflow designed for modern engineering
              portfolios.
            </p>
          </div>
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5">
              <div className="bg-surface-2 border-border flex size-5 items-center justify-center rounded-full border font-mono text-[10px]">
                E
              </div>
              <span className="text-subtle text-xs">eniola</span>
            </div>
            <div className="text-subtle flex items-center gap-2 font-mono text-xs">
              <span>★ 42</span>
              <span>↗ 18</span>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Skeletons */}
      <section className="space-y-4">
        <h2 className="text-foreground text-lg font-semibold tracking-tight">
          Skeleton Pulse Patterns
        </h2>
        <div className="max-w-md space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </section>

      {/* 9. Dialog Component */}
      <section className="space-y-4">
        <h2 className="text-foreground text-lg font-semibold tracking-tight">
          Dialogs & Overlays
        </h2>
        <Dialog>
          <DialogTrigger className={cn(buttonVariants({ variant: 'outline' }))}>
            Open Test Dialog
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Genra Design Verification</DialogTitle>
              <DialogDescription>
                Testing overlay contrast, focus trap, and keyboard dismissal in
                the current theme.
              </DialogDescription>
            </DialogHeader>
            <div className="text-subtle py-4 text-xs">
              Dialog background uses the `popover` token (#FFFFFF light /
              #141417 dark) with 1px border.
            </div>
          </DialogContent>
        </Dialog>
      </section>

      {/* 10. Auth Gating & Intent Replay Demo */}
      <section className="space-y-4">
        <h2 className="text-foreground text-lg font-semibold tracking-tight">
          Auth Gating & Action Replay
        </h2>
        <GateDemo />
      </section>
    </div>
  )
}
