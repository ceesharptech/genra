import type { Metadata } from 'next';
import Link from 'next/link';
import { siteConfig } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Terms of Service · Genra',
  description: 'Terms and conditions governing the use of the Genra platform and services.',
  alternates: {
    canonical: `${siteConfig.url}/terms`,
  },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 space-y-10">
        {/* Header */}
        <header className="space-y-3 border-b border-border/60 pb-8">
          <div className="inline-flex items-center rounded-md bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-foreground">
            Legal Agreement
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Terms of Service
          </h1>
          <p className="text-xs text-muted-foreground">
            Last Updated: {siteConfig.lastUpdated} &middot; Effective Date: {siteConfig.lastUpdated}
          </p>
        </header>

        {/* Content */}
        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p>
              By accessing or using {siteConfig.name} (&ldquo;Platform&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;), provided by {siteConfig.legalName}, you agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;) and our associated policies, including our{' '}
              <Link href="/privacy" className="text-foreground underline hover:text-brand">Privacy Policy</Link>,{' '}
              <Link href="/content-policy" className="text-foreground underline hover:text-brand">Content Policy</Link>, and{' '}
              <Link href="/copyright" className="text-foreground underline hover:text-brand">Copyright Policy</Link>.
            </p>
            <p>
              If you do not agree to these Terms, you may not access or use {siteConfig.name}. You must be at least {siteConfig.minimumAge} years of age to create an account or post content on the Platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">2. Account Registration and Security</h2>
            <p>
              To publish creations, fork prompts, bookmark resources, or submit reports, you must register an account. You agree to provide accurate and current information. You are solely responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
            </p>
            <p>
              Notify us immediately at{' '}
              <a href={`mailto:${siteConfig.supportEmail}`} className="text-foreground underline hover:text-brand">
                {siteConfig.supportEmail}
              </a>{' '}
              if you discover any unauthorized use of your account.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">3. User-Generated Content &amp; License</h2>
            <p>
              Creators retain all intellectual property rights in the creations, process steps, prompts, and resources they publish on {siteConfig.name}.
            </p>
            <p>
              By submitting or posting content to public areas of {siteConfig.name}, you grant {siteConfig.legalName} a worldwide, non-exclusive, royalty-free license to host, display, reproduce, adapt, and distribute your content solely for the purpose of operating, improving, promoting, and demonstrating the Platform and its learning directory.
            </p>
            <p>
              You represent and warrant that you own or have obtained all necessary licenses, permissions, and rights to publish your content and that it does not infringe the rights of any third party.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">4. Acceptable Use and Platform Conduct</h2>
            <p>You agree not to engage in any prohibited activities on the Platform, including:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Posting unlawful, harmful, defamatory, or sexually explicit material.</li>
              <li>Impersonating another person or entity, or misleading others as to content authorship.</li>
              <li>Spamming, distributing malware, or conducting automated scraping that degrades platform performance.</li>
              <li>Circumventing platform moderation controls, locks, or rate limits.</li>
              <li>Publishing sensitive personal information (doxxing) of any individual without explicit consent.</li>
            </ul>
            <p>
              For comprehensive standards on permissible content, please review our{' '}
              <Link href="/content-policy" className="text-foreground underline hover:text-brand">
                Content Policy
              </Link>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">5. Moderation and Termination</h2>
            <p>
              We reserve the right, but have no obligation, to monitor, review, or moderate user submissions. We may remove, hide, or apply a moderation lock to any creation, prompt, resource, or profile that violates these Terms or our Content Policy, without prior notice.
            </p>
            <p>
              You may delete your account at any time via your{' '}
              <Link href="/settings" className="text-foreground underline hover:text-brand">
                Account Settings
              </Link>. Upon deletion, your personal profile, creations, and uploaded assets will be permanently removed in accordance with our deletion procedures.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">6. Disclaimers and Limitation of Liability</h2>
            <p>
              {siteConfig.name} is provided on an &ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE&rdquo; basis without warranties of any kind, whether express or implied. We do not warrant that prompts, code snippets, or AI workflows shared by users are accurate, safe, complete, or error-free.
            </p>
            <p>
              To the fullest extent permitted by applicable law, {siteConfig.legalName} and its officers, directors, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your access to or use of the Platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">7. Governing Law and Disputes</h2>
            <p>
              These Terms and any dispute arising out of or related to your use of {siteConfig.name} shall be governed by and construed in accordance with the laws of the {siteConfig.governingLaw}, without giving effect to any principles of conflicts of law.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">8. Contact Information</h2>
            <p>
              If you have any questions about these Terms, please contact us at{' '}
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
