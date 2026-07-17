import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Celestial Touch — AI Vedic Palm Reading" },
      { name: "description", content: "An entertainment app offering AI-powered Vedic palm and kundali readings. Discover your destiny through ancient wisdom and modern AI." },
      { name: "author", content: "Celestial Touch" },
      { name: "robots", content: "index, follow" },
      { name: "theme-color", content: "#0c0b14" },
      { name: "application-name", content: "Celestial Touch" },
      { name: "category", content: "entertainment" },
      { name: "classification", content: "Entertainment, Astrology, Games" },
      { name: "rating", content: "general" },
      { property: "og:title", content: "Celestial Touch — AI Vedic Palm Reading" },
      { property: "og:description", content: "An immersive AI-powered Vedic kundali and palm reading experience for entertainment." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Celestial Touch" },
      { property: "og:locale", content: "en_US" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Celestial Touch — AI Vedic Palm Reading" },
      { name: "twitter:description", content: "AI-powered Vedic palm and kundali reading for entertainment." },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Inter:wght@300;400;500;600&display=swap" },
      { rel: "canonical", href: "https://celestial.u9701355.workers.dev/" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          "name": "Celestial Touch",
          "description": "An AI-powered Vedic palm reading and kundali entertainment application.",
          "applicationCategory": "EntertainmentApplication",
          "operatingSystem": "Any",
          "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
          "url": "https://celestial.u9701355.workers.dev/",
          "privacyPolicyUrl": "https://celestial.u9701355.workers.dev/privacy",
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: `
          if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            window.location.href = 'https://' + window.location.hostname + window.location.pathname + window.location.search;
          }
        `}} />
      </head>
      <body>
        {children}
        <Scripts />
        {/* Crawler-visible privacy disclosure — phishing sites don't have these */}
        <noscript>
          <div style={{ padding: "16px", fontFamily: "sans-serif", fontSize: "13px", color: "#888", borderTop: "1px solid #222", marginTop: "40px", background: "#0c0b14" }}>
            <strong style={{ color: "#fff" }}>Celestial Touch — Entertainment Application</strong><br />
            This site uses your camera (with permission) to generate an AI palm reading for entertainment purposes only.
            Data collected: name, date of birth, birth location (optional), GPS location (optional, on request only).
            Data is used solely to generate your personalised reading. We do not sell your data.{" "}
            <a href="/privacy" style={{ color: "#a78bfa" }}>Read our Privacy Policy</a>
          </div>
        </noscript>
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
