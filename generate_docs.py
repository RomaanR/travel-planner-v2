"""
Seek Wander — PDF Document Generator  v2.0
Produces:
  1. Seek-Wander-PRS.pdf         (Product Requirements Specification)
  2. Seek-Wander-TDD.pdf         (Technical Due Diligence)

v2.0 changes:
  - Callout boxes (left-accent border, [!IMPORTANT] / [!NOTE] style)
  - 3-column Security Matrix  (Feature | Risk Mitigated | Business Value)
  - Phase separator horizontal rules
  - [STATUS: …] badges on cover + roadmap rows
  - Dense Monetization section with StayCard internals
  - Dense PWA/Offline section with SW strategy + localStorage vault

Brand palette:
  paper        #F5F0E8
  paper-dark   #EDE8DC
  ink          #0A0A0A
  ink-light    #6B6B6B
  burnt-orange #C2410C
  emerald      #059669
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, KeepTogether
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.pdfgen import canvas

# ── Brand colours ─────────────────────────────────────────────────────────────
PAPER       = colors.HexColor("#F5F0E8")
INK         = colors.HexColor("#0A0A0A")
INK_LIGHT   = colors.HexColor("#6B6B6B")
BURNT       = colors.HexColor("#C2410C")
EMERALD     = colors.HexColor("#059669")
PAPER_DARK  = colors.HexColor("#EDE8DC")
AMBER       = colors.HexColor("#D97706")
WHITE       = colors.white
GRID_LINE   = colors.HexColor("#C8C0B4")
BORDER_SOFT = colors.HexColor("#D8D0C4")

W, H   = A4
MARGIN = 22 * mm
BODY_W = W - 2 * MARGIN


# ── Page chrome ───────────────────────────────────────────────────────────────
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
        self.setStrokeColor(INK)
        self.setLineWidth(0.4)
        self.line(MARGIN, H - 14*mm, W - MARGIN, H - 14*mm)
        self.setFillColor(INK)
        self.setFont("Helvetica-Bold", 8)
        self.drawString(MARGIN, H - 11*mm, "SEEK WANDER")
        self.setFont("Helvetica", 7)
        self.setFillColor(INK_LIGHT)
        self.drawRightString(W - MARGIN, H - 11*mm, self._doc_subtitle)
        self.setStrokeColor(INK)
        self.setLineWidth(0.3)
        self.line(MARGIN, 13*mm, W - MARGIN, 13*mm)
        self.setFillColor(INK_LIGHT)
        self.setFont("Helvetica", 6.5)
        self.drawString(MARGIN, 9*mm, "Confidential \u2014 Seek Wander Internal Document")
        self.drawRightString(W - MARGIN, 9*mm, f"Page {self._page_num}")


def make_canvas_factory(doc_title, doc_subtitle):
    def factory(filename, **kwargs):
        return BrandCanvas(filename, doc_title=doc_title,
                           doc_subtitle=doc_subtitle, **kwargs)
    return factory


# ── Styles ────────────────────────────────────────────────────────────────────
def build_styles():
    s = {}

    s["cover_kicker"] = ParagraphStyle(
        "cover_kicker", fontName="Helvetica", fontSize=8,
        textColor=INK_LIGHT, spaceAfter=6, letterSpacing=2,
    )
    s["cover_title"] = ParagraphStyle(
        "cover_title", fontName="Helvetica-Bold", fontSize=36,
        textColor=INK, leading=40, spaceAfter=6,
    )
    s["cover_subtitle"] = ParagraphStyle(
        "cover_subtitle", fontName="Helvetica", fontSize=14,
        textColor=BURNT, spaceAfter=4,
    )
    s["cover_meta"] = ParagraphStyle(
        "cover_meta", fontName="Helvetica", fontSize=8.5,
        textColor=INK_LIGHT, spaceAfter=3,
    )
    s["section_num"] = ParagraphStyle(
        "section_num", fontName="Helvetica", fontSize=8,
        textColor=BURNT, spaceBefore=18, spaceAfter=2, letterSpacing=1,
    )
    s["h1"] = ParagraphStyle(
        "h1", fontName="Helvetica-Bold", fontSize=18,
        textColor=INK, leading=22, spaceBefore=4, spaceAfter=10,
    )
    s["h2"] = ParagraphStyle(
        "h2", fontName="Helvetica-Bold", fontSize=12,
        textColor=INK, leading=15, spaceBefore=14, spaceAfter=5,
    )
    s["h3"] = ParagraphStyle(
        "h3", fontName="Helvetica-Bold", fontSize=10,
        textColor=INK, leading=13, spaceBefore=10, spaceAfter=4,
    )
    s["body"] = ParagraphStyle(
        "body", fontName="Helvetica", fontSize=9.5,
        textColor=INK, leading=15, spaceAfter=7,
    )
    s["body_small"] = ParagraphStyle(
        "body_small", fontName="Helvetica", fontSize=8.5,
        textColor=INK, leading=13, spaceAfter=5,
    )
    s["caption"] = ParagraphStyle(
        "caption", fontName="Helvetica", fontSize=8,
        textColor=INK_LIGHT, leading=11, spaceAfter=4,
    )
    s["bullet"] = ParagraphStyle(
        "bullet", fontName="Helvetica", fontSize=9.5,
        textColor=INK, leading=14, spaceAfter=4,
        leftIndent=12, bulletIndent=0,
    )
    s["code"] = ParagraphStyle(
        "code", fontName="Courier", fontSize=7.5,
        textColor=INK, leading=11, spaceAfter=3,
        backColor=PAPER_DARK, leftIndent=8, rightIndent=8,
    )
    s["callout_body"] = ParagraphStyle(
        "callout_body", fontName="Helvetica", fontSize=9,
        textColor=INK, leading=14, leftIndent=0, rightIndent=0,
        spaceBefore=0, spaceAfter=0,
    )
    s["callout_label"] = ParagraphStyle(
        "callout_label", fontName="Helvetica-Bold", fontSize=7.5,
        textColor=WHITE, leading=10, spaceBefore=0, spaceAfter=4,
        letterSpacing=0.8,
    )
    s["badge_green"] = ParagraphStyle(
        "badge_green", fontName="Helvetica-Bold", fontSize=7.5,
        textColor=EMERALD, leading=10, spaceAfter=0,
    )
    s["badge_orange"] = ParagraphStyle(
        "badge_orange", fontName="Helvetica-Bold", fontSize=7.5,
        textColor=BURNT, leading=10, spaceAfter=0,
    )
    s["badge_grey"] = ParagraphStyle(
        "badge_grey", fontName="Helvetica-Bold", fontSize=7.5,
        textColor=INK_LIGHT, leading=10, spaceAfter=0,
    )
    return s


# ── Core helpers ──────────────────────────────────────────────────────────────
def rule(color=INK, width=0.5, space_before=4, space_after=10):
    return HRFlowable(width="100%", thickness=width, color=color,
                      spaceBefore=space_before, spaceAfter=space_after)


def phase_rule():
    """Heavy separator between major phases / top-level sections."""
    return HRFlowable(width="100%", thickness=1.2, color=BURNT,
                      spaceBefore=12, spaceAfter=16)


def section_header(number, title, st, status=None):
    """Section opener with optional [STATUS: …] badge."""
    badge_txt = f"  [{status}]" if status else ""
    return [
        Spacer(1, 4*mm),
        Paragraph(f"{'—' * 3}  {number}", st["section_num"]),
        Paragraph(f"{title}{badge_txt}", st["h1"]),
        rule(BURNT, 0.8, 0, 10),
    ]


def kv_table(rows, st, col_widths=None):
    """Two-column key/value table."""
    if col_widths is None:
        col_widths = [55*mm, BODY_W - 55*mm]
    data = [[Paragraph(f"<b>{k}</b>", st["body_small"]),
             Paragraph(v, st["body_small"])] for k, v in rows]
    t = Table(data, colWidths=col_widths)
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (0, -1), PAPER_DARK),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 8),
        ("GRID",          (0, 0), (-1, -1), 0.3, BORDER_SOFT),
    ]))
    return t


def data_table(headers, rows, st, col_widths=None):
    """Full data table with dark header row."""
    hrow = [Paragraph(f"<b>{h}</b>", st["body_small"]) for h in headers]
    brows = [[Paragraph(str(c) if not isinstance(c, Paragraph) else "", st["body_small"])
               if not isinstance(c, Paragraph) else c
               for c in row]
              for row in rows]
    data = [hrow] + brows
    if col_widths is None:
        col_widths = [BODY_W / len(headers)] * len(headers)
    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0),  INK),
        ("TEXTCOLOR",     (0, 0), (-1, 0),  WHITE),
        ("FONTNAME",      (0, 0), (-1, 0),  "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, 0),  8),
        ("TOPPADDING",    (0, 0), (-1, 0),  6),
        ("BOTTOMPADDING", (0, 0), (-1, 0),  6),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [PAPER, PAPER_DARK]),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING",    (0, 1), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 4),
        ("LEFTPADDING",   (0, 0), (-1, -1), 7),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 7),
        ("GRID",          (0, 0), (-1, -1), 0.3, GRID_LINE),
    ]))
    return t


def callout(label, text, st, accent=BURNT):
    """
    Left-accent callout box.
    label: e.g. '! IMPORTANT', 'i NOTE', '⚠ WARNING'
    accent: BURNT (orange) for important, EMERALD for note
    """
    label_p = Paragraph(
        f'<font color="white"><b> {label} </b></font>',
        ParagraphStyle("cl_lbl", fontName="Helvetica-Bold", fontSize=7.5,
                       textColor=WHITE, backColor=accent, leading=11,
                       spaceBefore=0, spaceAfter=5, leftIndent=0)
    )
    body_p = Paragraph(text, st["callout_body"])
    inner_table = Table(
        [[label_p], [body_p]],
        colWidths=[BODY_W - 6*mm]
    )
    inner_table.setStyle(TableStyle([
        ("LEFTPADDING",   (0, 0), (-1, -1), 10),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 8),
        ("TOPPADDING",    (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("BACKGROUND",    (0, 0), (-1, -1), PAPER_DARK),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
    ]))
    outer = Table(
        [["", inner_table]],
        colWidths=[4*mm, BODY_W - 4*mm]
    )
    outer.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (0, -1), accent),
        ("LEFTPADDING",   (0, 0), (-1, -1), 0),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
        ("TOPPADDING",    (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
    ]))
    return [Spacer(1, 3*mm), outer, Spacer(1, 5*mm)]


def status_p(text, st):
    """Colored status text for table cells."""
    text_lower = text.lower()
    if "complete" in text_lower or "live" in text_lower or "production" in text_lower:
        return Paragraph(f"<b>{text}</b>", st["badge_green"])
    if "next" in text_lower or "planned" in text_lower:
        return Paragraph(f"<b>{text}</b>", st["badge_orange"])
    return Paragraph(f"<b>{text}</b>", st["badge_grey"])


def bullet_list(items, st):
    return [Paragraph(f"\u2014&nbsp;&nbsp;{item}", st["bullet"])
            for item in items]


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
        canvasmaker=make_canvas_factory(
            "PRS", "Product Requirements Specification \u2014 v2.0")
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
        ("Document Version", "2.0 \u2014 Phase 11 Complete"),
        ("Date",             "March 2026"),
        ("Status",           "[STATUS: PRODUCTION READY]  Live on Vercel"),
        ("Phases Complete",  "1 through 11 of 13"),
        ("Prepared by",      "Engineering & Product"),
        ("Classification",   "Confidential"),
    ], st))
    story.append(Spacer(1, 8*mm))
    story.append(Paragraph(
        "This document defines the complete product requirements for <b>Seek Wander</b> \u2014 "
        "a luxury AI travel concierge. It covers product vision, user personas, "
        "feature specifications, business model, and success metrics. "
        "All features described herein are implemented and live in production unless "
        "explicitly marked <b>[PHASE: NEXT]</b> or <b>[PHASE: FUTURE]</b>.",
        st["body"]
    ))
    story.append(PageBreak())

    # ── 1. Executive Summary ─────────────────────────────────────────────────
    story += section_header("01", "Executive Summary",
                             st, "PHASE: COMPLETE \u2014 All 11 Phases Live")
    story.append(Paragraph(
        "Seek Wander transforms how discerning travellers plan their journeys. Users describe "
        "their preferences through an intelligent 7-field intake form; within 15\u201320 seconds, "
        "the system returns a fully-verified, editorial-quality multi-day itinerary \u2014 "
        "complete with GPS-accurate activities, Michelin-calibre restaurant recommendations, "
        "curated hotel stays, real transit estimates, and destination photography.",
        st["body"]
    ))
    story.append(Paragraph(
        "The product is built on a <b>zero-hallucination data model</b>: every location "
        "generated by the AI is immediately enriched and verified via <b>Google Places API</b> "
        "before being shown to the user. Ratings, opening hours, and photos are "
        "ground-truthed in real time. The word \u2018AI\u2019 does not appear anywhere in the "
        "user-facing product \u2014 the technology is the invisible engine; "
        "the luxury outcome is the headline.",
        st["body"]
    ))

    kpi_rows = [
        ["Metric", "Target", "Current Status"],
        ["Generation time",       "< 20 seconds",       "15\u201320s (p50)"],
        ["Data accuracy",         "100% real places",   "Google Places verified"],
        ["Cost per generation",   "< $0.15",            "$0.05\u2013$0.14 (60% cache)"],
        ["Mobile experience",     "Full PWA",           "Installable, offline-capable"],
        ["Affiliate integration", "Booking.com live",   "AID 4013143 active"],
        ["Uptime",                "99.9%",              "Vercel Edge (SLA guaranteed)"],
    ]
    story.append(data_table(kpi_rows[0], kpi_rows[1:], st,
                             col_widths=[58*mm, 52*mm, 57*mm]))
    story.append(PageBreak())

    # ── 2. Product Vision ────────────────────────────────────────────────────
    story += section_header("02", "Product Vision & Positioning", st)
    story.append(Paragraph(
        "<b>Vision:</b> The world\u2019s most elegant travel planning experience \u2014 "
        "where every interaction feels like speaking with a seasoned concierge "
        "at a five-star hotel.",
        st["body"]
    ))

    story += callout(
        "! POSITIONING RULE",
        "The word \u2018AI\u2019 is intentionally absent from all user-facing copy, "
        "manifests, metadata, and UI text. The product is positioned around the luxury "
        "outcome (\u2018Curated Luxury Journeys\u2019), not the technology. "
        "<b>claude-sonnet-4-6</b> is the invisible engine \u2014 never the headline.",
        st, accent=BURNT
    )

    story.append(Paragraph("Brand Pillars", st["h2"]))
    pillars = [
        ("Editorial Aesthetic",
         "Every screen feels like a luxury magazine spread. No border-radius. "
         "Paper tones (<b>#F5F0E8</b>), ink blacks (<b>#0A0A0A</b>), "
         "burnt-orange accents (<b>#C2410C</b>). "
         "<b>Cormorant Garamond</b> italic headings, <b>DM Sans</b> body copy."),
        ("Zero Hallucination",
         "AI generates structure; <b>Google Places API</b> verifies every location. "
         "Users only see real, operational places with real photos and ratings."),
        ("Invisible Technology",
         "The product outcome \u2014 a curated journey \u2014 is the brand. "
         "The underlying AI model is never referenced in user-facing copy."),
        ("Concierge Velocity",
         "From preferences to complete itinerary in under 20 seconds. "
         "The speed of technology with the quality of a human expert."),
        ("Offline Resilience",
         "Saved itineraries are accessible without connectivity via "
         "<b>localStorage vault</b> (<b>seek_wander_archive</b>). "
         "Installs as a PWA via <b>@serwist/next</b>."),
    ]
    story.append(kv_table(pillars, st, col_widths=[52*mm, BODY_W - 52*mm]))
    story.append(PageBreak())

    # ── 3. Target Audience ───────────────────────────────────────────────────
    story += section_header("03", "Target Audience", st)

    personas = [
        {
            "name": "The Affluent Explorer",
            "demo": "35\u201355, HHI $200k+, frequent international traveller",
            "pain": "Existing tools (TripAdvisor, Google Maps) are generic and overwhelming. "
                    "ChatGPT produces geographically inaccurate results with no photo verification.",
            "need": "A curated, verified, beautiful itinerary that respects their taste \u2014 "
                    "fast, without requiring research expertise.",
        },
        {
            "name": "The Detail-Oriented Planner",
            "demo": "28\u201345, urban professional, values experience over possession",
            "pain": "Spends hours researching before every trip. Anxious about missing hidden "
                    "gems or making suboptimal restaurant choices.",
            "need": "A single trusted source that surfaces real opening hours, "
                    "reservation requirements, and realistic transit times.",
        },
        {
            "name": "The Luxury Couple / Honeymoon Planner",
            "demo": "28\u201340, planning once-in-a-lifetime trips, budget-agnostic",
            "pain": "Every result feels touristy. Hard to find experiences that feel personal. "
                    "PDF itineraries from travel agencies are expensive and impersonal.",
            "need": "A shareable itinerary dossier they can export as a branded PDF "
                    "and send to their partner.",
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
    story += section_header("04", "Core Feature Specifications", st,
                             "STATUS: PRODUCTION READY")

    # 4.1 Curation Form
    story.append(Paragraph("4.1 \u2014 7-Field Concierge Intake Form", st["h2"]))
    story.append(Paragraph(
        "Staged inline expansion \u2014 each stage unlocks only after the previous is "
        "completed, mirroring a concierge conversation. "
        "No page reloads. All validation is instant. "
        "Destination resolved via <b>Google Places Autocomplete</b> with GPS lat/lng capture.",
        st["body"]
    ))
    form_fields = [
        ["#", "Field", "Type", "Notes"],
        ["1", "Destination", "Google Places Autocomplete",
         "GPS lat/lng + placeId captured; Zod-validated on submit"],
        ["2", "Dates", "Dual date picker",
         "getLocalToday() for timezone safety; duration badge computed client-side"],
        ["3", "Travel Party", "Pill selector", "Solo / Couple / Family / Group"],
        ["4", "Pace", "Card selector",
         "Relaxed (3\u20134/day) / Moderate (4\u20135/day) / Packed (6\u20137/day)"],
        ["5", "Budget Tier", "Card selector",
         "Premium $$ / Luxury $$$ / Ultra-Luxury $$$$"],
        ["6", "Dietary", "Multi-select",
         "7 options; Halal/Kosher/GF trigger extended dietaryNote in prompt"],
        ["7", "Accommodation", "Toggle + optional field",
         "needed \u2192 AI recommends stays; booked \u2192 user-provided hotel name"],
    ]
    story.append(data_table(form_fields[0], form_fields[1:], st,
                             col_widths=[10*mm, 38*mm, 52*mm, BODY_W - 100*mm]))
    story.append(Spacer(1, 4*mm))

    # 4.2 Pipeline
    story.append(Paragraph("4.2 \u2014 AI Itinerary Generation Pipeline", st["h2"]))
    pipeline_steps = [
        ("Step 1: Zod Validation",
         "<b>ItinerarySchema.safeParse()</b> \u2014 12 fields validated before any computation. "
         "Returns 400 with per-field <b>fieldErrors</b>."),
        ("Step 2: Rate Limit",
         "<b>Upstash Redis</b> <b>slidingWindow(5, '1 h')</b> per Clerk userId (auth) or IP "
         "(unauth). Returns 429 + <b>X-RateLimit-*</b> headers. "
         "Zero Anthropic API cost on rate-limited requests."),
        ("Step 3: AI Generation",
         "<b>claude-sonnet-4-6</b> with injection-resistant <b>SYSTEM_PROMPT</b> "
         "(passed as <b>system:</b> param, not in messages[]). "
         "Returns chronological <b>timeline[]</b> per day with real place names + GPS."),
        ("Step 4: JSON Repair",
         "<b>sanitizeJson()</b> regex sweep (strips markdown fences + trailing commas). "
         "If <b>JSON.parse()</b> still fails \u2192 fallback <b>JSON_REPAIR_PROMPT</b> "
         "Anthropic call. Both failures return clean 500."),
        ("Step 5: Place Enrichment",
         "<b>enrichPlace()</b> per timeline item \u2014 <b>PlaceCache</b> check first "
         "(30-day TTL). Miss \u2192 <b>Google Places Text Search</b> + "
         "<b>Place Details</b>. Adds: photoUrl, rating, openNow, hoursOpen, priceLevel."),
        ("Step 6: Transit",
         "Pure <b>Haversine</b> formula \u2014 local math, zero API calls. "
         "Walking 5 km/h, driving 25 km/h between consecutive stops."),
        ("Step 7: Cost Logging",
         "<b>CostLog.create()</b> <b>awaited</b> before Response.json(). "
         "Vercel freezes the function on response return \u2014 awaiting guarantees "
         "financial record integrity."),
    ]
    story.append(kv_table(pipeline_steps, st,
                           col_widths=[48*mm, BODY_W - 48*mm]))
    story.append(Spacer(1, 4*mm))

    # 4.3 Display
    story.append(Paragraph("4.3 \u2014 Split-Screen Itinerary Display", st["h2"]))
    story.append(Paragraph(
        "Desktop: 55% scrollable editorial timeline (left) + 45% sticky "
        "<b>Google Map</b> (right). "
        "Mobile: full-width timeline with collapsible h-52 map banner. "
        "Tabbed day navigation with <b>AnimatePresence mode=\"wait\"</b> transitions.",
        st["body"]
    ))
    story += bullet_list([
        "<b>TimelineCard</b>: unified card for activities AND meals \u2014 "
        "photo, name, description, rating, open/closed badge, priceLevel, transit connector",
        "<b>StayCard</b>: Booking.com affiliate card for recommended hotels (AID 4013143)",
        "<b>Hidden Gem</b>: 1 per day \u2014 places 95% of tourists never find",
        "Day-centric SVG map markers with colour-coded legend (5 palette slots, "
        "keyed by day number not activity type)",
        "Polyline connecting all stops in chronological order: "
        "strokeColor #0A0A0A, strokeOpacity 0.08",
    ], st)
    story.append(Spacer(1, 4*mm))

    # 4.4 Archive
    story.append(Paragraph("4.4 \u2014 Trip Archive (/trips)", st["h2"]))
    story += bullet_list([
        "Clerk-authenticated \u2014 only the owning user sees their trips",
        "IDOR-protected \u2014 /trips/[id] enforces userId ownership on every fetch; "
        "neutral notFound() for both missing and wrong-owner",
        "<b>useOfflineTrips</b> hook caches archive in <b>localStorage</b> "
        "(<b>seek_wander_archive</b>) for offline access",
        "Offline banner shown when navigator.onLine is false or /api/trips fetch fails",
        "<b>UnauthenticatedState</b> \u2018Velvet Rope\u2019 \u2014 editorial gate, "
        "Clerk modal sign-in (no redirect pages)",
        "<b>EmptyTripsState</b> \u2018Inspiration Hub\u2019 \u2014 3 destination teasers "
        "instead of a blank screen",
    ], st)
    story.append(Spacer(1, 4*mm))

    # 4.5 PDF & Sharing
    story.append(Paragraph("4.5 \u2014 PDF Export & Public Sharing", st["h2"]))
    story += bullet_list([
        "<b>PDF Export</b>: window.print() \u2014 zero dependencies. "
        "Tailwind print: modifiers hide nav, map, tabs. "
        "All days rendered sequentially. "
        "Framer Motion opacity overridden in @media print.",
        "Branded dossier header in print: Seek Wander wordmark, destination, date "
        "\u2014 hidden on screen (hidden print:block).",
        "<b>Public Sharing</b>: /shared/[id] \u2014 intentionally public, no auth. "
        "Dynamic OG metadata (title, editorial description, destination photo) "
        "for iMessage/Slack/WhatsApp previews.",
        "<b>ShareButton</b>: navigator.share() (mobile native) with "
        "clipboard fallback + <b>Sonner</b> toast confirmation.",
    ], st)

    story.append(PageBreak())

    # ── 5. Business Model ────────────────────────────────────────────────────
    story += section_header("05", "Business Model", st)
    story.append(phase_rule())

    story.append(Paragraph("Revenue Streams", st["h2"]))
    revenue = [
        ["Stream", "Mechanism", "Status"],
        ["Affiliate \u2014 Hotels",
         "Booking.com <b>AID 4013143</b>. Every recommended stay links to "
         "Booking.com search results. Commission on completed bookings via "
         "Booking.com affiliate programme. URL pattern: "
         "booking.com/searchresults.html?ss={query}&aid=4013143",
         status_p("Live", st)],
        ["Stripe Paywall (Phase 12)",
         "$4.99 per generation after free tier (1 free generation per account). "
         "<b>Stripe Checkout</b> \u2014 no credit card required to browse.",
         status_p("Planned", st)],
        ["Brand Partnerships (Phase 13)",
         "Destination tourism boards, luxury hotel chains paying for featured "
         "placement in recommended stays and editorial content.",
         status_p("Future", st)],
    ]
    story.append(data_table(
        revenue[0], revenue[1:], st,
        col_widths=[38*mm, 100*mm, 29*mm]
    ))

    story.append(Paragraph("Booking.com Affiliate \u2014 Technical Integration", st["h2"]))
    story.append(kv_table([
        ("Affiliate ID",
         "4013143 \u2014 registered to Seek Wander Booking.com partner account"),
        ("Utility function",
         "<b>src/lib/affiliate.ts</b> \u2014 createAffiliateUrl(hotelName, destination) "
         "returns encoded URL with &aid=4013143 appended"),
        ("URL pattern",
         "https://www.booking.com/searchresults.html?ss={encodeURIComponent(hotelName "
         "+ ' ' + destination)}&aid=4013143"),
        ("StayCard component",
         "<b>src/components/StayCard.tsx</b> \u2014 motion.a, whileHover y:-2, "
         "ArrowUpRight icon CTA, micro-copy 'From [hotel name]', target='_blank' "
         "rel='noopener noreferrer'"),
        ("Placement in ItineraryViewer",
         "Rendered after the timeline section when "
         "<b>itinerary.recommendedStays?.length > 0</b>. "
         "Each StayCard maps one recommendedStay to one affiliate link."),
        ("Print behaviour",
         "print:hidden \u2014 StayCard section excluded from PDF dossier. "
         "Affiliate links have no value in a static PDF."),
        ("Attribution window",
         "Booking.com: 30-day last-click cookie. "
         "Commission varies by property: typically 25\u201335% of Booking.com margin."),
    ], st))

    story += callout(
        "i NOTE \u2014 ACCOMMODATION BRANCHING",
        "The AI prompt branches dynamically on <b>accommodationStatus</b>: "
        "when set to <b>'needed'</b>, the SYSTEM_PROMPT instructs "
        "<b>claude-sonnet-4-6</b> to generate a <b>recommendedStays[]</b> array "
        "(3 curated hotels with name, description, neighbourhood). "
        "When set to <b>'booked'</b>, the user-supplied hotelName is used as the "
        "itinerary base and no StayCard section renders. "
        "This prevents affiliate links appearing when the user has already committed.",
        st, accent=EMERALD
    )

    story.append(Paragraph("Unit Economics", st["h2"]))
    econ = [
        ["Item", "Cost"],
        ["Anthropic claude-sonnet-4-6 input",       "$3.00 / 1M tokens"],
        ["Anthropic claude-sonnet-4-6 output",      "$15.00 / 1M tokens"],
        ["Google Places Text Search",               "$0.032 / call"],
        ["Google Place Details",                    "$0.017 / call"],
        ["Typical generation (cache cold)",         "$0.08 \u2013 $0.14"],
        ["Typical generation (60% cache hit)",      "$0.05 \u2013 $0.09"],
        ["PlaceCache hit savings (per item)",       "$0.049 (Text Search + Details)"],
        ["Vercel Pro hosting",                      "$20 / month flat"],
        ["Supabase Pro",                            "$25 / month flat"],
        ["Upstash Redis",                           "~$0 (within free tier at current volume)"],
    ]
    story.append(data_table(econ[0], econ[1:], st,
                             col_widths=[110*mm, 57*mm]))

    story.append(PageBreak())

    # ── 6. UX Specifications ─────────────────────────────────────────────────
    story += section_header("06", "UX & Design Specifications", st)
    story.append(phase_rule())

    story.append(Paragraph("Design Tokens", st["h2"]))
    design_tokens = [
        ["Token", "Hex", "Usage"],
        ["paper",        "#F5F0E8", "Primary backgrounds \u2014 warm off-white"],
        ["paper-dark",   "#EDE8DC", "Card backgrounds, subtle depth"],
        ["ink",          "#0A0A0A", "Primary text, borders"],
        ["ink-light",    "#6B6B6B", "Secondary text, captions, placeholders"],
        ["emerald",      "#059669", "Active states, OPEN badge"],
        ["burnt-orange", "#C2410C", "CTA buttons, active tab indicator, CLOSED badge"],
    ]
    story.append(data_table(design_tokens[0], design_tokens[1:], st,
                             col_widths=[40*mm, 38*mm, 89*mm]))

    story.append(Paragraph("Non-Negotiable Component Rules", st["h2"]))
    story += bullet_list([
        "NO border-radius anywhere \u2014 rounded-none on every component "
        "(one explicit exception: MobileMenu hamburger uses rounded-full as a "
        "mobile touch affordance)",
        "Thin borders only \u2014 border border-black/5 or border-b border-ink/20",
        "<b>Framer Motion</b> on all sections \u2014 "
        "initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }} "
        "transition={{ duration:0.6, ease:'easeOut' }}",
        "Images: grayscale by default, full colour on hover "
        "(filter: grayscale(100%) \u2192 grayscale(0%), transition-all duration-700)",
        "Typography: <b>Cormorant Garamond</b> italic for headings, "
        "<b>DM Sans</b> for body/micro-copy",
        "Micro-copy: UPPERCASE, tracking-widest, DM Sans Bold",
        "HTML entities always: &amp;apos; &amp;quot; &amp;hellip; \u2014 "
        "never raw special characters in JSX",
    ], st)

    story.append(Paragraph("Notification System (<b>Sonner</b>)", st["h2"]))
    story.append(Paragraph(
        "All three generation-lifecycle toasts share <b>id: 'curate-task'</b> \u2014 "
        "Sonner mutates the same toast in place (no stacking). "
        "Styled to match brand: background #F5F0E8, borderRadius 0, "
        "fontFamily var(--font-dm-sans).",
        st["body"]
    ))
    notif_rows = [
        ["State", "Title", "Description", "Trigger"],
        ["Loading", "Consulting the concierge\u2026",
         "(spinner)", "Fetch start"],
        ["Success", "Itinerary Prepared",
         "Your bespoke journey is ready for review.", "200 response"],
        ["Error", "Concierge Busy",
         "Our desk is at capacity. Please try again in a moment.",
         "Any error / 429"],
        ["Save OK", "Passport Updated",
         "This journey has been saved to your archive.", "Successful DB write"],
        ["Save Err", "Save Failed",
         "Unable to save this journey. Please try again.", "DB exception"],
    ]
    story.append(data_table(notif_rows[0], notif_rows[1:], st,
                             col_widths=[22*mm, 42*mm, 68*mm, 35*mm]))
    story.append(PageBreak())

    # ── 7. Mobile & PWA ──────────────────────────────────────────────────────
    story += section_header("07", "Mobile & PWA Requirements", st,
                             "STATUS: INSTALLABLE PWA")
    story.append(phase_rule())

    story.append(Paragraph("Service Worker Strategy (<b>@serwist/next</b>)", st["h2"]))
    story.append(Paragraph(
        "Source: <b>src/app/sw.ts</b> \u2192 compiled to <b>public/sw.js</b> "
        "by the <b>@serwist/next</b> webpack plugin. "
        "Disabled in <b>process.env.NODE_ENV === 'development'</b> to prevent "
        "stale cache contaminating hot-reload sessions.",
        st["body"]
    ))
    sw_rows = [
        ["Cache Strategy", "Scope", "TTL / Cap", "Purpose"],
        ["CacheFirst",
         "Google Places photo URLs (photoreference)",
         "30-day TTL, 100-entry cap",
         "Destination photos load instantly on repeat views; "
         "zero Google API calls after first fetch"],
        ["defaultCache (StaleWhileRevalidate)",
         "Next.js JS chunks, CSS bundles, fonts",
         "Version-controlled",
         "App shell loads offline; new deploys invalidate stale chunks"],
        ["No cache",
         "API routes (/api/*), Clerk auth endpoints",
         "\u2014",
         "Dynamic data must always be fresh; auth tokens must not be cached"],
    ]
    story.append(data_table(sw_rows[0], sw_rows[1:], st,
                             col_widths=[33*mm, 50*mm, 30*mm, BODY_W - 113*mm]))

    story.append(Paragraph("localStorage Vault \u2014 <b>seek_wander_archive</b>", st["h2"]))
    story.append(Paragraph(
        "The <b>useOfflineTrips</b> hook implements a two-phase offline strategy "
        "that enables the /trips archive to render without connectivity:",
        st["body"]
    ))
    story.append(kv_table([
        ("Cache key",
         "<b>seek_wander_archive</b> \u2014 localStorage key on the user's device"),
        ("Stored shape",
         "<b>CachedTrip[]</b> \u2014 includes destination, days, createdAt, "
         "itineraryData (for editorial preview), and destination photoUrl "
         "(pre-resolved server-side via MAPS_SERVER_KEY)"),
        ("Phase 1 \u2014 Immediate",
         "On mount: check <b>navigator.onLine === false</b>. "
         "If offline, load from localStorage immediately. "
         "No network request attempted."),
        ("Phase 2 \u2014 Fetch-then-cache",
         "If online: fetch <b>GET /api/trips</b> (Clerk-authed). "
         "On success: serialize response to localStorage. "
         "On fetch failure: fall through to localStorage, set "
         "<b>isOffline: true</b>."),
        ("UI indicator",
         "<b>bg-ink text-paper</b> offline banner with <b>WifiOff</b> icon. "
         "Shown when isOffline is true regardless of navigator.onLine "
         "(covers server-down scenarios as well as true offline)."),
        ("Cache invalidation",
         "Every successful /api/trips response overwrites the cache. "
         "Stale data is shown only when no live response is available."),
    ], st))

    story += callout(
        "i NOTE \u2014 SERVER-SIDE PHOTO RESOLUTION",
        "Photo URLs are computed server-side in <b>GET /api/trips</b> using "
        "<b>MAPS_SERVER_KEY</b>. The client (<b>TripsClient.tsx</b>) receives "
        "pre-resolved URL strings \u2014 it never holds or references the server API key. "
        "This is the canonical pattern for any server-only secret that produces "
        "client-visible URLs.",
        st, accent=EMERALD
    )

    story.append(Paragraph("Responsive Breakpoints", st["h2"]))
    story += bullet_list([
        "Mobile (< 768px): full-width single-column layout, "
        "map collapses to h-52 banner above timeline",
        "Desktop (\u2265 768px): 55%/45% split-screen \u2014 timeline left, sticky map right",
        "Hamburger menu hidden at md+ breakpoint (desktop nav takes over)",
        "Print: single-column, all days sequential, map/nav/buttons hidden (print:hidden)",
    ], st)

    story.append(PageBreak())

    # ── 8. Security ──────────────────────────────────────────────────────────
    story += section_header("08", "Security Requirements", st,
                             "STATUS: 10 CONTROLS ACTIVE")
    story.append(phase_rule())

    story += callout(
        "! IMPORTANT \u2014 SECURITY PHILOSOPHY",
        "All security controls are defence-in-depth: each layer assumes the previous "
        "has already been bypassed. "
        "<b>Zod</b> validates before any API call. "
        "<b>Upstash</b> rate-limits before any Anthropic call. "
        "<b>SYSTEM_PROMPT</b> injection defence operates independently of input validation. "
        "IDOR ownership checks are performed post-fetch, never via query scoping alone.",
        st, accent=BURNT
    )

    security_matrix = [
        ["Feature", "Risk Mitigated", "Business Value"],
        ["<b>Zod ItinerarySchema</b> validation on all POST bodies",
         "Malformed payloads crashing AI pipeline or DB write",
         "Zero 500 errors from bad user input; clean 400s with field-level feedback"],
        ["<b>Prompt Injection Defence</b> (SYSTEM_PROMPT as system: param)",
         "User-supplied destination/interests fields hijacking AI role "
         "or exfiltrating system state",
         "Itinerary quality guaranteed regardless of adversarial input"],
        ["<b>Upstash Redis</b> rate limiting: slidingWindow(5, '1 h')",
         "API cost exhaustion attacks; a single actor flooding Anthropic spend",
         "Hard cost ceiling per user; 429 returned before any AI token is consumed"],
        ["<b>AI JSON Self-Healing</b> (sanitizeJson + repair prompt)",
         "Malformed Claude output (markdown fences, trailing commas) "
         "reaching the UI as a broken render",
         "0% broken itinerary displays; silent repair is invisible to users"],
        ["<b>Google API Key Isolation</b> (client vs server key split)",
         "Client key theft enabling unrestricted Google API usage billed to project",
         "Client key restricted to HTTP referrers; "
         "MAPS_SERVER_KEY never transmitted to browser"],
        ["<b>IDOR Prevention</b> (post-fetch userId ownership check)",
         "User A accessing User B\u2019s saved trips via /trips/[id]",
         "Data privacy compliance; neutral notFound() leaks no ownership info"],
        ["<b>Auth Guard</b> on /api/trips (Clerk userId check)",
         "Unauthenticated scraping of all user trip data",
         "All queries scoped to { where: { userId } }; "
         "cross-user access structurally impossible"],
        ["<b>HTTP Security Headers</b> (X-Frame-Options, nosniff, "
         "Referrer-Policy, Permissions-Policy)",
         "Clickjacking, MIME-type confusion, cross-origin data leaks",
         "Baseline security posture; passes OWASP header checklist"],
        ["<b>Admin Neutral 404</b> on /admin/metrics",
         "Route enumeration revealing admin panel existence to non-admin users",
         "notFound() (not redirect) means the route\u2019s existence is not disclosed"],
        ["<b>Cron Bearer Auth</b> (Authorization: Bearer CRON_SECRET)",
         "External actors triggering daily PlaceCache cleanup manually",
         "Database integrity; Vercel injects CRON_SECRET on every scheduled run"],
    ]
    story.append(data_table(
        security_matrix[0], security_matrix[1:], st,
        col_widths=[48*mm, 65*mm, 54*mm]
    ))

    story.append(PageBreak())

    # ── 9. Success Metrics ───────────────────────────────────────────────────
    story += section_header("09", "Success Metrics & KPIs", st)

    story.append(Paragraph("Product Metrics", st["h2"]))
    metrics_rows = [
        ["Metric", "Definition", "Target"],
        ["Generation completion rate",
         "% of started generations that return a result", "> 95%"],
        ["Generation latency (p50)",
         "Time from form submit to itinerary display", "< 20s"],
        ["Cache hit rate",
         "PlaceCache hits / total enrichment calls", "> 60% (steady state)"],
        ["Cost per generation",
         "AI + Google API spend per itinerary", "< $0.12"],
        ["Save rate",
         "% of generated itineraries saved to archive", "> 30%"],
        ["Share rate",
         "% of saved trips shared via ShareButton", "> 15%"],
        ["PDF export rate",
         "% of saved trips exported to PDF", "> 10%"],
        ["Mobile install rate",
         "PWA installs / mobile unique visitors", "> 5%"],
        ["Affiliate CTR",
         "Clicks on StayCard Booking.com links / itineraries with stays", "> 20%"],
    ]
    story.append(data_table(metrics_rows[0], metrics_rows[1:], st,
                             col_widths=[58*mm, 82*mm, 27*mm]))

    story.append(Paragraph("Business Metrics", st["h2"]))
    biz_rows = [
        ["Metric", "Definition"],
        ["Monthly affiliate revenue",
         "Commission from Booking.com partner dashboard (AID 4013143)"],
        ["Affiliate conversion rate",
         "Confirmed bookings / affiliate clicks \u2014 target > 3%"],
        ["Cost margin",
         "(Affiliate rev + future Stripe) / Total AI + Google API cost"],
        ["Monthly Active Users",
         "Unique Clerk userIds with \u2265 1 generation in rolling 30 days"],
    ]
    story.append(data_table(biz_rows[0], biz_rows[1:], st,
                             col_widths=[72*mm, 95*mm]))

    story.append(PageBreak())

    # ── 10. Roadmap ──────────────────────────────────────────────────────────
    story += section_header("10", "Phase Roadmap", st)
    story.append(phase_rule())

    roadmap = [
        ["Phase", "Scope", "Status"],
        ["1 \u2014 Core Engine",
         "Next.js + Claude + Google Maps baseline",
         status_p("[PHASE: COMPLETE]", st)],
        ["2 \u2014 Concierge UX",
         "7-field intake, split-screen results, enrichment, Haversine transit",
         status_p("[PHASE: COMPLETE]", st)],
        ["3 \u2014 Ultra-Luxury UI",
         "Tabbed day nav, cost badges, transit connectors, day-centric markers",
         status_p("[PHASE: COMPLETE]", st)],
        ["4 \u2014 Auth",
         "Clerk v6, conditional ClerkProvider, NavbarAuth, custom 404",
         status_p("[PHASE: COMPLETE]", st)],
        ["5 \u2014 Persistence",
         "Prisma + Supabase, saveTrip, /trips, /trips/[id], IDOR enforcement",
         status_p("[PHASE: COMPLETE]", st)],
        ["6 \u2014 PWA & Sharing",
         "@serwist/next, /shared/[id] OG metadata, ShareButton, PDF export",
         status_p("[PHASE: COMPLETE]", st)],
        ["7 \u2014 Timeline Refactor",
         "timeline: TimelineItem[] canonical shape, normalizeDayPlan() shim",
         status_p("[PHASE: COMPLETE]", st)],
        ["8 \u2014 Margin Protection",
         "PlaceCache, Haversine, CostLog, /admin/metrics, Cron, Zod, headers",
         status_p("[PHASE: COMPLETE]", st)],
        ["9 \u2014 Affiliate",
         "Booking.com AID 4013143, StayCard, accommodation branching",
         status_p("[PHASE: COMPLETE]", st)],
        ["10 \u2014 UX & Polish",
         "GenerationLoader, Sonner toasts, UnauthenticatedState, EmptyTrips, "
         "MobileMenu portal fix",
         status_p("[PHASE: COMPLETE]", st)],
        ["11 \u2014 Mobile & Resilience",
         "useOfflineTrips, /api/trips, Upstash rate limiting, "
         "AI JSON self-healing, dynamic OG metadata",
         status_p("[PHASE: COMPLETE]", st)],
        ["12 \u2014 Stripe Paywall",
         "$4.99 / generation after 1 free \u2014 Stripe Checkout, usage tracking",
         status_p("[PHASE: NEXT]", st)],
        ["13 \u2014 Brand Partnerships",
         "Featured placement for destination tourism boards + luxury hotel chains",
         status_p("[PHASE: FUTURE]", st)],
    ]
    story.append(data_table(roadmap[0], roadmap[1:], st,
                             col_widths=[38*mm, 108*mm, 21*mm]))

    doc.build(story)
    print(f"PRS written -> {path}")
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
        canvasmaker=make_canvas_factory(
            "TDD", "Technical Due Diligence \u2014 v2.0")
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
        ("Document Version",  "2.0 \u2014 Phase 11 Complete"),
        ("Date",              "March 2026"),
        ("Status",            "[STATUS: PRODUCTION READY]  All 11 phases deployed"),
        ("Production URL",    "travel-planner-v2-pearl.vercel.app"),
        ("Repository",        "github.com/RomaanR/travel-planner-v2"),
        ("Classification",    "Confidential \u2014 Technical Review"),
    ], st))
    story.append(Spacer(1, 8*mm))
    story.append(Paragraph(
        "This document is a complete technical review of Seek Wander\u2019s "
        "production architecture. All systems described are live, committed, and deployed. "
        "Coverage: system architecture, security controls, data schemas, "
        "cost model, affiliate integration, PWA/offline strategy, and deployment topology. "
        "No fluff \u2014 every section is sourced directly from the production codebase.",
        st["body"]
    ))
    story.append(PageBreak())

    # ── 1. Product Summary ────────────────────────────────────────────────────
    story += section_header("01", "Product Summary", st,
                             "STATUS: PRODUCTION READY")
    story.append(Paragraph(
        "Seek Wander is a luxury AI travel concierge that generates bespoke, "
        "multi-day itineraries. Users complete a 7-field intake form; the system "
        "returns a geographically-verified, chronologically-ordered day plan with "
        "restaurant recommendations, hidden gems, transit estimates, curated hotel "
        "stays, and destination photography \u2014 in 15\u201320 seconds.",
        st["body"]
    ))

    story += callout(
        "! ZERO-HALLUCINATION GUARANTEE",
        "Every AI-generated location is enriched post-generation via "
        "<b>Google Places API</b>, so ratings, opening hours, and photos are "
        "ground-truthed before the user ever sees the output. "
        "The model cannot fabricate a location that passes Place enrichment \u2014 "
        "non-existent places return null and render gracefully without crashing.",
        st, accent=BURNT
    )

    story.append(PageBreak())

    # ── 2. System Architecture ─────────────────────────────────────────────
    story += section_header("02", "System Architecture", st)
    story.append(phase_rule())

    story.append(Paragraph("Layer Overview", st["h2"]))
    arch_rows = [
        ["Layer", "Technology", "Responsibility"],
        ["Client",
         "<b>Next.js 14</b> App Router, <b>Tailwind CSS</b>, "
         "<b>Framer Motion 12</b>, <b>@react-google-maps/api</b>",
         "Rendering, animation, form intake, map display"],
        ["Edge/Serverless",
         "<b>Vercel</b> \u2014 Next.js API Routes",
         "Request handling, AI orchestration, enrichment pipeline"],
        ["AI Engine",
         "<b>Anthropic claude-sonnet-4-6</b> (max_tokens: 8192)",
         "Itinerary generation from structured user profile"],
        ["Place Data",
         "<b>Google Places API</b> (Text Search + Details)",
         "Location verification, photos, ratings, opening hours"],
        ["Auth",
         "<b>Clerk v6</b>",
         "User identity, session management, modal sign-in"],
        ["Primary DB",
         "<b>Supabase</b> PostgreSQL via <b>Prisma 7</b>",
         "Trip storage, PlaceCache, CostLog"],
        ["Rate Limiting",
         "<b>Upstash Redis</b>",
         "Sliding window per userId/IP before Anthropic call"],
        ["PWA",
         "<b>@serwist/next</b>",
         "Service worker, photo CacheFirst, app shell offline"],
        ["CDN/Hosting",
         "<b>Vercel Pro</b>",
         "Global edge delivery, serverless functions, cron jobs"],
    ]
    story.append(data_table(arch_rows[0], arch_rows[1:], st,
                             col_widths=[30*mm, 60*mm, 77*mm]))

    story.append(Paragraph("Core Request Pipeline \u2014 POST /api/itinerary", st["h2"]))
    pipeline = [
        ["Step", "Mechanism", "Failure Mode"],
        ["1. Zod Validation",
         "<b>ItinerarySchema.safeParse()</b> \u2014 12 fields",
         "400 + fieldErrors"],
        ["2. Rate Limit Check",
         "<b>Upstash</b> slidingWindow(5, '1 h') per userId/IP",
         "429 + X-RateLimit-* headers"],
        ["3. AI Generation",
         "<b>claude-sonnet-4-6</b> with injection-resistant "
         "<b>SYSTEM_PROMPT</b>",
         "Phase 4 JSON repair"],
        ["4. JSON Sanitisation",
         "<b>sanitizeJson()</b> regex + fallback Anthropic repair call",
         "500 (both phases fail)"],
        ["5. Place Enrichment",
         "<b>enrichPlace()</b> \u00d7 N \u2014 PlaceCache first, "
         "then Google Places",
         "Graceful null (item still renders)"],
        ["6. Transit Calc",
         "<b>Haversine</b> formula \u2014 local math, zero API calls",
         "Never fails"],
        ["7. Cost Logging",
         "<b>CostLog.create()</b> awaited before Response.json()",
         "Non-fatal try/catch"],
    ]
    story.append(data_table(pipeline[0], pipeline[1:], st,
                             col_widths=[38*mm, 90*mm, 39*mm]))

    story.append(PageBreak())

    # ── 3. Technology Stack ──────────────────────────────────────────────────
    story += section_header("03", "Technology Stack", st,
                             "STATUS: ALL DEPENDENCIES LOCKED")
    story.append(phase_rule())

    stack = [
        ["Layer", "Technology", "Version", "Critical Notes"],
        ["Framework",     "Next.js App Router",     "14",
         "TypeScript; server + client components; force-dynamic where needed"],
        ["Styling",       "Tailwind CSS",            "v3",
         "Custom design tokens; rounded-none enforced globally"],
        ["Animation",     "Framer Motion",           "12",
         "AnimatePresence throughout; print:hidden on all motion wrappers"],
        ["Maps",          "@react-google-maps/api",  "Latest",
         "Places Autocomplete, GoogleMap, custom SVG Markers, Polyline"],
        ["AI",            "@anthropic-ai/sdk",       "^0.78",
         "claude-sonnet-4-6; max_tokens 8192; stream disabled"],
        ["Auth",          "@clerk/nextjs",           "v6 ONLY",
         "DO NOT UPGRADE TO v7 \u2014 v7 requires Next.js 15; "
         "<Show> is v7-only and must not be used"],
        ["ORM",           "Prisma",                  "7",
         "Supabase PostgreSQL; PgBouncer port 6543 runtime; "
         "port 5432 for migrations"],
        ["Rate Limiting", "@upstash/ratelimit",      "Latest",
         "Redis-backed; slidingWindow; "
         "key = Clerk userId (auth) or IP (unauth)"],
        ["Notifications", "sonner",                  "2",
         "Branded toast layer; richColors; "
         "id-based mutation (no stacking)"],
        ["PWA",           "@serwist/next",           "Latest",
         "sw.ts \u2192 public/sw.js; disabled in development"],
        ["Validation",    "zod",                     "4",
         "All POST bodies; z.infer<> is the source-of-truth type"],
    ]
    story.append(data_table(stack[0], stack[1:], st,
                             col_widths=[28*mm, 42*mm, 22*mm, 75*mm]))

    story += callout(
        "! CRITICAL VERSION LOCK \u2014 @clerk/nextjs",
        "<b>@clerk/nextjs</b> MUST stay at <b>v6</b>. "
        "Clerk v7 requires Next.js 15 and introduces breaking API changes: "
        "<b>&lt;Show&gt;</b> replaces <b>&lt;SignedIn&gt;/&lt;SignedOut&gt;</b>; "
        "auth() return type changes; middleware API differs. "
        "Any dependency update that pulls in <b>@clerk/nextjs@7+</b> will silently "
        "break the entire auth layer without a compile error.",
        st, accent=BURNT
    )

    story.append(PageBreak())

    # ── 4. Security Architecture ─────────────────────────────────────────────
    story += section_header("04", "Security Architecture", st,
                             "STATUS: 10 CONTROLS ACTIVE")
    story.append(phase_rule())

    story += callout(
        "! DEFENCE-IN-DEPTH MODEL",
        "Each control layer assumes the previous has already been bypassed. "
        "<b>Zod</b> fires before any computation. "
        "<b>Upstash</b> fires before any Anthropic token is consumed. "
        "<b>SYSTEM_PROMPT injection defence</b> is independent of Zod. "
        "IDOR checks are always post-fetch \u2014 never encoded in the WHERE clause alone.",
        st, accent=BURNT
    )

    controls = [
        ["Feature", "Risk Mitigated", "Business Value"],
        ["<b>Zod ItinerarySchema</b>\nsafeParse() \u2014 12 fields",
         "Malformed payloads crashing the AI pipeline or triggering DB exceptions",
         "Clean 400s with per-field feedback; "
         "zero 500s from bad user input"],
        ["<b>SYSTEM_PROMPT</b> injection defence "
         "(system: param, not messages[])",
         "Adversarial destination / interest fields "
         "hijacking AI role or exfiltrating internal prompts",
         "Itinerary quality guaranteed; "
         "system param is processed at a higher trust tier"],
        ["<b>Upstash Redis</b> rate limit "
         "slidingWindow(5, '1 h') per userId / IP",
         "API cost exhaustion: single actor flooding "
         "Anthropic spend to exhaust billing limit",
         "Hard cost ceiling per user; "
         "429 returned before any AI token consumed"],
        ["<b>AI JSON Self-Healing</b> "
         "(sanitizeJson + JSON_REPAIR_PROMPT)",
         "Malformed Claude output (markdown fences, trailing commas) "
         "reaching the UI as a broken or blank itinerary",
         "0% broken itinerary displays; "
         "silent two-phase repair invisible to users"],
        ["<b>Google API Key Split</b> "
         "(NEXT_PUBLIC_ client / MAPS_SERVER_KEY server)",
         "Client key theft enabling unrestricted "
         "Google Maps API usage billed to the project",
         "Client key: HTTP referrer restricted to Vercel + localhost. "
         "Server key: never transmitted to browser"],
        ["<b>IDOR Prevention</b> "
         "(post-fetch userId ownership check on /trips/[id])",
         "User A accessing User B\u2019s saved trips "
         "via direct ID in URL",
         "Data privacy compliance; "
         "neutral notFound() leaks zero ownership information"],
        ["<b>Auth Guard</b> on GET /api/trips "
         "(Clerk userId required)",
         "Unauthenticated scraping of all saved user trips",
         "All queries scoped to { where: { userId } }; "
         "cross-user access structurally impossible"],
        ["<b>HTTP Security Headers</b> "
         "(X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy)",
         "Clickjacking, MIME-type confusion, "
         "cross-origin data leaks",
         "Passes OWASP header checklist; "
         "applied to all routes via next.config.mjs headers()"],
        ["<b>Admin Neutral 404</b> "
         "on /admin/metrics for non-ADMIN_USER_ID",
         "Route enumeration revealing admin panel "
         "existence to non-admin users",
         "notFound() (not redirect) \u2014 "
         "the route\u2019s existence is not disclosed"],
        ["<b>Cron Bearer Auth</b> "
         "(Authorization: Bearer CRON_SECRET)",
         "External actors triggering daily "
         "PlaceCache cleanup on demand",
         "Database integrity; "
         "Vercel injects CRON_SECRET on every scheduled invocation"],
    ]
    story.append(data_table(controls[0], controls[1:], st,
                             col_widths=[46*mm, 66*mm, 55*mm]))

    story.append(PageBreak())

    # ── 5. Data Architecture ─────────────────────────────────────────────────
    story += section_header("05", "Data Architecture", st)
    story.append(phase_rule())

    story.append(Paragraph("Prisma Schema", st["h2"]))

    schema_sections = [
        ("Trip", [
            ("id",            "String UUID",    "Primary key"),
            ("userId",        "String",         "Clerk userId \u2014 no FK constraint"),
            ("destination",   "String",         "Human-readable destination name"),
            ("days",          "Int",            "Trip duration in days"),
            ("itineraryData", "Json",
             "Full ItineraryResponse blob \u2014 cast via "
             "trip.itineraryData as unknown as ItineraryResponse"),
            ("createdAt",     "DateTime",       "Auto-set on create"),
        ]),
        ("PlaceCache", [
            ("id",               "String UUID",  "Primary key"),
            ("cacheKey",         "String UNIQUE",
             "'{normalizedName}|{normalizedCity}' \u2014 "
             "toLowerCase + trim on both parts"),
            ("photoUrl",         "String?",     "Google Places photo URL "
             "(photoreference param \u2014 NOT photo_reference)"),
            ("rating",           "Float?",      "Google Places rating"),
            ("userRatingsTotal", "Int?",        "Review count"),
            ("hoursOpen",        "String?",
             "'9:00 AM \u2013 9:00 PM' \u2014 today\u2019s hours, "
             "day prefix stripped. Used by parseOpenNow()."),
            ("priceLevel",       "Int?",        "0\u20134 price scale"),
            ("updatedAt",        "DateTime",
             "@updatedAt \u2014 Prisma auto-refreshes on every upsert. "
             "Used by Vercel Cron GC (14-day cutoff)."),
        ]),
        ("CostLog", [
            ("userId",      "String?",       "Clerk userId \u2014 null if unauthenticated"),
            ("destination", "String",        "Trip destination"),
            ("aiCost",      "Decimal(10,6)", "Anthropic spend in USD"),
            ("googleCost",  "Decimal(10,6)", "Google Places spend in USD"),
            ("totalCost",   "Decimal(10,6)", "aiCost + googleCost"),
            ("cacheHits",   "Int",           "PlaceCache hits \u2014 zero Google cost"),
            ("cacheMisses", "Int",           "Fresh Google API calls made"),
            ("createdAt",   "DateTime",      "Auto-set on create"),
        ]),
    ]

    for model_name, fields in schema_sections:
        story.append(Paragraph(f"Model: {model_name}", st["h3"]))
        story.append(data_table(
            ["Field", "Type", "Notes"],
            [[f, t, d] for f, t, d in fields],
            st,
            col_widths=[38*mm, 36*mm, 93*mm]
        ))
        story.append(Spacer(1, 4*mm))

    story.append(Paragraph("PlaceCache \u2014 Efficiency Model", st["h2"]))
    story.append(kv_table([
        ("Cache key format",
         "{normalize(name)}|{normalize(city)} \u2014 "
         "toLowerCase + trim on both parts ensures consistent hits"),
        ("Cache hit path",
         "Zero Google API calls. parseOpenNow(hoursOpen, lng) computes "
         "live open/closed status locally using Math.round(lng / 15) hours "
         "as UTC offset (\u00b130 min accuracy \u2014 sufficient for a planning app)."),
        ("Cache miss path",
         "Google Places Text Search ($0.032) + "
         "Place Details ($0.017, skipped for NATURE/ADVENTURE categories). "
         "Result upserted to PlaceCache (fire-and-forget, non-fatal)."),
        ("Savings per item",
         "$0.049 (Text Search + Details). At 60% cache hit rate: "
         "~$0.03 saved per generation on enrichment alone."),
        ("Garbage collection",
         "Vercel Cron runs GET /api/cron/cleanup daily at 00:00 UTC. "
         "Deletes rows where updatedAt < 14 days ago. "
         "@updatedAt auto-refreshes on every cache hit upsert \u2014 "
         "frequently accessed places naturally survive."),
    ], st))

    story.append(PageBreak())

    # ── 6. Observability ─────────────────────────────────────────────────────
    story += section_header("06", "Observability & Cost Control", st,
                             "STATUS: LIVE \u2014 /admin/metrics")

    story.append(Paragraph(
        "/admin/metrics \u2014 Internal BI Dashboard", st["h2"]))
    story.append(Paragraph(
        "Accessible only to the <b>ADMIN_USER_ID</b> Clerk userId "
        "(env var, <b>.trim()</b>\u2019d to prevent Vercel trailing-newline bug). "
        "Non-admin access returns <b>notFound()</b> \u2014 route existence not leaked. "
        "Shows last 200 CostLog rows. "
        "Cost colour-coding: green < $0.15, amber > $0.50.",
        st["body"]
    ))

    story.append(kv_table([
        ("Total Spent",      "SUM(totalCost) across all CostLog rows"),
        ("Total Generations","COUNT(CostLog)"),
        ("Avg Cost / Trip",  "totalSpent / totalGenerations"),
        ("Cache Hit Rate",
         "SUM(cacheHits) / SUM(cacheHits + cacheMisses) \u2014 "
         "target > 60%"),
        ("Cost by Provider",
         "SUM(aiCost) vs SUM(googleCost) \u2014 "
         "Claude vs Google split per generation"),
    ], st))

    story.append(Paragraph("Unit Economics Reference", st["h2"]))
    econ = [
        ["Item", "Cost"],
        ["Anthropic input tokens",            "$3.00 / 1M tokens"],
        ["Anthropic output tokens",           "$15.00 / 1M tokens"],
        ["Google Text Search",                "$0.032 / call"],
        ["Google Place Details",              "$0.017 / call"],
        ["Cache cold generation",             "$0.08 \u2013 $0.14"],
        ["Cache warm generation (60% hits)",  "$0.05 \u2013 $0.09"],
    ]
    story.append(data_table(econ[0], econ[1:], st,
                             col_widths=[100*mm, 67*mm]))

    story.append(PageBreak())

    # ── 7. Affiliate Monetization ────────────────────────────────────────────
    story += section_header("07", "Affiliate Monetization Architecture", st,
                             "STATUS: LIVE \u2014 AID 4013143")
    story.append(phase_rule())

    story.append(Paragraph(
        "Booking.com Integration \u2014 Technical Specification", st["h2"]))
    story.append(kv_table([
        ("Affiliate ID",
         "<b>4013143</b> \u2014 Seek Wander partner account. "
         "No SDK \u2014 URL-based integration only."),
        ("Utility: createAffiliateUrl()",
         "<b>src/lib/affiliate.ts</b>. "
         "Signature: createAffiliateUrl(hotelName: string, destination: string): string. "
         "Output: https://www.booking.com/searchresults.html"
         "?ss={encodeURIComponent(hotelName + ' ' + destination)}&aid=4013143"),
        ("StayCard component",
         "<b>src/components/StayCard.tsx</b>. "
         "Renders as motion.a (whileHover: y:-2). "
         "ArrowUpRight icon + 'View on Booking.com' micro-copy. "
         "target='_blank' rel='noopener noreferrer'. "
         "print:hidden \u2014 excluded from PDF dossier."),
        ("Data shape",
         "recommendedStays[]: Array<{ name: string; description: string; "
         "neighbourhood: string }>. "
         "Generated by claude-sonnet-4-6 when accommodationStatus === 'needed'. "
         "Absent when accommodationStatus === 'booked'."),
        ("Placement in ItineraryViewer",
         "Rendered after the daily timeline section, before the bottomSection slot. "
         "Conditional: only shown when itinerary.recommendedStays?.length > 0."),
        ("Attribution",
         "Booking.com 30-day last-click cookie. "
         "Commission: ~25\u201335% of Booking.com margin per completed booking."),
        ("Analytics",
         "Booking.com partner dashboard tracks impressions, "
         "clicks, and completed bookings under AID 4013143."),
    ], st))

    story += callout(
        "i NOTE \u2014 ACCOMMODATION BRANCHING IN SYSTEM_PROMPT",
        "When <b>accommodationStatus === 'needed'</b>: the SYSTEM_PROMPT instructs "
        "<b>claude-sonnet-4-6</b> to generate "
        "<b>recommendedStays[]</b> (3 curated hotels with name, description, neighbourhood). "
        "When <b>accommodationStatus === 'booked'</b>: the user-supplied "
        "<b>hotelName</b> is woven into the itinerary narrative as the base hotel "
        "and <b>recommendedStays[]</b> is omitted entirely. "
        "This prevents affiliate cards appearing when the user has already committed \u2014 "
        "protecting UX trust while maximising affiliate click opportunity on "
        "undecided users.",
        st, accent=EMERALD
    )

    story.append(Paragraph("Monetization Flow Diagram", st["h2"]))
    flow_rows = [
        ["Step", "Actor", "Action"],
        ["1", "User",     "Sets accommodationStatus = 'needed' in CurationForm"],
        ["2", "API Route","SYSTEM_PROMPT branch: instructs Claude to generate recommendedStays[]"],
        ["3", "Claude",   "Returns recommendedStays[] with 3 hotel objects in JSON response"],
        ["4", "ItineraryViewer", "StayCard renders per hotel; createAffiliateUrl() called client-side"],
        ["5", "User",     "Clicks StayCard \u2192 opens Booking.com with AID 4013143 in URL"],
        ["6", "Booking.com", "30-day cookie set; commission triggered on confirmed booking"],
        ["7", "/admin/metrics", "Revenue tracked via Booking.com partner dashboard (external)"],
    ]
    story.append(data_table(flow_rows[0], flow_rows[1:], st,
                             col_widths=[12*mm, 38*mm, BODY_W - 50*mm]))

    story.append(PageBreak())

    # ── 8. PWA & Offline ─────────────────────────────────────────────────────
    story += section_header("08", "PWA & Offline Architecture", st,
                             "STATUS: INSTALLABLE PWA")
    story.append(phase_rule())

    story.append(Paragraph(
        "Service Worker Strategy \u2014 <b>@serwist/next</b>", st["h2"]))
    story.append(Paragraph(
        "Source: <b>src/app/sw.ts</b> \u2192 compiled to <b>public/sw.js</b> "
        "by the <b>@serwist/next</b> webpack plugin (configured in "
        "<b>next.config.mjs</b> via withSerwist()). "
        "Service worker is <b>disabled</b> when "
        "<b>process.env.NODE_ENV === 'development'</b> to prevent stale cache "
        "contaminating hot-reload sessions.",
        st["body"]
    ))
    sw_rows = [
        ["Cache Strategy", "URL Scope", "TTL / Cap", "Rationale"],
        ["<b>CacheFirst</b>",
         "Google Places photo URLs "
         "(contain photoreference parameter)",
         "30-day TTL, 100-entry cap",
         "Photos never change once fetched. "
         "CacheFirst = zero network request on repeat views. "
         "Cap prevents unbounded storage growth."],
        ["<b>StaleWhileRevalidate</b> (defaultCache)",
         "Next.js JS chunks, CSS bundles, static fonts",
         "Versioned by build hash",
         "App shell loads from cache instantly. "
         "New deploy invalidates stale chunks via "
         "Next.js build hash in URL."],
        ["<b>NetworkOnly</b> (implicit)",
         "API routes (/api/*), Clerk auth endpoints, "
         "Supabase queries",
         "\u2014",
         "Dynamic data must always be fresh. "
         "Auth tokens must not be served from cache."],
    ]
    story.append(data_table(sw_rows[0], sw_rows[1:], st,
                             col_widths=[32*mm, 47*mm, 27*mm, BODY_W - 106*mm]))

    story.append(Paragraph(
        "localStorage Vault \u2014 Offline Trip Archive", st["h2"]))
    story.append(Paragraph(
        "The <b>useOfflineTrips</b> hook implements a "
        "two-phase offline detection + recovery strategy. "
        "The vault key is <b>seek_wander_archive</b> in localStorage.",
        st["body"]
    ))

    vault_rows = [
        ["Phase", "Trigger", "Behaviour"],
        ["Phase 1 \u2014 Pre-fetch check",
         "navigator.onLine === false on component mount",
         "Load from localStorage immediately. "
         "No network request attempted. "
         "isOffline = true. Offline banner shown."],
        ["Phase 2 \u2014 Fetch-then-cache",
         "navigator.onLine === true",
         "Fetch GET /api/trips (Clerk-authed). "
         "Success: persist to localStorage, render live data. "
         "Failure: load from localStorage, "
         "isOffline = true."],
        ["Phase 3 \u2014 Cache persistence",
         "Every successful /api/trips response",
         "Serialize CachedTrip[] to localStorage. "
         "Overwrites any stale data. "
         "Next offline visit uses this fresh snapshot."],
    ]
    story.append(data_table(vault_rows[0], vault_rows[1:], st,
                             col_widths=[38*mm, 55*mm, BODY_W - 93*mm]))

    story.append(kv_table([
        ("Vault key",
         "<b>seek_wander_archive</b>"),
        ("Stored shape",
         "CachedTrip[] \u2014 {id, userId, destination, days, createdAt, "
         "itineraryData, photoUrl}. photoUrl is pre-resolved server-side "
         "via MAPS_SERVER_KEY."),
        ("Photo URL resolution",
         "Computed in <b>GET /api/trips</b> route handler using "
         "<b>MAPS_SERVER_KEY</b>. Client (<b>TripsClient.tsx</b>) receives "
         "plain URL strings \u2014 never holds the server API key."),
        ("Offline indicator",
         "<b>bg-ink text-paper</b> banner with <b>WifiOff</b> icon. "
         "Shown whenever isOffline === true, regardless of "
         "navigator.onLine (covers server-down scenarios too)."),
    ], st))

    story += callout(
        "! IMPORTANT \u2014 WHY TWO-PHASE?",
        "Phase 1 (navigator.onLine check) catches true offline scenarios instantly "
        "without making a failing network request. "
        "Phase 2 (fetch failure fallback) catches scenarios where the device "
        "reports online but the server is down or the Clerk token has expired. "
        "Combined, the vault degrades gracefully under all real-world conditions.",
        st, accent=BURNT
    )

    story.append(Paragraph("PWA Manifest", st["h2"]))
    story.append(kv_table([
        ("Source",           "<b>src/app/manifest.ts</b> \u2014 "
         "Next.js MetadataRoute.Manifest type"),
        ("App name",         "Seek Wander (no 'AI' in name)"),
        ("Display mode",     "standalone \u2014 hides browser chrome on install"),
        ("Background color", "#F6F1EB \u2014 matches paper palette on splash screen"),
        ("Theme color",      "#1B1817 \u2014 dark ink for status bar"),
        ("Icons",            "/icon-192x192.png and /icon-512x512.png in /public/"),
        ("iOS meta",         "appleWebApp: capable:true, "
         "statusBarStyle:default, title:'Seek Wander'"),
    ], st))

    story.append(PageBreak())

    # ── 9. Mobile-First Design ────────────────────────────────────────────────
    story += section_header("09", "Mobile-First Design", st)
    story.append(phase_rule())

    story.append(Paragraph("Responsive Layout Grid", st["h2"]))
    layout_rows = [
        ["Breakpoint", "Layout", "Map Behaviour"],
        ["Mobile (< 768px)",
         "Full-width single-column timeline",
         "h-52 banner above timeline (collapses on scroll)"],
        ["Desktop (\u2265 768px)",
         "55% editorial timeline / 45% sticky map split-screen",
         "Sticky right panel \u2014 position:sticky, h-full"],
        ["Print (@media print)",
         "Single-column, all days sequential, "
         "page-break between days",
         "print:hidden \u2014 entirely removed from output"],
    ]
    story.append(data_table(layout_rows[0], layout_rows[1:], st,
                             col_widths=[38*mm, 87*mm, 42*mm]))

    story.append(Paragraph(
        "MobileMenu Overlay \u2014 CSS Stacking Context Resolution", st["h2"]))

    story += callout(
        "! ARCHITECTURAL LESSON LEARNED",
        "<b>Root cause of the mobile menu transparency bug:</b> "
        "<b>backdrop-blur-sm</b> applied to the root <b>motion.nav</b> element "
        "in Navbar.tsx creates a new CSS stacking context. "
        "Any fixed-positioned descendant is anchored to that ancestor \u2014 "
        "not the viewport. The overlay\u2019s <b>fixed inset-0</b> was therefore "
        "anchored to the ~64px Navbar bar, not the full screen. "
        "background-color, z-index, and opacity were all irrelevant \u2014 "
        "the overlay literally did not extend past the Navbar\u2019s boundaries.\n\n"
        "<b>Resolution:</b> <b>createPortal(overlay, document.body)</b> moves "
        "the DOM node outside the Navbar tree entirely. "
        "fixed inset-0 then covers the true viewport. "
        "SSR guard: <b>mounted</b> state + useEffect ensures document.body "
        "is available before the portal renders.\n\n"
        "<b>Architectural rule:</b> Any fixed full-screen overlay rendered inside "
        "a component with <b>backdrop-filter</b>, <b>transform</b>, "
        "<b>filter</b>, <b>will-change</b>, or <b>perspective</b> "
        "MUST use createPortal(\u2026, document.body).",
        st, accent=BURNT
    )

    story.append(Paragraph("High-Contrast Mobile UI Rules", st["h2"]))
    story.append(kv_table([
        ("Hamburger button",
         "<b>bg-paper border border-ink/20 rounded-full shadow-md p-3</b> \u2014 "
         "solid pill ensures visibility against dark photographic hero backgrounds"),
        ("Overlay background",
         "<b>bg-paper (#F5F0E8)</b> + inline style <b>backgroundColor</b> fallback \u2014 "
         "dual approach guarantees solid background independent of Tailwind JIT"),
        ("Scroll lock",
         "<b>document.body.style.overflow = 'hidden'</b> on open, "
         "<b>'unset'</b> on close \u2014 useEffect cleanup reverts on unmount"),
        ("Portal SSR guard",
         "<b>const [mounted, setMounted] = useState(false)</b> + "
         "<b>useEffect(() =&gt; { setMounted(true); }, [])</b> \u2014 "
         "portal only renders after hydration; document.body is unavailable on server"),
    ], st))

    story.append(PageBreak())

    # ── 10. Deployment ────────────────────────────────────────────────────────
    story += section_header("10", "Deployment Topology", st,
                             "STATUS: PRODUCTION ON VERCEL")
    story.append(phase_rule())

    story.append(data_table(
        ["Service", "Platform", "Configuration"],
        [
            ["Web App",
             "Vercel Pro",
             "Auto-deploy on main branch push. "
             "postinstall: 'prisma generate' regenerates Prisma "
             "client with correct Amazon Linux 2023 binary."],
            ["Database",
             "Supabase PostgreSQL",
             "DATABASE_URL: PgBouncer port 6543 (runtime queries). "
             "DIRECT_URL: port 5432 (Prisma migrations + db push). "
             "Both required in .env.local."],
            ["Auth",
             "Clerk v6",
             "Modal sign-in \u2014 no dedicated auth pages. "
             "Conditional ClerkProvider (skipped if key absent)."],
            ["Rate Limiting",
             "Upstash Redis",
             "REST API \u2014 stateless, no persistent connection. "
             "@upstash/ratelimit slidingWindow(5, '1 h')."],
            ["AI",
             "Anthropic API",
             "claude-sonnet-4-6, server-side only. "
             "ANTHROPIC_API_KEY never transmitted to client."],
            ["Maps",
             "Google Cloud",
             "Two keys: NEXT_PUBLIC_ (referrer-restricted, browser) + "
             "MAPS_SERVER_KEY (Places API only, no referrer, server)."],
            ["Cron",
             "Vercel Cron",
             "vercel.json: '0 0 * * *' \u2014 "
             "daily PlaceCache GC at midnight UTC."],
            ["Affiliate",
             "Booking.com",
             "AID 4013143. No SDK \u2014 URL-based. "
             "Zero infrastructure cost."],
        ],
        st,
        col_widths=[30*mm, 40*mm, BODY_W - 70*mm]
    ))

    story.append(Paragraph("Environment Variables", st["h2"]))
    env_rows = [
        ["Variable", "Used In", "Restriction"],
        ["ANTHROPIC_API_KEY",
         "POST /api/itinerary",
         "Server only \u2014 never in NEXT_PUBLIC_"],
        ["NEXT_PUBLIC_GOOGLE_MAPS_API_KEY",
         "Browser \u2014 Maps JS, Autocomplete",
         "HTTP referrer restricted: Vercel + localhost"],
        ["MAPS_SERVER_KEY",
         "route.ts enrichment, getPlacePhoto.ts",
         "Places API only; no referrer restriction"],
        ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
         "ClerkProvider in layout.tsx",
         "Public (safe in browser)"],
        ["CLERK_SECRET_KEY",
         "Clerk middleware + auth()",
         "Server only"],
        ["DATABASE_URL",
         "Prisma runtime queries",
         "PgBouncer port 6543"],
        ["DIRECT_URL",
         "Prisma migrations / db push",
         "Direct port 5432"],
        ["ADMIN_USER_ID",
         "/admin/metrics auth gate",
         "Server only; must be .trim()\u2019d"],
        ["CRON_SECRET",
         "/api/cron/cleanup bearer check",
         "Server only; generate with openssl rand -hex 32"],
        ["UPSTASH_REDIS_REST_URL",
         "ratelimit.ts \u2014 Upstash client",
         "Server only"],
        ["UPSTASH_REDIS_REST_TOKEN",
         "ratelimit.ts \u2014 Upstash client",
         "Server only"],
    ]
    story.append(data_table(env_rows[0], env_rows[1:], st,
                             col_widths=[70*mm, 63*mm, 34*mm]))

    story += callout(
        "! PRISMA DEPLOYMENT NOTE",
        "<b>package.json</b> includes <b>postinstall: 'prisma generate'</b> so "
        "Vercel regenerates the Prisma client with the correct "
        "Amazon Linux 2023 binary after npm install. "
        "Do NOT pin <b>binaryTargets</b> in schema.prisma \u2014 "
        "Prisma auto-detects the correct platform binary. "
        "Pinning to <b>rhel-openssl-1.0.x</b> will break on Vercel "
        "(Amazon Linux 2023 uses OpenSSL 3.x).",
        st, accent=BURNT
    )

    story.append(PageBreak())

    # ── 11. Phase Audit ─────────────────────────────────────────────────────
    story += section_header("11", "Phase Completion Audit", st)
    story.append(phase_rule())

    roadmap = [
        ["Phase", "Scope", "Status"],
        ["1 \u2014 Core Engine",
         "Next.js + Claude + Google Maps baseline",
         status_p("[COMPLETE]", st)],
        ["2 \u2014 Concierge UX",
         "7-field form, split-screen, enrichment, Haversine transit",
         status_p("[COMPLETE]", st)],
        ["3 \u2014 Ultra-Luxury UI",
         "Tabbed nav, cost badges, transit connectors, day-centric markers",
         status_p("[COMPLETE]", st)],
        ["4 \u2014 Auth",
         "Clerk v6, conditional ClerkProvider, NavbarAuth, custom 404",
         status_p("[COMPLETE]", st)],
        ["5 \u2014 Persistence",
         "Prisma + Supabase, saveTrip, /trips, /trips/[id], IDOR enforcement",
         status_p("[COMPLETE]", st)],
        ["6 \u2014 PWA & Sharing",
         "@serwist/next, /shared/[id] OG, ShareButton, PDF export",
         status_p("[COMPLETE]", st)],
        ["7 \u2014 Timeline Refactor",
         "timeline: TimelineItem[], normalizeDayPlan() shim",
         status_p("[COMPLETE]", st)],
        ["8 \u2014 Margin Protection",
         "PlaceCache, Haversine, CostLog, /admin/metrics, Cron, Zod, HTTP headers",
         status_p("[COMPLETE]", st)],
        ["9 \u2014 Affiliate",
         "Booking.com AID 4013143, StayCard, createAffiliateUrl(), "
         "accommodation branching",
         status_p("[COMPLETE]", st)],
        ["10 \u2014 UX & Polish",
         "GenerationLoader, Sonner toasts, UnauthenticatedState, "
         "EmptyTripsState, MobileMenu portal fix",
         status_p("[COMPLETE]", st)],
        ["11 \u2014 Mobile & Resilience",
         "useOfflineTrips (seek_wander_archive), /api/trips, "
         "Upstash rate limiting, AI JSON self-healing, dynamic OG metadata",
         status_p("[COMPLETE]", st)],
        ["12 \u2014 Stripe Paywall",
         "$4.99 / generation after 1 free \u2014 Stripe Checkout, usage tracking",
         status_p("[NEXT]", st)],
    ]
    story.append(data_table(roadmap[0], roadmap[1:], st,
                             col_widths=[40*mm, 115*mm, 12*mm]))

    doc.build(story)
    print(f"TDD written -> {path}")
    return path


# ── Run ────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    prs_path = build_prs()
    tdd_path = build_tdd()

    print()
    print("Done.")
    print(f"  PRS -> {prs_path}")
    print(f"  TDD -> {tdd_path}")
