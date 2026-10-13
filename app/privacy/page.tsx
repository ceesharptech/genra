import type { Metadata } from 'next';
import Link from 'next/link';
import { siteConfig } from '@/lib/site-config';
import { PostHogOptOut } from '@/components/analytics/posthog-opt-out';

export const metadata: Metadata = {
  title: 'Privacy Policy · Genra',
  description: 'How Genra collects, uses, and protects your data, and your rights to export or delete your information.',
  alternates: {
    canonical: `${siteConfig.url}/privacy`,
  },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 space-y-10">
        {/* Header */}
        <header className="space-y-3 border-b border-border/60 pb-8">
          <div className="inline-flex items-center rounded-md bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-foreground">
            Privacy &amp; Data Rights
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="text-xs text-muted-foreground">
            Last Updated: {siteConfig.lastUpdated} &middot; Effective Date: {siteConfig.lastUpdated}
          </p>
        </header>

        {/* Content */}
        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">1. Overview and Core Philosophy</h2>
            <p>
              {siteConfig.legalName} (&ldquo;{siteConfig.name}&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) respects your privacy. We are committed to minimizing data collection, avoiding invasive tracking, and giving creators total ownership over their personal information and generated works.
            </p>
            <p>
              We do not sell user data. We do not run third-party advertising networks. We do not profile visitors across the web.
            </p>
          </section>

          {/* Interactive Opt-out Callout */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">2. Telemetry and Analytics Controls</h2>
            <p>
              We collect anonymous, reverse-proxied usage metrics to monitor platform health, discover errors, and measure feature adoption. We do not store persistent cookies for tracking, nor do we record screen sessions or keystrokes.
            </p>
            <div className="pt-2">
              <PostHogOptOut />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">3. Information We Collect</h2>
            <div className="space-y-2">
              <h3 className="font-medium text-foreground">Account Information</h3>
              <p>
                When you sign up, we collect your email address via Supabase Auth for authentication (magic links or one-time codes). During onboarding, you choose a username and optional profile details (display name, avatar, bio, headline, website, and social links).
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-foreground">User Content &amp; Media</h3>
              <p>
                We store the content you intentionally create and publish on {siteConfig.name}: creation metadata, cover imagery, process steps, prompts, external resource links, tool tags, and curated collections.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-foreground">Technical and Operational Logs</h3>
              <p>
                When you browse the platform, our hosting infrastructure (Vercel and Supabase) automatically records standard HTTP access logs (IP address, user agent, requested paths, and timestamps) solely for security, abuse detection, and rate limiting.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">4. How We Use Information</h2>
            <p>We use your information exclusively to:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Authenticate your account and preserve your session state.</li>
              <li>Deliver, render, and display your AI creations and curated library items.</li>
              <li>Enforce our Content Policy and prevent spam, abuse, or unauthorized direct writes.</li>
              <li>Allow you to download your full archive or permanently delete your account.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">5. Service Providers &amp; Data Processors</h2>
            <p>We rely on trusted, industry-standard infrastructure providers to run {siteConfig.name}:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <strong className="text-foreground">Supabase:</strong> Database hosting, user authentication, and media storage (PostgreSQL hosted in the EU).
              </li>
              <li>
                <strong className="text-foreground">Vercel:</strong> Edge hosting, serverless compute, and static delivery.
              </li>
              <li>
                <strong className="text-foreground">PostHog:</strong> Privacy-centric, self-configured analytics running in cookieless memory mode behind a reverse proxy.
              </li>
              <li>
                <strong className="text-foreground">Sentry:</strong> Application error tracking with PII scrubbing and zero session replay.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">6. Your Rights: Export and Erasure</h2>
            <p>
              Regardless of your geographic location, {siteConfig.name} extends comprehensive data rights to every registered user:
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <strong className="text-foreground">Right of Access and Portability:</strong> You can download a complete, machine-readable JSON archive of your account, creations, steps, prompts, resources, and collections at any time from your{' '}
                <Link href="/settings" className="text-foreground underline hover:text-brand">
                  Account Settings
                </Link>.
              </li>
              <li>
                <strong className="text-foreground">Right to Erasure (Deletion):</strong> You can permanently delete your account and all associated user data directly in your Account Settings. This immediately cleans up your media assets, purges database records, and terminates your authentication identity.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">7. Security Measures</h2>
            <p>
              We implement defense-in-depth security including PostgreSQL Row Level Security (RLS) on all public tables, strict column-level write grants, signed session tokens, encrypted HTTPS connections, and security-definer procedures with pinned search paths.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">8. Privacy Inquiries and Contact</h2>
            <p>
              If you have any questions, requests, or concerns regarding your privacy or data protection on {siteConfig.name}, please contact our data team at{' '}
              <a href={`mailto:${siteConfig.legalEmail}`} className="text-foreground underline hover:text-brand">
                {siteConfig.legalEmail}
              </a>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
