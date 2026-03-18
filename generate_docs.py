"""
Seek Wander — PDF Document Generator
Produces:
  1. Seek-Wander-PRS.pdf         (Product Requirements Specification)
  2. Seek-Wander-TDD.pdf         (Technical Due Diligence)

Brand palette:
  paper       #F5F0E8
  ink         #0A0A0A
  ink-light   #6B6B6B
  burnt-orange #C2410C
  emerald     #059669
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, KeepTogether
)
from reportlab.platypus.flowables import HRFlowable
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
import os

# ── Brand colours ─────────────────────────────────────────────────────────────
PAPER       = colors.HexColor("#F5F0E8")
INK         = colors.HexColor("#0A0A0A")
INK_LIGHT   = colors.HexColor("#6B6B6B")
BURNT       = colors.HexColor("#C2410C")
EMERALD     = colors.HexColor("#059669")
PAPER_DARK  = colors.HexColor("#EDE8DC")
WHITE       = colors.white

W, H = A4
MARGIN = 22 * mm

# ── Page template with header/footer ─────────────────────────────────────────
class BrandCanvas(canvas.Canvas):
    def __init__(self, filename, doc_title="", doc_subtitle="", **kwargs):
        super().__init__(filename, **kwargs)
        self._doc_title    = doc_title
        self._doc_subtitle = doc_subtitle
        self._page_num     = 0

    def showPage(self):
        self._page_num += 1
        self._draw_chrome()
        super().showPage()

    def save(self):
        self._draw_chrome()
        super().save()

    def _draw_chrome(self):
        # Header rule
        self.setStrokeColor(INK)
        self.setLineWidth(0.4)
        self.line(MARGIN, H - 14*mm, W - MARGIN, H - 14*mm)

        # Header: wordmark left, subtitle right
        self.setFillColor(INK)
        self.setFont("Helvetica-Bold", 8)
        self.drawString(MARGIN, H - 11*mm, "SEEK WANDER")
        self.setFont("Helvetica", 7)
        self.setFillColor(INK_LIGHT)
        self.drawRightString(W - MARGIN, H - 11*mm, self._doc_subtitle)

        # Footer rule
        self.setStrokeColor(INK)
        self.setLineWidth(0.3)
        self.line(MARGIN, 13*mm, W - MARGIN, 13*mm)

        # Footer: confidential left, page number right
        self.setFillColor(INK_LIGHT)
        self.setFont("Helvetica", 6.5)
        self.drawString(MARGIN, 9*mm, "Confidential — Seek Wander Internal Document")
        self.drawRightString(W - MARGIN, 9*mm, f"Page {self._page_num}")


def make_canvas_factory(doc_title, doc_subtitle):
    def factory(filename, **kwargs):
        return BrandCanvas(filename, doc_title=doc_title, doc_subtitle=doc_subtitle, **kwargs)
    return factory


# ── Style definitions ─────────────────────────────────────────────────────────
def build_styles():
    s = {}

    s["cover_kicker"] = ParagraphStyle(
        "cover_kicker",
        fontName="Helvetica",
        fontSize=8,
        textColor=INK_LIGHT,
        spaceAfter=6,
        letterSpacing=2,
        alignment=TA_LEFT,
    )
    s["cover_title"] = ParagraphStyle(
        "cover_title",
        fontName="Helvetica-Bold",
        fontSize=36,
        textColor=INK,
        leading=40,
        spaceAfter=6,
        alignment=TA_LEFT,
    )
    s["cover_subtitle"] = ParagraphStyle(
        "cover_subtitle",
        fontName="Helvetica",
        fontSize=14,
        textColor=BURNT,
        spaceAfter=4,
        alignment=TA_LEFT,
    )
    s["cover_meta"] = ParagraphStyle(
        "cover_meta",
        fontName="Helvetica",
        fontSize=8.5,
        textColor=INK_LIGHT,
        spaceAfter=3,
        alignment=TA_LEFT,
    )
    s["section_num"] = ParagraphStyle(
        "section_num",
        fontName="Helvetica",
        fontSize=8,
        textColor=BURNT,
        spaceBefore=18,
        spaceAfter=2,
        letterSpacing=1,
    )
    s["h1"] = ParagraphStyle(
        "h1",
        fontName="Helvetica-Bold",
        fontSize=18,
        textColor=INK,
        leading=22,
        spaceBefore=4,
        spaceAfter=10,
    )
    s["h2"] = ParagraphStyle(
        "h2",
        fontName="Helvetica-Bold",
        fontSize=12,
        textColor=INK,
        leading=15,
        spaceBefore=14,
        spaceAfter=5,
    )
    s["h3"] = ParagraphStyle(
        "h3",
        fontName="Helvetica-Bold",
        fontSize=10,
        textColor=INK,
        leading=13,
        spaceBefore=10,
        spaceAfter=4,
    )
    s["body"] = ParagraphStyle(
        "body",
        fontName="Helvetica",
        fontSize=9.5,
        textColor=INK,
        leading=15,
        spaceAfter=7,
    )
    s["body_small"] = ParagraphStyle(
        "body_small",
        fontName="Helvetica",
        fontSize=8.5,
        textColor=INK,
        leading=13,
        spaceAfter=5,
    )
    s["caption"] = ParagraphStyle(
        "caption",
        fontName="Helvetica",
        fontSize=8,
        textColor=INK_LIGHT,
        leading=11,
        spaceAfter=4,
    )
    s["bullet"] = ParagraphStyle(
        "bullet",
        fontName="Helvetica",
        fontSize=9.5,
        textColor=INK,
        leading=14,
        spaceAfter=4,
        leftIndent=12,
        bulletIndent=0,
        bulletFontName="Helvetica",
        bulletFontSize=9.5,
    )
    s["code"] = ParagraphStyle(
        "code",
        fontName="Courier",
        fontSize=7.5,
        textColor=INK,
        leading=11,
        spaceAfter=3,
        backColor=PAPER_DARK,
        leftIndent=8,
        rightIndent=8,
    )
    s["callout"] = ParagraphStyle(
        "callout",
        fontName="Helvetica",
        fontSize=9,
        textColor=INK,
        leading=13,
        leftIndent=12,
        rightIndent=8,
        spaceBefore=6,
        spaceAfter=8,
        borderPad=8,
    )
    s["tag"] = ParagraphStyle(
        "tag",
        fontName="Helvetica-Bold",
        fontSize=7,
        textColor=WHITE,
        leading=10,
        alignment=TA_CENTER,
    )
    return s


# ── Helper builders ───────────────────────────────────────────────────────────
def rule(color=INK, width=0.5, space_before=4, space_after=10):
    return HRFlowable(
        width="100%", thickness=width, color=color,
        spaceBefore=space_before, spaceAfter=space_after
    )

def section_header(number, title, st):
    return [
        Spacer(1, 4*mm),
        Paragraph(f"{'—' * 3}  {number}", st["section_num"]),
        Paragraph(title, st["h1"]),
        rule(BURNT, 0.8, 0, 10),
    ]

def kv_table(rows, st, col_widths=None):
    """Two-column key-value table."""
    if col_widths is None:
        col_widths = [55*mm, W - 2*MARGIN - 55*mm]
    data = [[Paragraph(f"<b>{k}</b>", st["body_small"]),
             Paragraph(v, st["body_small"])] for k, v in rows]
    t = Table(data, colWidths=col_widths)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), PAPER_DARK),
        ("TEXTCOLOR",  (0, 0), (0, -1), INK),
        ("VALIGN",     (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("LINEBELOW", (0, 0), (-1, -2), 0.3, PAPER_DARK),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#D8D0C4")),
    ]))
    return t

def data_table(headers, rows, st, col_widths=None):
    """Full data table with header row."""
    header_row = [Paragraph(f"<b>{h}</b>", st["body_small"]) for h in headers]
    body_rows  = [[Paragraph(str(c), st["body_small"]) for c in row] for row in rows]
    data = [header_row] + body_rows

    if col_widths is None:
        col_widths = [(W - 2*MARGIN) / len(headers)] * len(headers)

    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0),  INK),
        ("TEXTCOLOR",     (0, 0), (-1, 0),  WHITE),
        ("FONTNAME",      (0, 0), (-1, 0),  "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, 0),  8),
        ("BOTTOMPADDING", (0, 0), (-1, 0),  6),
        ("TOPPADDING",    (0, 0), (-1, 0),  6),
        ("BACKGROUND",    (0, 1), (-1, -1), PAPER),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [PAPER, PAPER_DARK]),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING",    (0, 1), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 4),
        ("LEFTPADDING",   (0, 0), (-1, -1), 7),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 7),
        ("GRID",          (0, 0), (-1, -1), 0.3, colors.HexColor("#C8C0B4")),
    ]))
    return t

def status_badge(text, color):
    """Inline coloured status pill for tables."""
    return Paragraph(
        f'<font color="white"><b> {text} </b></font>',
        ParagraphStyle("badge", fontName="Helvetica-Bold", fontSize=7,
                       textColor=WHITE, backColor=color, leading=10,
                       borderPad=2)
    )

def bullet_list(items, st, indent=12):
    return [Paragraph(f"\u2014&nbsp;&nbsp;{item}", st["bullet"]) for item in items]


# ─────────────────────────────────────────────────────────────────────────────
# DOCUMENT 1: PRODUCT REQUIREMENTS SPECIFICATION
# ─────────────────────────────────────────────────────────────────────────────

def build_prs():
    path = r"D:\travel-plannner-v2\Seek-Wander-PRS.pdf"
    st   = build_styles()

    doc = SimpleDocTemplate(
        path, pagesize=A4,
        leftMargin=MARGIN, rightMargin=MARGIN,
        topMargin=22*mm, bottomMargin=22*mm,
        canvasmaker=make_canvas_factory("PRS", "Product Requirements Specification — v1.0")
    )

    story = []

    # ── Cover ─────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 18*mm))
    story.append(Paragraph("PRODUCT REQUIREMENTS SPECIFICATION", st["cover_kicker"]))
    story.append(rule(BURNT, 1.5, 2, 8))
    story.append(Paragraph("Seek Wander", st["cover_title"]))
    story.append(Paragraph("Curated Luxury Journeys", st["cover_subtitle"]))
    story.append(Spacer(1, 6*mm))
    story.append(kv_table([
        ("Document Version", "1.0 — Phase 3 Complete"),
        ("Date",             "March 2026"),
        ("Status",           "Production — Live on Vercel"),
        ("Prepared by",      "Engineering & Product"),
        ("Classification",   "Confidential"),
    ], st))
    story.append(Spacer(1, 10*mm))
    story.append(Paragraph(
        "This document defines the complete product requirements for Seek Wander — "
        "a luxury AI travel concierge. It covers product vision, user personas, "
        "feature specifications, business model, and success metrics. "
        "All features described herein are implemented and live in production.",
        st["body"]
    ))
    story.append(PageBreak())

    # ── 1. Executive Summary ─────────────────────────────────────────────────
    story += section_header("01", "Executive Summary", st)
    story.append(Paragraph(
        "Seek Wander is a premium web application that transforms how discerning travellers "
        "plan their journeys. Users describe their travel preferences through an intelligent "
        "7-field intake form; within 15–20 seconds, the system returns a fully-verified, "
        "editorial-quality multi-day itinerary — complete with GPS-accurate activities, "
        "Michelin-calibre restaurant recommendations, curated hotel stays, real transit "
        "estimates, and destination photography.",
        st["body"]
    ))
    story.append(Paragraph(
        "The product is built on a <b>zero-hallucination data model</b>: every location "
        "generated by the AI is immediately enriched and verified via Google Places API "
        "before being shown to the user. Ratings, opening hours, and photos are "
        "ground-truthed in real time. This is not a generic travel app — it is a "
        "<b>digital concierge</b> for the luxury travel market.",
        st["body"]
    ))

    kpi_data = [
        ["Metric", "Target", "Current Status"],
        ["Generation time", "< 20 seconds", "15–20s (p50)"],
        ["Data accuracy", "100% real places", "Google Places verified"],
        ["Cost per generation", "< $0.15", "$0.05–$0.14 (60% cache)"],
        ["Mobile experience", "Full PWA", "Installable, offline-capable"],
        ["Uptime", "99.9%", "Vercel Edge (SLA)"],
    ]
    story.append(data_table(
        kpi_data[0], kpi_data[1:], st,
        col_widths=[60*mm, 55*mm, 55*mm]
    ))
    story.append(PageBreak())

    # ── 2. Product Vision ────────────────────────────────────────────────────
    story += section_header("02", "Product Vision & Positioning", st)
    story.append(Paragraph(
        "<b>Vision:</b> The world's most elegant travel planning experience — "
        "where every interaction feels like speaking with a seasoned, well-travelled concierge "
        "at a five-star hotel.",
        st["body"]
    ))
    story.append(Paragraph(
        "<b>Positioning:</b> Vogue meets National Geographic. The interface is "
        "intentionally editorial — warm paper tones, Cormorant Garamond serif headings, "
        "generous whitespace, and grayscale-to-colour photography transitions. "
        "This is not positioned as an 'AI tool' — the word 'AI' does not appear "
        "anywhere in the user-facing product. The technology is the invisible engine; "
        "the luxury outcome is the headline.",
        st["body"]
    ))

    story.append(Paragraph("Brand Pillars", st["h2"]))
    pillars = [
        ("Editorial Aesthetic", "Every screen feels like a luxury magazine spread. "
            "No border-radius. No clutter. Paper tones, ink blacks, burnt-orange accents."),
        ("Zero Hallucination", "AI generates the itinerary structure; Google Places verifies "
            "every location. Users only see real, operational places with real photos and ratings."),
        ("Invisible Technology", "The product outcome — a curated journey — is the brand. "
            "The underlying AI model is never referenced in user-facing copy."),
        ("Concierge Velocity", "From preferences to complete itinerary in under 20 seconds. "
            "The speed of technology with the quality of a human expert."),
        ("Offline Resilience", "Saved itineraries are accessible without connectivity. "
            "The app installs as a PWA and caches trips locally for travel use."),
    ]
    story.append(kv_table(pillars, st, col_widths=[52*mm, W - 2*MARGIN - 52*mm]))
    story.append(PageBreak())

    # ── 3. Target Audience ───────────────────────────────────────────────────
    story += section_header("03", "Target Audience", st)

    personas = [
        {
            "name": "The Affluent Explorer",
            "demo": "35–55, HHI $200k+, frequent international traveller",
            "pain": "Existing tools (TripAdvisor, Google Maps) are generic and overwhelming. "
                    "Travel agents are slow and impersonal. ChatGPT produces geographically "
                    "inaccurate results.",
            "need": "A curated, verified, beautiful itinerary that respects their taste — "
                    "fast, and without requiring research expertise.",
        },
        {
            "name": "The Detail-Oriented Planner",
            "demo": "28–45, urban professional, values experience over possession",
            "pain": "Spends hours researching and cross-referencing before every trip. "
                    "Anxious about missing hidden gems or making suboptimal choices.",
            "need": "A single trusted source that surfaces the 1% of places that "
                    "matter — restaurants that require reservations, opening hours "
                    "that are current, transit times that are realistic.",
        },
        {
            "name": "The Luxury Couple / Honeymoon Planner",
            "demo": "28–40, planning once-in-a-lifetime trips, budget-agnostic",
            "pain": "Every result feels 'touristy'. Hard to find experiences that feel "
                    "personal and exclusive. PDF itineraries from travel agencies are "
                    "expensive and impersonal.",
            "need": "A premium, shareable itinerary document they can export as a "
                    "beautiful PDF dossier and send to their partner.",
        },
    ]

    for p in personas:
        story.append(KeepTogether([
            Paragraph(p["name"], st["h2"]),
            kv_table([
                ("Demographics", p["demo"]),
                ("Pain Points",  p["pain"]),
                ("Core Need",    p["need"]),
            ], st),
            Spacer(1, 4*mm),
        ]))
    story.append(PageBreak())

    # ── 4. Core Features ─────────────────────────────────────────────────────
    story += section_header("04", "Core Feature Specifications", st)

    # 4.1 Curation Form
    story.append(Paragraph("4.1 — 7-Field Concierge Intake Form", st["h2"]))
    story.append(Paragraph(
        "Staged inline expansion — each stage unlocks only after the previous is "
        "completed, creating a progressive disclosure pattern that mirrors a concierge "
        "conversation. No page reloads. All validation is instant.",
        st["body"]
    ))
    form_fields = [
        ["#", "Field", "Type", "Notes"],
        ["1", "Destination", "Google Places Autocomplete", "GPS-accurate lat/lng captured"],
        ["2", "Dates", "Dual date picker", "Departure + Return; duration badge computed"],
        ["3", "Travel Party", "Pill selector", "Solo / Couple / Family / Group"],
        ["4", "Pace", "Card selector", "Relaxed (3–4/day) / Moderate / Packed (6–7/day)"],
        ["5", "Budget Tier", "Card selector", "Premium $$ / Luxury $$$ / Ultra-Luxury $$$$"],
        ["6", "Dietary", "Multi-select", "7 options incl. Halal, Kosher, Gluten-Free"],
        ["7", "Accommodation", "Toggle + optional text", "Needed (AI recommends) / Booked (user provides)"],
    ]
    story.append(data_table(form_fields[0], form_fields[1:], st,
        col_widths=[12*mm, 42*mm, 52*mm, W - 2*MARGIN - 106*mm]))
    story.append(Spacer(1, 4*mm))

    # 4.2 Itinerary Generation
    story.append(Paragraph("4.2 — AI Itinerary Generation Pipeline", st["h2"]))
    pipeline_steps = [
        ("Step 1: Validation", "Zod schema parsing of all 12 request fields. 400 on failure."),
        ("Step 2: Rate Limit", "Upstash Redis sliding window — 5 generations per user per hour."),
        ("Step 3: AI Generation", "claude-sonnet-4-6 with injection-resistant system prompt. "
            "Returns chronological timeline[] per day with real place names and GPS coordinates."),
        ("Step 4: JSON Repair", "sanitizeJson() regex sweep + fallback Claude repair call "
            "if JSON.parse() fails. Prevents malformed output from reaching users."),
        ("Step 5: Place Enrichment", "enrichPlace() per timeline item — PlaceCache check first "
            "(30-day TTL), then Google Places Text Search + Place Details. "
            "Adds: photoUrl, rating, openNow, hoursOpen, priceLevel."),
        ("Step 6: Transit", "Haversine formula — pure local math, zero API calls. "
            "Walking (5 km/h) and driving (25 km/h) estimates between consecutive stops."),
        ("Step 7: Cost Logging", "CostLog Prisma record written (awaited) before response. "
            "Tracks AI tokens, Google API calls, cache hit/miss ratio."),
    ]
    story.append(kv_table(pipeline_steps, st, col_widths=[52*mm, W - 2*MARGIN - 52*mm]))
    story.append(Spacer(1, 4*mm))

    # 4.3 Itinerary Display
    story.append(Paragraph("4.3 — Split-Screen Itinerary Display", st["h2"]))
    story.append(Paragraph(
        "Desktop: 55% scrollable editorial timeline (left) + 45% interactive Google Map (right). "
        "Mobile: full-width timeline with collapsible map banner. "
        "Tabbed day navigation with AnimatePresence transitions.",
        st["body"]
    ))
    story += bullet_list([
        "TimelineCard: unified card for activities AND meals — photo, name, description, "
          "rating, open/closed badge, price level, transit connector",
        "StayCard: Booking.com affiliate card for recommended hotels (AID 4013143)",
        "Hidden Gem: 1 per day — places 95% of tourists never find",
        "Day-centric SVG map markers with colour-coded legend (5 palette slots)",
        "Polyline connecting all stops in chronological order",
    ], st)
    story.append(Spacer(1, 4*mm))

    # 4.4 Trip Archive
    story.append(Paragraph("4.4 — Trip Archive (/trips)", st["h2"]))
    story += bullet_list([
        "Clerk-authenticated — only the owning user sees their trips",
        "IDOR-protected — /trips/[id] enforces userId ownership on every fetch",
        "Offline-capable — useOfflineTrips hook caches archive in localStorage (seek_wander_archive)",
        "Offline banner shown when navigator.onLine is false or /api/trips fetch fails",
        "UnauthenticatedState 'Velvet Rope' — editorial gate instead of redirect, Clerk modal sign-in",
        "EmptyTripsState 'Inspiration Hub' — editorial empty state with 3 destination teasers",
    ], st)
    story.append(Spacer(1, 4*mm))

    # 4.5 PDF Export
    story.append(Paragraph("4.5 — PDF & Sharing Features", st["h2"]))
    story += bullet_list([
        "PDF Export: window.print() — zero dependencies. Tailwind print: modifiers hide nav, map, "
          "tabs. All days rendered sequentially. Framer Motion opacity overridden in @media print.",
        "Branded dossier header in print: Seek Wander wordmark, destination, date — hidden on screen.",
        "Public Sharing: /shared/[id] — intentionally public, no auth. "
          "Dynamic OG metadata (title, editorial description, destination photo) for iMessage/Slack/WhatsApp.",
        "ShareButton: navigator.share() (mobile native) with clipboard fallback + Sonner toast.",
    ], st)
    story.append(PageBreak())

    # ── 5. Business Model ────────────────────────────────────────────────────
    story += section_header("05", "Business Model", st)

    story.append(Paragraph("Revenue Streams", st["h2"]))
    revenue = [
        ["Stream", "Mechanism", "Status"],
        ["Affiliate — Hotels",
         "Booking.com AID 4013143. Every recommended stay links to Booking.com search. "
         "Commission on completed bookings via affiliate program.",
         "Live"],
        ["Stripe Paywall (Phase 12)",
         "$4.99 per generation after free tier (1 free generation per account). "
         "Stripe Checkout — no credit card required to browse.",
         "Planned"],
        ["Brand Partnerships",
         "Destination tourism boards, luxury hotel chains paying for featured placement "
         "in recommended stays and editorial content.",
         "Future"],
    ]
    story.append(data_table(revenue[0], revenue[1:], st,
        col_widths=[42*mm, 90*mm, 25*mm]))

    story.append(Paragraph("Unit Economics", st["h2"]))
    econ = [
        ["Item", "Cost"],
        ["Anthropic claude-sonnet-4-6 input", "$3.00 / 1M tokens"],
        ["Anthropic claude-sonnet-4-6 output", "$15.00 / 1M tokens"],
        ["Google Places Text Search", "$0.032 / call"],
        ["Google Place Details", "$0.017 / call"],
        ["Typical generation (cache cold)", "$0.08 — $0.14"],
        ["Typical generation (60% cache hit)", "$0.05 — $0.09"],
        ["PlaceCache hit savings (per item)", "$0.049 (Text Search + Details)"],
        ["Vercel Pro hosting", "$20 / month flat"],
        ["Supabase Pro", "$25 / month flat"],
        ["Upstash Redis", "~$0 (within free tier for current volume)"],
    ]
    story.append(data_table(econ[0], econ[1:], st, col_widths=[110*mm, 55*mm]))

    story.append(Paragraph("Cost Efficiency Strategy", st["h2"]))
    story += bullet_list([
        "PlaceCache (Supabase) stores Google API results for 30 days — "
          "60–80% cache hit rate after first weeks of operation",
        "Vercel Cron deletes stale cache entries daily (14-day TTL on cold entries)",
        "Distance Matrix API removed — replaced by pure Haversine math (zero API cost)",
        "parseOpenNow() computes open/closed status locally from cached hoursOpen string — "
          "zero API calls on cache hits",
        "Rate limiting (5/hr) caps maximum AI spend per user",
        "CostLog tracks every generation: /admin/metrics dashboard gives real-time margin visibility",
    ], st)
    story.append(PageBreak())

    # ── 6. UX Specifications ─────────────────────────────────────────────────
    story += section_header("06", "UX & Design Specifications", st)

    story.append(Paragraph("Design System", st["h2"]))
    design_tokens = [
        ["Token", "Value", "Usage"],
        ["paper",       "#F5F0E8", "Primary backgrounds — warm off-white"],
        ["paper-dark",  "#EDE8DC", "Card backgrounds, subtle depth"],
        ["ink",         "#0A0A0A", "Primary text, borders"],
        ["ink-light",   "#6B6B6B", "Secondary text, captions"],
        ["emerald",     "#059669", "Active states, OPEN badge"],
        ["burnt-orange","#C2410C", "CTA buttons, active tab indicator, CLOSED badge"],
    ]
    story.append(data_table(design_tokens[0], design_tokens[1:], st,
        col_widths=[42*mm, 38*mm, 77*mm]))

    story.append(Paragraph("Non-Negotiable Component Rules", st["h2"]))
    story += bullet_list([
        "NO border-radius anywhere — rounded-none on every component (one exception: "
          "MobileMenu hamburger button uses rounded-full as an explicit mobile affordance)",
        "Thin borders only — border border-black/5 or border-b border-ink/20",
        "Framer Motion on all sections — fade-in-up: initial={{ opacity:0, y:24 }} "
          "animate={{ opacity:1, y:0 }} transition={{ duration:0.6, ease:'easeOut' }}",
        "Images: grayscale by default, full colour on hover (transition-all duration-700)",
        "Typography: Cormorant Garamond italic for headings, DM Sans for body/micro-copy",
        "Micro-copy: UPPERCASE, tracking-widest, DM Sans Bold",
        "HTML entities always: &apos; &quot; &hellip; &middot; — never raw special characters",
    ], st)

    story.append(Paragraph("Notification System (Sonner)", st["h2"]))
    story.append(Paragraph(
        "Sonner toast library provides a three-state generation lifecycle — "
        "all three calls share id: 'curate-task' so the same toast mutates in place "
        "(no toast stacking):",
        st["body"]
    ))
    notif_rows = [
        ["State", "Title", "Description", "Trigger"],
        ["Loading", "Consulting the concierge…", "(spinner)", "Fetch start"],
        ["Success", "Itinerary Prepared", "Your bespoke journey is ready for review.", "200 response"],
        ["Error",   "Concierge Busy",     "Our desk is at capacity. Please try again in a moment.", "Any error / 429"],
        ["Save OK", "Passport Updated",   "This journey has been saved to your archive.", "Successful DB write"],
        ["Save Err","Save Failed",         "Unable to save this journey. Please try again.", "DB exception"],
    ]
    story.append(data_table(notif_rows[0], notif_rows[1:], st,
        col_widths=[22*mm, 42*mm, 70*mm, 30*mm]))
    story.append(PageBreak())

    # ── 7. Mobile & PWA ──────────────────────────────────────────────────────
    story += section_header("07", "Mobile & PWA Requirements", st)

    story.append(Paragraph("Responsive Breakpoints", st["h2"]))
    story += bullet_list([
        "Mobile (< 768px): full-width single-column layout, map collapses to h-52 banner above timeline",
        "Desktop (≥ 768px): 55%/45% split-screen — timeline left, sticky map right",
        "Hamburger menu hidden at md+ (desktop nav takes over)",
        "Print: single-column, all days sequential, map/nav/buttons hidden",
    ], st)

    story.append(Paragraph("PWA Specification", st["h2"]))
    pwa_rows = [
        ["Capability", "Implementation"],
        ["Installable", "manifest.ts — standalone display, Seek Wander name, brand icon"],
        ["Offline trips", "useOfflineTrips + localStorage cache (seek_wander_archive)"],
        ["Photo caching", "Serwist CacheFirst — 30-day TTL, 100-entry cap on Google Photos URLs"],
        ["iOS integration", "appleWebApp meta — capable:true, statusBarStyle:default"],
        ["Service Worker", "src/app/sw.ts → public/sw.js (disabled in development)"],
    ]
    story.append(data_table(pwa_rows[0], pwa_rows[1:], st,
        col_widths=[55*mm, W - 2*MARGIN - 55*mm]))

    story.append(Paragraph("Mobile Navigation Architecture", st["h2"]))
    story.append(Paragraph(
        "The mobile overlay uses createPortal(overlay, document.body) to escape the "
        "Navbar's CSS stacking context (created by backdrop-blur-sm on motion.nav). "
        "Without the portal, fixed inset-0 anchors to the Navbar element (~64px) "
        "rather than the viewport — making the overlay appear transparent. "
        "This is a documented architectural rule for all future overlay components.",
        st["body"]
    ))
    story.append(PageBreak())

    # ── 8. Security ──────────────────────────────────────────────────────────
    story += section_header("08", "Security Requirements", st)
    security_rows = [
        ["Control", "Implementation", "Scope"],
        ["Input Validation",    "Zod ItinerarySchema.safeParse()", "All API POST bodies"],
        ["Prompt Injection",    "SYSTEM_PROMPT as system: param (not in messages[])", "AI generation"],
        ["Rate Limiting",       "Upstash slidingWindow(5, '1 h') per userId/IP", "POST /api/itinerary"],
        ["AI Self-Healing",     "sanitizeJson() + JSON_REPAIR_PROMPT fallback Anthropic call", "AI response parsing"],
        ["IDOR Prevention",     "Post-fetch userId ownership check — same notFound() for both", "/trips/[id]"],
        ["API Key Isolation",   "Client key: HTTP referrer restricted. Server key: no referrer", "Google Places"],
        ["Auth Guard",          "Clerk auth() + userId check — returns 401 if absent", "/api/trips"],
        ["Admin Neutral 404",   "notFound() (not redirect) for non-admin /admin/metrics", "Admin route"],
        ["Cron Security",       "Authorization: Bearer CRON_SECRET header check", "/api/cron/cleanup"],
        ["HTTP Headers",        "X-Frame-Options DENY, nosniff, strict-origin Referrer-Policy", "All routes"],
    ]
    story.append(data_table(security_rows[0], security_rows[1:], st,
        col_widths=[45*mm, 82*mm, 40*mm]))
    story.append(PageBreak())

    # ── 9. Success Metrics ───────────────────────────────────────────────────
    story += section_header("09", "Success Metrics & KPIs", st)

    story.append(Paragraph("Product Metrics", st["h2"]))
    metrics_rows = [
        ["Metric", "Definition", "Target"],
        ["Generation completion rate",  "% of started generations that return a result", "> 95%"],
        ["Generation latency (p50)",    "Time from form submit to itinerary display",   "< 20s"],
        ["Cache hit rate",              "PlaceCache hits / total enrichment calls",     "> 60% (steady state)"],
        ["Cost per generation",         "AI + Google API spend per itinerary",          "< $0.12"],
        ["Save rate",                   "% of generated itineraries saved to archive",  "> 30%"],
        ["Share rate",                  "% of saved trips shared via ShareButton",      "> 15%"],
        ["PDF export rate",             "% of saved trips exported to PDF",             "> 10%"],
        ["Mobile install rate",         "PWA installs / mobile unique visitors",        "> 5%"],
    ]
    story.append(data_table(metrics_rows[0], metrics_rows[1:], st,
        col_widths=[58*mm, 82*mm, 27*mm]))

    story.append(Paragraph("Business Metrics", st["h2"]))
    biz_rows = [
        ["Metric", "Definition"],
        ["Affiliate click-through rate", "Clicks on StayCard Booking.com links / itineraries with stays shown"],
        ["Affiliate conversion rate",    "Booking.com confirmed bookings via AID 4013143 / affiliate clicks"],
        ["Monthly affiliate revenue",    "Commission from Booking.com partner dashboard"],
        ["Cost margin",                  "(Revenue from affiliate + future Stripe) / Total AI + Google API cost"],
        ["Monthly Active Users",         "Unique Clerk userIds with ≥ 1 generation in rolling 30 days"],
    ]
    story.append(data_table(biz_rows[0], biz_rows[1:], st, col_widths=[72*mm, 95*mm]))
    story.append(PageBreak())

    # ── 10. Roadmap ──────────────────────────────────────────────────────────
    story += section_header("10", "Phase Roadmap", st)

    roadmap = [
        ["Phase", "Scope", "Status"],
        ["1 — Core Engine",
         "Next.js + Claude + Google Maps baseline",
         "Complete"],
        ["2 — Concierge UX",
         "7-field intake form, split-screen results, Google enrichment, Haversine transit",
         "Complete"],
        ["3 — Ultra-Luxury UI",
         "Tabbed day nav, cost badges, transit connectors, day-centric map markers",
         "Complete"],
        ["4 — Auth",
         "Clerk v6 integration, conditional ClerkProvider, NavbarAuth, custom 404",
         "Complete"],
        ["5 — Persistence",
         "Prisma + Supabase, saveTrip server action, /trips archive, /trips/[id], IDOR enforcement",
         "Complete"],
        ["6 — PWA & Sharing",
         "@serwist/next, /shared/[id] OG metadata, ShareButton, PDF/print export",
         "Complete"],
        ["7 — Timeline Refactor",
         "timeline: TimelineItem[] canonical shape, normalizeDayPlan() backward-compat shim",
         "Complete"],
        ["8 — Margin Protection",
         "PlaceCache, pure Haversine, CostLog, /admin/metrics, Vercel Cron, Zod, security headers",
         "Complete"],
        ["9 — Affiliate Monetization",
         "Booking.com AID 4013143, StayCard, accommodation branching, recommendedStays[]",
         "Complete"],
        ["10 — UX & Polish",
         "GenerationLoader, Sonner toasts, UnauthenticatedState, EmptyTripsState, MobileMenu portal fix",
         "Complete"],
        ["11 — Mobile & Resilience",
         "useOfflineTrips, /api/trips, Upstash rate limiting, AI JSON self-healing, dynamic OG metadata",
         "Complete"],
        ["12 — Stripe Paywall",
         "$4.99 per generation after 1 free — Stripe Checkout, usage tracking",
         "Next"],
        ["13 — Brand Partnerships",
         "Featured placement API for destination tourism boards and luxury hotel chains",
         "Future"],
    ]
    story.append(data_table(roadmap[0], roadmap[1:], st,
        col_widths=[40*mm, 105*mm, 22*mm]))

    doc.build(story)
    print(f"PRS written → {path}")
    return path


# ─────────────────────────────────────────────────────────────────────────────
# DOCUMENT 2: TECHNICAL DUE DILIGENCE
# ─────────────────────────────────────────────────────────────────────────────

def build_tdd():
    path = r"D:\travel-plannner-v2\Seek-Wander-TDD.pdf"
    st   = build_styles()

    doc = SimpleDocTemplate(
        path, pagesize=A4,
        leftMargin=MARGIN, rightMargin=MARGIN,
        topMargin=22*mm, bottomMargin=22*mm,
        canvasmaker=make_canvas_factory("TDD", "Technical Due Diligence — v1.0")
    )

    story = []

    # ── Cover ─────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 18*mm))
    story.append(Paragraph("TECHNICAL DUE DILIGENCE", st["cover_kicker"]))
    story.append(rule(BURNT, 1.5, 2, 8))
    story.append(Paragraph("Seek Wander", st["cover_title"]))
    story.append(Paragraph("As-Built Architecture Review", st["cover_subtitle"]))
    story.append(Spacer(1, 6*mm))
    story.append(kv_table([
        ("Document Version",  "1.0 — Phase 3 Complete"),
        ("Date",              "March 2026"),
        ("Production URL",    "travel-planner-v2-pearl.vercel.app"),
        ("Repository",        "github.com/RomaanR/travel-planner-v2"),
        ("Classification",    "Confidential — Technical Review"),
    ], st))
    story.append(Spacer(1, 8*mm))
    story.append(Paragraph(
        "This document provides a complete technical review of Seek Wander's "
        "production architecture. All systems described are live, committed, and "
        "deployed. This review covers system architecture, security controls, data "
        "schemas, cost model, and deployment topology.",
        st["body"]
    ))
    story.append(PageBreak())

    # ── 1. Product Summary ────────────────────────────────────────────────────
    story += section_header("01", "Product Summary", st)
    story.append(Paragraph(
        "Seek Wander is a luxury AI travel concierge that generates bespoke, "
        "multi-day itineraries. Users complete a 7-field intake form; the system "
        "returns a geographically-verified, chronologically-ordered day plan with "
        "restaurant recommendations, hidden gems, transit estimates, curated hotel "
        "stays, and destination photography — in 15–20 seconds.",
        st["body"]
    ))
    story.append(Paragraph(
        "The product is built on a <b>zero-hallucination data model</b>: every "
        "AI-generated location is enriched post-generation via Google Places API, "
        "so ratings, opening hours, and photos are ground-truthed before the user "
        "ever sees the output.",
        st["body"]
    ))
    story.append(PageBreak())

    # ── 2. System Architecture ─────────────────────────────────────────────
    story += section_header("02", "System Architecture", st)

    story.append(Paragraph("Layer Overview", st["h2"]))
    arch_rows = [
        ["Layer", "Technology", "Responsibility"],
        ["Client",       "Next.js 14 App Router, Tailwind CSS, Framer Motion, Google Maps JS",
         "Rendering, animation, form intake, map display"],
        ["Edge/Serverless","Vercel — Next.js API Routes",
         "Request handling, AI orchestration, enrichment pipeline"],
        ["AI Engine",    "Anthropic claude-sonnet-4-6 (max_tokens: 8192)",
         "Itinerary generation from structured user profile"],
        ["Place Data",   "Google Places API (Text Search + Details)",
         "Location verification, photos, ratings, opening hours"],
        ["Auth",         "Clerk v6",
         "User identity, session management, modal sign-in"],
        ["Primary DB",   "Supabase PostgreSQL via Prisma 7",
         "Trip storage, PlaceCache, CostLog"],
        ["Rate Limiting","Upstash Redis",
         "Sliding window rate limits per userId"],
        ["PWA",          "@serwist/next",
         "Service worker, offline caching, installable app"],
        ["CDN/Hosting",  "Vercel Pro",
         "Global edge delivery, serverless functions, cron jobs"],
    ]
    story.append(data_table(arch_rows[0], arch_rows[1:], st,
        col_widths=[32*mm, 58*mm, 77*mm]))

    story.append(Paragraph("Core Request Pipeline — POST /api/itinerary", st["h2"]))
    pipeline = [
        ["Step", "Mechanism", "Failure Mode"],
        ["1. Zod Validation",     "ItinerarySchema.safeParse() — 12 fields",       "400 + field errors"],
        ["2. Rate Limit Check",   "Upstash slidingWindow(5, '1 h') per userId/IP", "429 + Retry-After"],
        ["3. AI Generation",      "claude-sonnet-4-6 with injection-resistant SYSTEM_PROMPT", "Phase 4 JSON repair"],
        ["4. JSON Sanitisation",  "sanitizeJson() regex + fallback Anthropic repair call", "500 (both phases fail)"],
        ["5. Place Enrichment",   "enrichPlace() × N — PlaceCache first, then Google Places", "Graceful null (item renders)"],
        ["6. Transit Calc",       "Haversine formula — local math, zero API calls", "Never fails"],
        ["7. Cost Logging",       "CostLog.create() awaited before Response.json()", "Non-fatal try/catch"],
    ]
    story.append(data_table(pipeline[0], pipeline[1:], st,
        col_widths=[38*mm, 90*mm, 39*mm]))
    story.append(PageBreak())

    # ── 3. Technology Stack ──────────────────────────────────────────────────
    story += section_header("03", "Technology Stack", st)
    stack = [
        ["Layer", "Technology", "Version", "Notes"],
        ["Framework",     "Next.js App Router",          "14",       "TypeScript, server + client components"],
        ["Styling",       "Tailwind CSS",                 "v3",       "Custom design tokens, no border-radius"],
        ["Animation",     "Framer Motion",                "12",       "AnimatePresence throughout"],
        ["Maps",          "@react-google-maps/api",       "Latest",   "Places Autocomplete, Map, Polyline, Markers"],
        ["AI",            "@anthropic-ai/sdk",            "^0.78",    "claude-sonnet-4-6, max_tokens 8192"],
        ["Auth",          "@clerk/nextjs",                "v6 ONLY",  "v7 incompatible with Next.js 14 — do not upgrade"],
        ["ORM",           "Prisma",                       "7",        "Supabase PostgreSQL, PgBouncer pooled"],
        ["Rate Limiting", "@upstash/ratelimit",           "Latest",   "Sliding window, Redis-backed"],
        ["Notifications", "sonner",                       "2",        "Branded toast layer, richColors"],
        ["PWA",           "@serwist/next",                "Latest",   "Service worker, CacheFirst strategy"],
        ["Validation",    "zod",                          "4",        "All POST bodies, z.infer<> as source of truth"],
    ]
    story.append(data_table(stack[0], stack[1:], st,
        col_widths=[32*mm, 45*mm, 25*mm, 65*mm]))

    story.append(Paragraph(
        "<b>Critical version lock:</b> @clerk/nextjs must stay at v6. "
        "Clerk v7 requires Next.js 15 and introduces breaking API changes "
        "(<Show> instead of <SignedIn>/<SignedOut>). Any dependency update "
        "that pulls in @clerk/nextjs@7+ will break the auth layer.",
        st["callout"]
    ))
    story.append(PageBreak())

    # ── 4. Security Architecture ─────────────────────────────────────────────
    story += section_header("04", "Security Architecture", st)

    controls = [
        ["Control", "Implementation Detail", "Scope"],
        ["Input Validation",
         "Zod ItinerarySchema.safeParse() — 12 fields validated before any computation. "
         "Returns 400 with per-field fieldErrors on failure. Schema is source of truth (z.infer<>).",
         "POST /api/itinerary"],
        ["Prompt Injection Defence",
         "SYSTEM_PROMPT passed as system: param (not in messages[]). "
         "Model instructed to ignore instructions in user fields. "
         "system param is processed at higher trust tier than messages[].",
         "AI generation"],
        ["Rate Limiting",
         "Upstash Redis slidingWindow(5, '1 h'). Key: Clerk userId (auth) or IP (unauth). "
         "Checked before any Anthropic call — zero AI cost on rate-limited requests. "
         "Returns 429 + X-RateLimit-* headers.",
         "POST /api/itinerary"],
        ["AI JSON Self-Healing",
         "Phase 1: sanitizeJson() strips markdown fences + trailing commas. "
         "Phase 2: JSON_REPAIR_PROMPT fallback Claude call if JSON.parse() still fails. "
         "Both failures return clean 500.",
         "AI response parsing"],
        ["HTTP Security Headers",
         "X-Frame-Options: DENY | X-Content-Type-Options: nosniff | "
         "Referrer-Policy: strict-origin-when-cross-origin | "
         "Permissions-Policy: camera=(), microphone=(), payment=(), usb=(), geolocation=(self)",
         "All routes"],
        ["Google API Key Isolation",
         "NEXT_PUBLIC_ key: HTTP referrer restricted to Vercel domain + localhost. "
         "MAPS_SERVER_KEY: Places API only, no referrer restriction (server-side only — "
         "never transmitted to client).",
         "Google Places"],
        ["IDOR Prevention",
         "findUnique by ID then post-fetch trip.userId === userId check. "
         "Both missing and wrong-owner records return identical notFound(). "
         "No ownership information leaks through error differentiation.",
         "/trips/[id]"],
        ["/api/trips Auth",
         "Returns 401 if Clerk userId absent. All queries scoped to { where: { userId } }. "
         "A user cannot retrieve another user's trip list.",
         "GET /api/trips"],
        ["Admin Neutral 404",
         "notFound() (not redirect) for all non-admin /admin/metrics access. "
         "Prevents revealing route existence to non-admin users.",
         "/admin/metrics"],
        ["Cron Auth",
         "Vercel injects Authorization: Bearer CRON_SECRET on every cron invocation. "
         "Route validates header — returns 401 for any other caller.",
         "/api/cron/cleanup"],
    ]
    story.append(data_table(controls[0], controls[1:], st,
        col_widths=[40*mm, 100*mm, 27*mm]))
    story.append(PageBreak())

    # ── 5. Data Architecture ─────────────────────────────────────────────────
    story += section_header("05", "Data Architecture", st)

    story.append(Paragraph("Prisma Schema", st["h2"]))

    schema_sections = [
        ("Trip", [
            ("id",            "String UUID",  "Primary key"),
            ("userId",        "String",       "Clerk userId — no FK constraint"),
            ("destination",   "String",       "Human-readable destination name"),
            ("days",          "Int",          "Trip duration in days"),
            ("itineraryData", "Json",         "Full ItineraryResponse blob"),
            ("createdAt",     "DateTime",     "Auto-set on create"),
        ]),
        ("PlaceCache", [
            ("id",               "String UUID", "Primary key"),
            ("cacheKey",         "String UNIQUE","'{name}|{city}' normalised"),
            ("photoUrl",         "String?",     "Google Places photo URL"),
            ("rating",           "Float?",      "Google Places rating"),
            ("userRatingsTotal", "Int?",        "Review count"),
            ("hoursOpen",        "String?",     "'9:00 AM – 9:00 PM' (today's hours)"),
            ("priceLevel",       "Int?",        "0–4 price scale"),
            ("updatedAt",        "DateTime",    "@updatedAt — used by cron GC"),
        ]),
        ("CostLog", [
            ("userId",      "String?",         "Clerk userId — null if unauthenticated"),
            ("destination", "String",          "Trip destination"),
            ("aiCost",      "Decimal(10,6)",   "Anthropic spend in USD"),
            ("googleCost",  "Decimal(10,6)",   "Google Places spend in USD"),
            ("totalCost",   "Decimal(10,6)",   "aiCost + googleCost"),
            ("cacheHits",   "Int",             "PlaceCache hits — zero Google cost"),
            ("cacheMisses", "Int",             "Fresh Google API calls made"),
            ("createdAt",   "DateTime",        "Auto-set on create"),
        ]),
    ]

    for model_name, fields in schema_sections:
        story.append(Paragraph(f"Model: {model_name}", st["h3"]))
        rows = [[f, t, d] for f, t, d in fields]
        story.append(data_table(
            ["Field", "Type", "Notes"], rows, st,
            col_widths=[40*mm, 38*mm, 89*mm]
        ))
        story.append(Spacer(1, 4*mm))

    story.append(Paragraph("PlaceCache — Efficiency Model", st["h2"]))
    story.append(Paragraph(
        "Every enrichPlace() call checks PlaceCache before making any Google API call. "
        "On a cache hit (record exists and updatedAt < 30 days old):",
        st["body"]
    ))
    story += bullet_list([
        "Zero Google API calls made",
        "parseOpenNow(hoursOpen, lng) computes live open/closed locally using "
          "Math.round(lng / 15) hours as UTC offset estimate (±30 min accuracy)",
        "Savings: $0.049 per item (Text Search $0.032 + Place Details $0.017)",
        "60–80% cache hit rate typical after first weeks of operation",
    ], st)
    story.append(PageBreak())

    # ── 6. Observability ─────────────────────────────────────────────────────
    story += section_header("06", "Observability & Cost Control", st)

    story.append(Paragraph("/admin/metrics — Internal BI Dashboard", st["h2"]))
    story.append(Paragraph(
        "Accessible only to the ADMIN_USER_ID Clerk userId (env var, trimmed). "
        "Non-admin access returns notFound() — route existence not leaked. "
        "Shows last 200 CostLog rows with colour-coded cost tiers.",
        st["body"]
    ))
    kpi_rows = [
        ["KPI", "Calculation"],
        ["Total Spent",     "SUM(totalCost) across all CostLog rows"],
        ["Total Generations","COUNT(CostLog)"],
        ["Avg Cost / Trip", "totalSpent / totalGenerations"],
        ["Cache Hit Rate",  "SUM(cacheHits) / SUM(cacheHits + cacheMisses)"],
        ["Cost by Provider","SUM(aiCost) vs SUM(googleCost) — Claude vs Google split"],
    ]
    story.append(data_table(kpi_rows[0], kpi_rows[1:], st, col_widths=[55*mm, 112*mm]))

    story.append(Paragraph("Unit Economics Reference", st["h2"]))
    econ = [
        ["Item", "Cost"],
        ["Anthropic input tokens",   "$3.00 / 1M tokens"],
        ["Anthropic output tokens",  "$15.00 / 1M tokens"],
        ["Google Text Search",       "$0.032 / call"],
        ["Google Place Details",     "$0.017 / call"],
        ["Cache cold generation",    "$0.08 — $0.14"],
        ["Cache warm generation (60% hits)", "$0.05 — $0.09"],
    ]
    story.append(data_table(econ[0], econ[1:], st, col_widths=[100*mm, 67*mm]))

    story.append(Paragraph("Automated Garbage Collection", st["h2"]))
    story.append(Paragraph(
        "Vercel Cron runs GET /api/cron/cleanup daily at 00:00 UTC. "
        "Deletes PlaceCache rows where updatedAt < 14 days ago. "
        "The @updatedAt Prisma directive refreshes on every upsert — "
        "frequently accessed places naturally survive each cleanup cycle. "
        "CRON_SECRET bearer auth prevents external triggering.",
        st["body"]
    ))
    story.append(PageBreak())

    # ── 7. Affiliate Monetization ────────────────────────────────────────────
    story += section_header("07", "Affiliate Monetization", st)

    story.append(Paragraph("Booking.com Integration", st["h2"]))
    story.append(kv_table([
        ("Affiliate ID",    "4013143 (Seek Wander account)"),
        ("Utility",         "src/lib/affiliate.ts — createAffiliateUrl(hotelName, destination)"),
        ("URL Pattern",     "booking.com/searchresults.html?ss={encoded_query}&aid=4013143"),
        ("Component",       "StayCard.tsx — motion.a, whileHover y:-2, ArrowUpRight CTA"),
        ("Placement",       "ItineraryViewer — after timeline, when itinerary.recommendedStays?.length > 0"),
        ("Print behaviour", "print:hidden — stays excluded from PDF dossier"),
    ], st))

    story.append(Paragraph("Accommodation Branching", st["h2"]))
    story.append(Paragraph(
        "CurationForm collects accommodationStatus ('needed' | 'booked') and an optional "
        "hotelName. The API route branches SYSTEM_PROMPT dynamically:",
        st["body"]
    ))
    branch_rows = [
        ["Status", "AI Behaviour", "Output"],
        ["needed", "Claude generates recommendedStays[] from its knowledge base",
         "3 curated hotels with name, description, neighborhood"],
        ["booked", "Claude uses provided hotelName as the itinerary base",
         "No recommendedStays[] — StayCard section absent"],
    ]
    story.append(data_table(branch_rows[0], branch_rows[1:], st,
        col_widths=[25*mm, 90*mm, 52*mm]))
    story.append(PageBreak())

    # ── 8. PWA & Offline ─────────────────────────────────────────────────────
    story += section_header("08", "PWA & Offline Architecture", st)

    story.append(Paragraph("Service Worker (Serwist)", st["h2"]))
    story.append(kv_table([
        ("Library",          "@serwist/next — NOT @ducanh2912/next-pwa"),
        ("Source",           "src/app/sw.ts → compiled to public/sw.js"),
        ("Dev mode",         "Disabled (process.env.NODE_ENV === 'development') — no stale cache issues"),
        ("CacheFirst scope", "Google Places photo URLs — 30-day TTL, 100-entry cap"),
        ("defaultCache",     "Next.js static assets: JS chunks, CSS, fonts"),
        ("Manifest",         "src/app/manifest.ts — standalone display, Seek Wander name, brand icons"),
    ], st))

    story.append(Paragraph("useOfflineTrips Hook — Data Strategy", st["h2"]))
    story.append(kv_table([
        ("Cache key",    "seek_wander_archive (localStorage)"),
        ("Stored shape", "CachedTrip[] — includes itineraryData for editorial preview"),
        ("Phase 1",      "navigator.onLine === false → load from localStorage immediately"),
        ("Phase 2",      "Fetch GET /api/trips (Clerk-authed) → on success: persist to cache"),
        ("Fallback",     "Fetch failure → load from localStorage, set isOffline: true"),
        ("UI indicator", "Offline banner: bg-ink text-paper WifiOff icon"),
    ], st))

    story.append(Paragraph("/api/trips — Architecture Note", st["h2"]))
    story.append(Paragraph(
        "Photo URLs are computed server-side in the route handler using MAPS_SERVER_KEY. "
        "The client (TripsClient.tsx) receives pre-resolved URL strings — "
        "it never holds or references the server API key. "
        "This is the correct pattern for any server-only secret that produces "
        "client-visible URLs.",
        st["body"]
    ))
    story.append(PageBreak())

    # ── 9. Mobile-First Design ────────────────────────────────────────────────
    story += section_header("09", "Mobile-First Design", st)

    story.append(Paragraph("Responsive Layout", st["h2"]))
    layout_rows = [
        ["Breakpoint", "Layout", "Map"],
        ["Mobile (< 768px)", "Full-width single-column timeline", "h-52 banner above timeline"],
        ["Desktop (≥ 768px)","55% timeline / 45% sticky map split-screen", "Sticky right panel"],
        ["Print",            "Single-column, all days sequential",          "Hidden (print:hidden)"],
    ]
    story.append(data_table(layout_rows[0], layout_rows[1:], st,
        col_widths=[40*mm, 90*mm, 37*mm]))

    story.append(Paragraph("Mobile Menu — CSS Stacking Context Resolution", st["h2"]))
    story.append(Paragraph(
        "<b>Problem:</b> MobileMenu.tsx overlay appeared transparent — text from the hero "
        "background image bled through. Multiple attempts to fix via z-index, "
        "background colour, and inline styles all failed.",
        st["body"]
    ))
    story.append(Paragraph(
        "<b>Root cause:</b> Navbar.tsx applies backdrop-blur-sm to its root motion.nav element. "
        "backdrop-filter creates a new CSS stacking context. Any fixed-positioned descendant "
        "is anchored to that ancestor — not the viewport. "
        "The overlay's fixed inset-0 was anchored to the ~64px Navbar bar.",
        st["body"]
    ))
    story.append(Paragraph(
        "<b>Resolution:</b> createPortal(overlay, document.body) moves the overlay DOM node "
        "outside the Navbar tree entirely. fixed inset-0 then covers the true viewport. "
        "SSR guard: mounted state + useEffect ensures document.body is available before portal renders.",
        st["body"]
    ))
    story.append(Paragraph(
        "<b>Architectural rule:</b> Any fixed full-screen overlay rendered inside a component "
        "with backdrop-filter, transform, filter, will-change, or perspective MUST use "
        "createPortal(…, document.body).",
        st["callout"]
    ))

    story.append(Paragraph("High-Contrast UI for Hero Images", st["h2"]))
    story.append(kv_table([
        ("Hamburger button",
         "bg-paper border border-ink/20 rounded-full shadow-md p-3 — "
         "solid pill ensures visibility against dark photographic backgrounds"),
        ("Overlay background",
         "bg-paper (#F5F0E8) + inline style backgroundColor fallback — "
         "dual approach guarantees solid background independent of Tailwind JIT"),
        ("Scroll lock",
         "document.body.style.overflow = 'hidden' on open, 'unset' on close "
         "— useEffect cleanup reverts on unmount"),
    ], st))
    story.append(PageBreak())

    # ── 10. Deployment ────────────────────────────────────────────────────────
    story += section_header("10", "Deployment Topology", st)

    story.append(data_table(
        ["Service", "Platform", "Configuration"],
        [
            ["Web App",        "Vercel Pro",          "Auto-deploy on main branch push"],
            ["Database",       "Supabase PostgreSQL",
             "DATABASE_URL: PgBouncer port 6543 (runtime)\nDIRECT_URL: port 5432 (Prisma migrations)"],
            ["Auth",           "Clerk v6",            "Modal sign-in, no dedicated auth pages"],
            ["Rate Limiting",  "Upstash Redis",       "REST API — stateless, no persistent connection"],
            ["AI",             "Anthropic API",       "claude-sonnet-4-6, server-side only"],
            ["Maps",           "Google Cloud",        "Two keys: referrer-restricted (client) + API-restricted (server)"],
            ["Cron",           "Vercel Cron",         "vercel.json: '0 0 * * *' — daily PlaceCache GC"],
            ["Affiliate",      "Booking.com",         "AID 4013143 — no SDK, URL-based integration"],
        ],
        st,
        col_widths=[35*mm, 45*mm, 87*mm]
    ))

    story.append(Paragraph("Environment Variables", st["h2"]))
    env_rows = [
        ["Variable", "Used In", "Restriction"],
        ["ANTHROPIC_API_KEY",                  "POST /api/itinerary",        "Server only"],
        ["NEXT_PUBLIC_GOOGLE_MAPS_API_KEY",    "Browser — Maps JS, Autocomplete", "HTTP referrer restricted"],
        ["MAPS_SERVER_KEY",                    "route.ts, getPlacePhoto.ts", "Places API only; no referrer"],
        ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",  "ClerkProvider in layout.tsx","Public"],
        ["CLERK_SECRET_KEY",                   "Clerk middleware + auth()",   "Server only"],
        ["DATABASE_URL",                       "Prisma runtime queries",     "PgBouncer port 6543"],
        ["DIRECT_URL",                         "Prisma migrations / db push","Direct port 5432"],
        ["ADMIN_USER_ID",                      "/admin/metrics auth gate",   "Server only; must be trimmed"],
        ["CRON_SECRET",                        "/api/cron/cleanup bearer",   "Server only"],
        ["UPSTASH_REDIS_REST_URL",             "ratelimit.ts",               "Server only"],
        ["UPSTASH_REDIS_REST_TOKEN",           "ratelimit.ts",               "Server only"],
    ]
    story.append(data_table(env_rows[0], env_rows[1:], st,
        col_widths=[72*mm, 65*mm, 30*mm]))

    story.append(Paragraph("Prisma Deployment Note", st["h2"]))
    story.append(Paragraph(
        "package.json includes postinstall: 'prisma generate' so Vercel regenerates "
        "the Prisma client with the correct Amazon Linux 2023 binary after npm install. "
        "Do NOT pin binaryTargets in schema.prisma — Prisma auto-detects the correct "
        "platform binary. Pinning to rhel-openssl-1.0.x will break on Vercel "
        "(Amazon Linux 2023 uses OpenSSL 3.x).",
        st["body"]
    ))
    story.append(PageBreak())

    # ── 11. Phase Completion ─────────────────────────────────────────────────
    story += section_header("11", "Phase Completion Audit", st)

    roadmap = [
        ["Phase", "Scope", "Status"],
        ["1 — Core Engine",          "Next.js + Claude + Google Maps baseline",                         "Complete"],
        ["2 — Concierge UX",         "7-field form, split-screen, enrichment, Haversine",              "Complete"],
        ["3 — Ultra-Luxury UI",      "Tabbed nav, cost badges, transit connectors, day markers",       "Complete"],
        ["4 — Auth",                 "Clerk v6, conditional ClerkProvider, NavbarAuth",                "Complete"],
        ["5 — Persistence",          "Prisma + Supabase, saveTrip, /trips, /trips/[id], IDOR",        "Complete"],
        ["6 — PWA & Sharing",        "@serwist/next, /shared/[id] OG, ShareButton, PDF export",       "Complete"],
        ["7 — Timeline Refactor",    "timeline: TimelineItem[], normalizeDayPlan() shim",              "Complete"],
        ["8 — Margin Protection",    "PlaceCache, Haversine, CostLog, /admin/metrics, Cron, Zod",     "Complete"],
        ["9 — Affiliate",            "Booking.com AID 4013143, StayCard, accommodation branching",    "Complete"],
        ["10 — UX & Polish",         "GenerationLoader, Sonner, UnauthenticatedState, EmptyTrips, MobileMenu", "Complete"],
        ["11 — Mobile & Resilience", "useOfflineTrips, /api/trips, Upstash, JSON repair, OG metadata","Complete"],
        ["12 — Stripe Paywall",      "$4.99/generation after free tier — Stripe Checkout",             "Next"],
    ]
    story.append(data_table(roadmap[0], roadmap[1:], st,
        col_widths=[44*mm, 106*mm, 17*mm]))

    doc.build(story)
    print(f"TDD written → {path}")
    return path


# ── Run ────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    prs_path = build_prs()
    tdd_path = build_tdd()
    print("\nDone.")
    print(f"  PRS → {prs_path}")
    print(f"  TDD → {tdd_path}")
