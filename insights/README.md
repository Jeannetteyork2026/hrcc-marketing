# Insights — Post Template Guide

This folder holds individual blog posts that are listed on `/insights.html`. The blog is fed (manually for now, automated later via the Compass harness) and posts plug into the same template so the index page stays consistent.

## URL pattern

`/insights/{descriptive-slug}.html`

- Kebab-case
- Descriptive, not date-prefixed (sitemap + canonical handle freshness)
- Short and stable — if a post gets renamed later, add a 301 in `/_redirects` so old shares don't 404

Example: `overtime-rule-rescinded-may-2026.html`

## File structure

- Self-contained single HTML file. No build step, no external JS frameworks.
- External deps allowed: Google Fonts only (Fraunces display + Inter body).
- All styles inline in a `<style>` block — keeps each post independently deployable.

## Required `<head>` elements

Every post must include all of these (the existing posts are valid references):

```html
<title>{Post title} | HR Compliance Compass</title>
<meta name="description" content="{1–2 sentence summary}">

<link rel="canonical" href="https://hrcompliancecompass.com/insights/{slug}.html" />
<meta property="og:title" content="{Post title}">
<meta property="og:description" content="{Same summary as meta description, or shorter}">
<meta property="og:type" content="article">
<meta property="og:image" content="https://hrcompliancecompass.com/compass-share.png">
<meta property="og:url" content="https://hrcompliancecompass.com/insights/{slug}.html" />
<meta property="article:published_time" content="YYYY-MM-DD" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="{Post title}" />
<meta name="twitter:description" content="{Summary}" />
<meta name="twitter:image" content="https://hrcompliancecompass.com/compass-share.png" />

<meta name="ga-id" content="G-9CXFF6HMVN" />
<link rel="icon" type="image/png" href="/HRCC-compass-icon.png" />
```

Plus the JSON-LD Article block (see `overtime-rule-rescinded-may-2026.html` for the exact shape) — it powers rich-result eligibility in Google search.

## Required `<body>` elements

- Top nav matching the post template (logo + Pricing / Insights / FAQs / Contact + Start Free Trial CTA)
- Author card with credentials
- Educational-use disclaimer
- Footer with copyright + CompassLine LLC
- `<script src="/analytics.js"></script>` before `</body>` (loads GA via the meta `ga-id`)

## Design tokens (CSS variables to reuse)

```css
--navy:        #1e3a5f
--navy-deep:   #142a47
--orange:      #f07030
--gold:        #e8b84b
--gold-soft:   #f4d98a
--teal:        #3a9e8f
--bg:          #f6f8fb
--paper:       #fffdf7
--ink:         #0f172a
--ink-soft:    #475569
--rule:        #d8dee9
```

Display font: `'Fraunces', Georgia, serif`. Body font: `'Inter', system-ui, sans-serif`.

## After publishing a post

1. Add a card to `/insights.html` — required fields: tag (Federal / State / Multi-State / etc.), publish date, read time, title, 1-2 sentence excerpt, link.
2. Add the URL to `/sitemap.xml` with today's `<lastmod>`.
3. If the file name changes, add a 301 in `/_redirects` from the old path to the new.

## What this folder is **not** for

- `admin.html` (the analytics dashboard) — utility page, not a blog post. Don't list it in the sitemap or `insights.html`.
- One-off landing pages — those belong at the repo root, not under `/insights/`.
