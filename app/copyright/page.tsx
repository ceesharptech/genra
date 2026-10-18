import type { Metadata } from 'next';
import { siteConfig } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Copyright & DMCA Policy · Genra',
  description: 'Digital Millennium Copyright Act (DMCA) notice procedure and copyright infringement policies for Genra.',
  alternates: {
    canonical: `${siteConfig.url}/copyright`,
  },
};

export default function CopyrightPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 space-y-10">
        {/* Header */}
        <header className="space-y-3 border-b border-border/60 pb-8">
          <div className="inline-flex items-center rounded-md bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-foreground">
            Intellectual Property
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Copyright &amp; DMCA Policy
          </h1>
          <p className="text-xs text-muted-foreground">
            Last Updated: {siteConfig.lastUpdated} &middot; Effective Date: {siteConfig.lastUpdated}
          </p>
        </header>

        {/* Content */}
        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">1. Policy Overview</h2>
            <p>
              {siteConfig.legalName} (&ldquo;{siteConfig.name}&rdquo;) respects the intellectual property rights of creators and copyright owners. We expect all users of the Platform to do the same.
            </p>
            <p>
              In accordance with the Digital Millennium Copyright Act of 1998 (&ldquo;DMCA&rdquo;) and applicable global copyright laws, we will respond expeditiously to legitimate notices of alleged copyright infringement submitted to our designated copyright agent.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">2. Filing a Copyright Infringement Notice</h2>
            <p>
              If you believe that your copyrighted work has been copied, displayed, or made available on {siteConfig.name} in a manner that constitutes copyright infringement, please submit a written notice to our Designated Copyright Agent containing the following information:
            </p>
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                <strong className="text-foreground">Identification of the copyrighted work:</strong> A description or link to the original work that you claim has been infringed.
              </li>
              <li>
                <strong className="text-foreground">Identification of the infringing material:</strong> The specific URL(s) on {siteConfig.name} where the alleged infringing creation, image, prompt, or resource is located.
              </li>
              <li>
                <strong className="text-foreground">Your contact information:</strong> Your full name, mailing address, telephone number, and email address.
              </li>
              <li>
                <strong className="text-foreground">Statement of good faith:</strong> A statement that you have a good faith belief that the disputed use is not authorized by the copyright owner, its agent, or the law.
              </li>
              <li>
                <strong className="text-foreground">Statement of accuracy under penalty of perjury:</strong> A statement, made under penalty of perjury, that the information provided in your notice is accurate and that you are the copyright owner or authorized to act on the copyright owner&rsquo;s behalf.
              </li>
              <li>
                <strong className="text-foreground">Signature:</strong> A physical or electronic signature of the copyright owner or authorized representative.
              </li>
            </ol>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">3. Designated Copyright Agent</h2>
            <p>Please deliver all infringement notices to our Designated Agent:</p>
            <div className="rounded-xl border border-border/80 bg-card p-5 text-xs text-foreground space-y-1 shadow-xs font-mono">
              <p className="font-semibold text-sm font-sans">{siteConfig.legalName} — Copyright Agent</p>
              <p>Email: <a href={`mailto:${siteConfig.supportEmail}`} className="underline text-brand">{siteConfig.supportEmail}</a></p>
              <p>Subject Line: &ldquo;DMCA Notice of Infringement&rdquo;</p>
              <p>Governing Jurisdiction: {siteConfig.governingLaw}</p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">4. Counter-Notice Procedure</h2>
            <p>
              If your content was removed or hidden as a result of a copyright notice and you believe this was due to a mistake or misidentification (for example, you hold appropriate licenses or fair use applies), you may submit a written Counter-Notice to our Designated Agent.
            </p>
            <p>Your Counter-Notice must include:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Identification of the material that was removed or locked, including its original URL.</li>
              <li>Your name, address, telephone number, and email address.</li>
              <li>A statement under penalty of perjury that you have a good faith belief that the material was removed or disabled as a result of mistake or misidentification.</li>
              <li>A statement that you consent to the jurisdiction of the federal or local court in your district (or where {siteConfig.legalName} is located), and that you will accept service of process from the original complaining party.</li>
              <li>Your physical or electronic signature.</li>
            </ul>
            <p>
              Upon receipt of a valid Counter-Notice, we will forward it to the original complainant. If they do not notify us within 10–14 business days that they have filed an action seeking a court order, we may restore the content.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">5. Repeat Infringer Policy</h2>
            <p>
              In accordance with the DMCA, {siteConfig.name} maintains a strict policy to terminate the accounts of users who are found to be repeat infringers of intellectual property rights.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
