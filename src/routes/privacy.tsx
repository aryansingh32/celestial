import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Celestial Touch" },
      { name: "description", content: "Celestial Touch privacy policy. Learn what data we collect, how we use it, and your rights." },
      { name: "robots", content: "index, follow" },
    ],
  }),
  component: PrivacyPolicy,
});

function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#0c0b14] text-white px-6 py-16 font-sans">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="text-purple-400 text-sm hover:text-purple-300 transition mb-8 inline-block">
          ← Back to Celestial Touch
        </Link>

        <h1 className="text-4xl font-bold text-white mb-2" style={{ fontFamily: "Inter, sans-serif" }}>
          Privacy Policy
        </h1>
        <p className="text-white/50 text-sm mb-10">Last updated: July 2026</p>

        <div className="space-y-8 text-white/80 leading-relaxed" style={{ fontFamily: "Inter, sans-serif" }}>
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. About This Service</h2>
            <p>
              Celestial Touch is an entertainment application that provides AI-generated Vedic astrology
              and palm reading content for amusement purposes only. The readings generated are fictional
              and intended for entertainment. We are not a medical, financial, or legal advisory service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Data We Collect</h2>
            <p className="mb-3">When you use Celestial Touch, we may collect the following with your explicit consent:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-white">Camera image:</strong> A photo of your palm, used only to generate your personalised reading.</li>
              <li><strong className="text-white">Name:</strong> Your first name, used to personalise the reading output.</li>
              <li><strong className="text-white">Date of birth:</strong> Used to calculate Vedic astrology positions for entertainment purposes.</li>
              <li><strong className="text-white">Birth state &amp; city:</strong> Used to generate location-specific astrological content.</li>
              <li><strong className="text-white">Birth time (optional):</strong> Used for enhanced kundali calculations.</li>
              <li><strong className="text-white">Location (optional, only if you click "Illuminate My World"):</strong> GPS coordinates used to generate neighbourhood energy readings.</li>
              <li><strong className="text-white">Device metadata:</strong> Browser type, screen resolution, timezone — collected for fraud prevention and service improvement.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. How We Use Your Data</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>To generate your personalised entertainment reading using AI</li>
              <li>To improve the quality of our service</li>
              <li>To prevent abuse and protect the integrity of the platform</li>
            </ul>
            <p className="mt-3">
              We do <strong className="text-white">not</strong> sell your personal data to third parties.
              We do <strong className="text-white">not</strong> use your data for advertising.
              We do <strong className="text-white">not</strong> use biometric data for identification.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Camera &amp; Permissions</h2>
            <p>
              Camera access is requested solely to capture a palm image for generating the entertainment reading.
              You may deny camera access; the app will still function using manual capture or skip options.
              Images are processed and stored securely. You can request deletion of your data at any time
              by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Data Storage &amp; Security</h2>
            <p>
              Data is stored on secure servers hosted by Railway (railway.app). We implement industry-standard
              security measures. Data is retained for up to 90 days unless you request earlier deletion.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Your Rights</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Right to access your data</li>
              <li>Right to deletion of your data</li>
              <li>Right to withdraw consent at any time</li>
              <li>Right to data portability</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Entertainment Disclaimer</h2>
            <p>
              All readings, predictions, and astrological content generated by Celestial Touch are
              <strong className="text-white"> entirely fictional and for entertainment purposes only</strong>.
              They have no scientific basis and should not be relied upon for any real-world decisions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Contact</h2>
            <p>
              For privacy requests or questions, you can reach us through the app. We will respond within 30 days.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-white bg-white/10 hover:bg-white/20 transition"
          >
            ← Back to Celestial Touch
          </Link>
        </div>
      </div>
    </div>
  );
}
