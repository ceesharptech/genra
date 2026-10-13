import type { Metadata } from 'next';
import Link from 'next/link';
import { siteConfig } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Content Policy & Community Guidelines · Genra',
  description: 'Standards for creations, prompts, resources, and behavior across the Genra platform.',
  alternates: {
    canonical: `${siteConfig.url}/content-policy`,
  },
};

export default function ContentPolicyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 space-y-10">
        {/* Header */}
        <header className="space-y-3 border-b border-border/60 pb-8">
          <div className="inline-flex items-center rounded-md bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-foreground">
            Platform Standards
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Content Policy
          </h1>
          <p className="text-xs text-muted-foreground">
            Last Updated: {siteConfig.lastUpdated} &middot; Effective Date: {siteConfig.lastUpdated}
          </p>
        </header>

        {/* Content */}
        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">1. Purpose and Philosophy</h2>
            <p>
              {siteConfig.name} is a discovery, learning, and showcase platform for AI-assisted work. Our mission is to celebrate creator craftsmanship, de-mystify AI workflows, and provide transparent access to the prompts, tools, and steps behind innovative projects.
            </p>
            <p>
              To maintain a safe, high-trust environment, all content published on the Platform—including cover media, text descriptions, prompt strings, external resource links, tool metadata, and profile bios—must adhere to these guidelines.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">2. Prohibited Content</h2>
            <p>The following categories of content are strictly prohibited on {siteConfig.name}:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-foreground">Illegal Material &amp; CSAM:</strong> Any content promoting child sexual abuse or exploitation, human trafficking, terrorism, or illegal acts is subject to immediate permanent deletion, account termination, and reporting to relevant authorities.
              </li>
              <li>
                <strong className="text-foreground">Harmful, Abusive, or Threatening Content:</strong> Content that threatens, harasses, bullies, or promotes violence or hatred against individuals or protected groups.
              </li>
              <li>
                <strong className="text-foreground">Sexually Explicit Content:</strong> Non-consensual sexual content, deepfakes, or pornography. Artistic nudity is only permitted when contextually justified and in compliance with public standards.
              </li>
              <li>
                <strong className="text-foreground">Malware and Malicious Prompts:</strong> Prompts engineered to produce malicious code, exploit zero-days, bypass safety filters for harm, or links leading to phishing or malware.
              </li>
              <li>
                <strong className="text-foreground">Personal Information &amp; Doxxing:</strong> Sharing private phone numbers, home addresses, personal identification, or unredacted confidential documents without consent.
              </li>
              <li>
                <strong className="text-foreground">Deceptive Impersonation &amp; Spam:</strong> Masquerading as another creator, claiming unverified authorship of others&rsquo; work, or mass-posting promotional spam and affiliate links without substance.
              </li>
              <li>
                <strong className="text-foreground">Copyright Infringement:</strong> Publishing works, models, or assets in direct violation of intellectual property laws. See our{' '}
                <Link href="/copyright" className="text-foreground underline hover:text-brand">
                  Copyright Policy
                </Link>.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">3. Quality and Community Standards</h2>
            <p>To keep {siteConfig.name} an inspiring and educational directory:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <strong className="text-foreground">Accurate Tool &amp; Model Attribution:</strong> When posting a creation, specify the primary models, libraries, and applications used in good faith.
              </li>
              <li>
                <strong className="text-foreground">Actionable Prompts:</strong> Shared prompts should be authentic and functional rather than placeholder strings.
              </li>
              <li>
                <strong className="text-foreground">Safe Resource Links:</strong> External links shared in resources must be legitimate and relevant to the AI workflow.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">4. Reporting and Moderation Procedures</h2>
            <p>
              Any registered user can flag content using the in-app <strong>Report</strong> button available on all creations, prompts, resources, collections, and profiles.
            </p>
            <div className="space-y-2 pt-1">
              <h3 className="font-medium text-foreground">Enforcement Actions</h3>
              <p>When an item violates our guidelines, platform moderators may take the following actions:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li><strong className="text-foreground">Hide &amp; Moderation Lock:</strong> The item is immediately removed from public feeds and search results, archived, and locked. The creator cannot republish the item without moderator clearance.</li>
                <li><strong className="text-foreground">Clear Profile:</strong> For profile bio or avatar violations, the offending fields are reset to default values.</li>
                <li><strong className="text-foreground">Account Suspension:</strong> Repeated or severe violations result in account suspension or permanent termination.</li>
              </ul>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">5. Appeals Process</h2>
            <p>
              If you believe your content was moderated in error, you may file an appeal by contacting{' '}
              <a href={`mailto:${siteConfig.supportEmail}`} className="text-foreground underline hover:text-brand">
                {siteConfig.supportEmail}
              </a>{' '}
              with the creation ID or URL and an explanation. Our team reviews all appeals promptly.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
