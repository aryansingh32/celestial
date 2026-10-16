# Celestial Touch — Cybersecurity Internship Project

> ⚠️ **Scope note**: This README documents the *security research angle* of this
> project at a conceptual level — the class of attack it is meant to illustrate,
> and how to defend against it. It intentionally does **not** walk through the
> specific implementation details of this codebase's data-capture or
> command/control flows. If this project is deployed anywhere outside a
> controlled, consenting lab/demo environment, treat that as a live risk, not a
> coursework artifact — see **Responsible Use** below.

## 1. What this project is about

Celestial Touch is framed as a fun "AI palm & kundali reading" web app. That
framing is deliberate: it is the internship's case study in **pretext-based,
permission-abusing phishing** — a class of attack where the attacker doesn't
send a suspicious link at all, but instead gets the victim to *willingly*
grant normal-looking permissions (camera, location, notifications) inside an
app that looks harmless and even fun.

This is different from classic phishing ("fake login page steals your
password") in a few ways worth calling out in a writeup:

- The "payload" isn't a credential form — it's **browser permission prompts**
  that look like they belong to the feature the user asked for.
- The entertainment framing lowers the user's guard and makes them *want* to
  grant access, rather than being tricked under pressure.
- Trust is borrowed from a believable, low-stakes use case (a palm reading)
  to unlock access to capabilities (camera, GPS, push notifications) that a
  user would never grant to an unfamiliar site directly.

## 2. Anatomy of this class of attack (generic)

A modern "advanced" phishing attack chained with permission abuse typically
has these phases:

| Phase | Goal | Typical technique |
|---|---|---|
| **1. Lure** | Get the target to open the page/app | Entertainment, curiosity, urgency, or a trusted-looking brand |
| **2. Pretext** | Make a sensitive permission request look native to the experience | "We need your camera to scan your palm", "Enable notifications for your daily reading" |
| **3. Consent capture** | Get the permission grant with minimal friction | Bundling the real ask with a flashy UI step, vague/buried privacy disclosures |
| **4. Persistence** | Keep access beyond the single interaction the user expected | Background capture, long-lived device identifiers, periodic check-ins |
| **5. Exfiltration** | Move captured data off the victim's device | Calls to a backend API, chat-bot webhooks, cloud storage |
| **6. Command & control (advanced variant)** | Let an operator act on a specific victim after the fact | A polling channel the client checks for operator-issued follow-up actions (e.g., "get this device's location now", "show this device a notification") |

Steps 4–6 are what separate a *simple* phishing page (one-shot credential
theft) from an *advanced* one: the attacker keeps a live foothold and can
take further action on demand, long after the initial lure succeeded.

## 3. Why this is effective against real users

- **Permission prompts are trusted UI.** Operating systems and browsers
  render them, not the website — so users associate them with the OS, not
  the (possibly malicious) page asking for them.
- **Context collapses suspicion.** A camera request feels normal on a "palm
  scanner"; a location request feels normal on a "find your local energy"
  feature. The same request on a generic page would raise alarm.
- **One grant can be broad.** Browser permission grants are typically
  all-or-nothing and don't expire when the "feature" the user thought they
  were using ends.
- **Privacy policies are rarely read, and can lag behind what code actually
  does.** A policy describing a single, consented action is easy to write
  and easy to skim past — it doesn't constrain runtime behavior.

## 4. Detection — what defenders and users should look for

- **Permission-to-purpose mismatch**: does the requested permission
  (camera/location/notifications) actually match what the on-screen feature
  needs, and only for as long as that feature is active?
- **Camera/mic indicator persistence**: browsers show an active-camera
  indicator (tab icon, OS indicator light) — it should turn off when the
  advertised feature is done. If it doesn't, that's a signal of background
  capture.
- **Unexpected outbound traffic**: recurring network calls to an API from a
  page that should be idle (visible in browser DevTools → Network, or via
  network monitoring) after the user believes the interaction is over.
- **Device fingerprinting without disclosure**: a site persisting an ID in
  `localStorage`/cookies and submitting detailed device metadata
  (screen size, hardware concurrency, timezone, connection type) that the
  stated feature doesn't need.
- **Follow-up prompts after the fact**: being asked again for a permission,
  or receiving a push notification, well after the original interaction —
  a sign of a live command channel rather than a one-time feature.

## 5. Prevention — recommendations

**For developers / organizations building legitimate apps:**
- Request permissions at the moment of use, scoped to the minimum needed,
  and release/stop the media stream the instant the feature is done.
- Make privacy disclosures match runtime behavior exactly — if a policy says
  "one photo, with consent," the code should take exactly one photo.
- Avoid silent background polling that can receive operator-issued commands;
  any "check for updates" pattern should be auditable and rate-limited, and
  should never be able to re-trigger sensitive permission flows unprompted.
- Add visible, persistent UI indicators whenever camera/mic/location are
  active, beyond what the OS already shows.

**For end users:**
- Treat camera/location/notification prompts as sensitive regardless of how
  playful the surrounding app feels; ask "does this feature need this,
  right now, and only now?"
- Revoke site permissions after use (browser site settings), rather than
  relying on the page to release them.
- Watch for the camera/mic indicator staying active after you've finished
  the interaction, and close the tab if it does.
- Be skeptical of "entertainment" apps that ask for camera, precise
  location, *and* notifications in the same flow — that combination has no
  legitimate need in most casual apps.

**For security teams / blue teams:**
- Monitor for apps/sites in the environment that combine getUserMedia,
  geolocation, and Notification API usage with a consumer/entertainment
  pretext — this combination is a strong heuristic for the pattern
  described above.
- Inspect outbound requests from sanctioned or BYOD browsing sessions for
  periodic beacon-like traffic to unfamiliar endpoints.
- Educate users through this exact scenario (pretext → consent → background
  persistence → exfiltration → optional C2) as part of phishing-awareness
  training, since it doesn't match the "look for a fake login page" model
  most training still focuses on.

## 6. Responsible use

This project was built as a cybersecurity internship case study in how
consent-pretext phishing and permission abuse can work, so it can be
documented and defended against. If any part of this codebase is deployed
somewhere real people can interact with it, treat that as **live data
collection from real users without informed, specific consent** — not as a
contained classroom exercise — and apply standard incident-response steps
(take it offline, notify affected users, and limit data retention)
accordingly, no matter the original intent.

## 7. Repository layout

| Path | Purpose |
|---|---|
| `src/` | Front-end app (TanStack Start/React) — the user-facing "reading" experience |
| `admin-panel/` | Next.js dashboard used to review collected data during the internship research |
| `prisma/`, `admin-panel/prisma/` | Database schema/migrations |
| `docker-compose.yml`, `railway.toml`, `wrangler.toml` | Deployment configs for the lab environment |

---

*Internship project — defensive security research into phishing and consent-based permission abuse.*
