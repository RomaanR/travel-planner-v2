"""
Seek Wander — Legal & Compliance Architecture PDF Generator
ZenithAI Data Room — "The Shield" Folder
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether
)
from reportlab.platypus.flowables import Flowable
import os

# ── Palette ────────────────────────────────────────────────────────────────────
NAVY        = colors.HexColor("#0D1B2A")
NAVY_MID    = colors.HexColor("#1A2E44")
GOLD        = colors.HexColor("#C9A84C")
GOLD_LIGHT  = colors.HexColor("#F0DFA0")
SLATE       = colors.HexColor("#4A5568")
SLATE_LIGHT = colors.HexColor("#718096")
GREEN       = colors.HexColor("#1A7A4A")
GREEN_BG    = colors.HexColor("#E6F4ED")
AMBER       = colors.HexColor("#B45309")
AMBER_BG    = colors.HexColor("#FEF3C7")
AMBER_PALE  = colors.HexColor("#FFFDF5")
RED         = colors.HexColor("#B91C1C")
BLUE_INFO   = colors.HexColor("#1D4ED8")
BLUE_BG     = colors.HexColor("#EFF6FF")
BLUE_PALE   = colors.HexColor("#F5F9FF")
OFF_WHITE   = colors.HexColor("#F8F6F1")
LIGHT_RULE  = colors.HexColor("#E2E0D8")
WHITE       = colors.white
BLACK       = colors.HexColor("#0A0A0A")

PAGE_W, PAGE_H = A4
MARGIN_L  = 22 * mm
MARGIN_R  = 22 * mm
MARGIN_T  = 28 * mm
MARGIN_B  = 24 * mm
CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R   # = 166 mm exactly

OUTPUT = r"D:\travel-plannner-v2\docs\Seek_Wander_Legal_Compliance.pdf"

# ── Paragraph styles ──────────────────────────────────────────────────────────
def _ps(name, **kw):
    return ParagraphStyle(name, **kw)

COVER_TITLE = _ps("cover_title", fontName="Helvetica-Bold",  fontSize=28, leading=36, textColor=WHITE,       alignment=TA_CENTER, spaceAfter=6)
COVER_SUB   = _ps("cover_sub",   fontName="Helvetica",       fontSize=13, leading=18, textColor=GOLD,        alignment=TA_CENTER, spaceAfter=4)
COVER_META  = _ps("cover_meta",  fontName="Helvetica",       fontSize=9,  leading=14, textColor=colors.HexColor("#B0BEC5"), alignment=TA_CENTER)
COVER_CONF  = _ps("cover_conf",  fontName="Helvetica-Bold",  fontSize=9,  leading=12, textColor=GOLD,        alignment=TA_CENTER, spaceBefore=6)
H3          = _ps("h3",          fontName="Helvetica-Bold",  fontSize=10, leading=15, textColor=SLATE,       spaceBefore=10, spaceAfter=4)
BODY        = _ps("body",        fontName="Helvetica",       fontSize=9.5,leading=15, textColor=BLACK,       spaceAfter=6, alignment=TA_JUSTIFY)
BODY_SM     = _ps("body_sm",     fontName="Helvetica",       fontSize=8.5,leading=13, textColor=SLATE,       spaceAfter=4)
BULLET      = _ps("bullet",      fontName="Helvetica",       fontSize=9.5,leading=15, textColor=BLACK,       leftIndent=14, firstLineIndent=-10, spaceAfter=3)
TOC_ITEM    = _ps("toc_item",    fontName="Helvetica",       fontSize=10, leading=18, textColor=NAVY_MID,    leftIndent=10)
FOOTER_NOTE = _ps("footer_note", fontName="Helvetica-Oblique", fontSize=7.5, leading=11, textColor=SLATE_LIGHT, alignment=TA_CENTER, spaceBefore=8)

# Cell paragraph styles (used inside table cells — no extra spacing)
_CH  = _ps("ch",  fontName="Helvetica-Bold",    fontSize=8,   leading=11, textColor=NAVY)      # column header
_CB  = _ps("cb",  fontName="Helvetica-Bold",    fontSize=8,   leading=11, textColor=BLACK)     # cell bold
_CN  = _ps("cn",  fontName="Helvetica",         fontSize=8,   leading=11, textColor=BLACK)     # cell normal
_CSM = _ps("csm", fontName="Helvetica",         fontSize=7.5, leading=10.5, textColor=BLACK)   # cell small
_CG  = _ps("cg",  fontName="Helvetica-Bold",    fontSize=8,   leading=11, textColor=GREEN)     # cell green
_CA  = _ps("ca",  fontName="Helvetica-Bold",    fontSize=8,   leading=11, textColor=AMBER)     # cell amber
_CBI = _ps("cbi", fontName="Helvetica-Bold",    fontSize=8,   leading=11, textColor=BLUE_INFO) # cell blue
_CR  = _ps("cr",  fontName="Helvetica-Bold",    fontSize=8,   leading=11, textColor=RED)       # cell red

def h(text):    return Paragraph(text, _CH)
def cn(text):   return Paragraph(text, _CN)
def cb(text):   return Paragraph(text, _CB)
def csm(text):  return Paragraph(text, _CSM)
def cg(text):   return Paragraph(text, _CG)
def ca(text):   return Paragraph(text, _CA)
def cbi(text):  return Paragraph(text, _CBI)
def cr(text):   return Paragraph(text, _CR)


# ── Custom Flowables ──────────────────────────────────────────────────────────

class GoldRule(Flowable):
    def draw(self):
        self.canv.setStrokeColor(GOLD)
        self.canv.setLineWidth(1.5)
        self.canv.line(0, 0, CONTENT_W, 0)
    def wrap(self, aW, aH):
        return (CONTENT_W, 5)


class LightRule(Flowable):
    def draw(self):
        self.canv.setStrokeColor(LIGHT_RULE)
        self.canv.setLineWidth(0.5)
        self.canv.line(0, 0, CONTENT_W, 0)
    def wrap(self, aW, aH):
        return (CONTENT_W, 4)


class SectionBadge(Flowable):
    """Navy band with gold number and white title."""
    def __init__(self, number, title, height=26):
        super().__init__()
        self.number = number
        self.title  = title
        self.height = height

    def draw(self):
        c = self.canv
        w = CONTENT_W
        c.setFillColor(NAVY);     c.rect(0, 0, w, self.height, fill=1, stroke=0)
        c.setFillColor(GOLD);     c.rect(0, 0, 4, self.height, fill=1, stroke=0)
        c.setFillColor(GOLD);     c.setFont("Helvetica-Bold", 10); c.drawString(10, 8, self.number)
        c.setFillColor(WHITE);    c.setFont("Helvetica-Bold", 11); c.drawString(36, 8, self.title.upper())

    def wrap(self, aW, aH):
        return (CONTENT_W, self.height)


class SubsectionHeader(Flowable):
    """Bold navy text with gold underline rule."""
    def __init__(self, title):
        super().__init__()
        self.title = title

    def draw(self):
        c = self.canv
        c.setFillColor(NAVY_MID); c.setFont("Helvetica-Bold", 10)
        c.drawString(0, 6, self.title)
        c.setStrokeColor(GOLD);   c.setLineWidth(1); c.line(0, 2, CONTENT_W, 2)

    def wrap(self, aW, aH):
        return (CONTENT_W, 20)


class QuoteBox(Flowable):
    """Off-white box with navy left border — for mandatory clauses and statements."""
    def __init__(self, text):
        super().__init__()
        self._text = text
        self._inner_w = CONTENT_W - 22   # left border(3) + left pad(10) + right pad(9)
        self._style = _ps("qb", fontName="Helvetica-Oblique", fontSize=9, leading=14,
                           textColor=SLATE)
        self._para  = None
        self._h     = 0

    def _build(self):
        if self._para is None:
            self._para = Paragraph(self._text, self._style)

    def wrap(self, aW, aH):
        self._build()
        _, ph = self._para.wrap(self._inner_w, 9999)
        self._h = ph + 16
        return (CONTENT_W, self._h)

    def draw(self):
        self._build()
        c = self.canv
        c.setFillColor(OFF_WHITE); c.setStrokeColor(LIGHT_RULE); c.setLineWidth(0.5)
        c.rect(0, 0, CONTENT_W, self._h, fill=1, stroke=1)
        c.setFillColor(NAVY); c.rect(0, 0, 3, self._h, fill=1, stroke=0)
        self._para.drawOn(c, 13, 8)


class PlaceholderBox(Flowable):
    """Amber warning box with wrapped text — for items requiring legal completion."""
    def __init__(self, text):
        super().__init__()
        self._label = "PLACEHOLDER:"
        self._text  = text
        self._label_w = 72          # approx width of "PLACEHOLDER:" at 8pt bold
        self._inner_w = CONTENT_W - self._label_w - 20
        self._style = _ps("ph_inner", fontName="Helvetica-Oblique", fontSize=8,
                          leading=11, textColor=colors.HexColor("#92400E"))
        self._para  = None
        self._h     = 0

    def _build(self):
        if self._para is None:
            self._para = Paragraph(self._text, self._style)

    def wrap(self, aW, aH):
        self._build()
        _, ph = self._para.wrap(self._inner_w, 9999)
        self._h = max(20, ph + 12)
        return (CONTENT_W, self._h)

    def draw(self):
        self._build()
        c = self.canv
        c.setFillColor(colors.HexColor("#FFFBEB"))
        c.setStrokeColor(AMBER); c.setLineWidth(0.75)
        c.rect(0, 0, CONTENT_W, self._h, fill=1, stroke=1)
        c.setFillColor(AMBER); c.setFont("Helvetica-Bold", 8)
        c.drawString(7, self._h - 13, "\u26a0 " + self._label)
        # text paragraph: vertically centred
        text_x = self._label_w + 10
        text_y = (self._h - self._para.height) / 2 if hasattr(self._para, 'height') else 6
        self._para.drawOn(c, text_x, 6)


# ── Canvas callbacks ──────────────────────────────────────────────────────────

def on_cover(canv, doc):
    W, H = A4
    canv.setFillColor(NAVY);      canv.rect(0, 0, W, H, fill=1, stroke=0)
    canv.setFillColor(GOLD);      canv.rect(0, 0, 6, H, fill=1, stroke=0)
    canv.setFillColor(NAVY_MID);  canv.rect(0, 0, W, 18*mm, fill=1, stroke=0)
    canv.setFillColor(GOLD);      canv.rect(0, 18*mm, W, 1.5, fill=1, stroke=0)
    # Confidential badge
    canv.setFillColor(RED);       canv.rect(W-68*mm, H-18*mm, 58*mm, 10*mm, fill=1, stroke=0)
    canv.setFillColor(WHITE);     canv.setFont("Helvetica-Bold", 8)
    canv.drawCentredString(W-39*mm, H-13*mm, "CONFIDENTIAL")
    # Watermark
    canv.setFillColor(colors.HexColor("#162030")); canv.setFont("Helvetica-Bold", 72)
    canv.saveState(); canv.translate(W/2, H/2); canv.rotate(35)
    canv.drawCentredString(0, 0, "ZENITH AI"); canv.restoreState()
    # Footer
    canv.setFillColor(SLATE_LIGHT); canv.setFont("Helvetica", 7.5)
    canv.drawCentredString(W/2, 10*mm, "ZenithAI — Data Room — Legal & Compliance Architecture — March 2026")


def on_page(canv, doc):
    W, H = A4
    canv.saveState()
    canv.setStrokeColor(GOLD); canv.setLineWidth(1)
    canv.line(MARGIN_L, H-14*mm, W-MARGIN_R, H-14*mm)
    canv.setFillColor(NAVY);  canv.setFont("Helvetica-Bold", 7.5)
    canv.drawString(MARGIN_L, H-11*mm, "SEEK WANDER — LEGAL & COMPLIANCE ARCHITECTURE")
    canv.setFillColor(GOLD);  canv.setFont("Helvetica-Bold", 7.5)
    canv.drawRightString(W-MARGIN_R, H-11*mm, "ZENITHAI DATA ROOM — CONFIDENTIAL")
    canv.setStrokeColor(LIGHT_RULE); canv.setLineWidth(0.5)
    canv.line(MARGIN_L, 13*mm, W-MARGIN_R, 13*mm)
    canv.setFillColor(SLATE_LIGHT); canv.setFont("Helvetica", 7)
    canv.drawString(MARGIN_L, 9*mm, "For M&A Due Diligence & Affiliate Programme Review Only. Not for public distribution.")
    canv.setFillColor(NAVY); canv.setFont("Helvetica-Bold", 7.5)
    canv.drawRightString(W-MARGIN_R, 9*mm, f"Page {doc.page}")
    canv.restoreState()


# ── Table factory ─────────────────────────────────────────────────────────────
# All data cells MUST be Paragraph objects (not plain strings) for reliable
# word-wrapping. Use the h/cn/cb/cg/ca/cbi/cr helpers defined above.

def make_table(rows, col_widths, extra_style=None):
    """Build a styled Table. rows[0] = header row of Paragraph objects."""
    # Validate total width
    total = sum(col_widths)
    assert abs(total - CONTENT_W) < 0.5, \
        f"Column widths sum to {total:.1f} pt but CONTENT_W={CONTENT_W:.1f} pt"

    base_style = [
        # Header row
        ("BACKGROUND",    (0, 0), (-1, 0),  GOLD_LIGHT),
        ("LINEABOVE",     (0, 0), (-1, 0),  1.0, GOLD),
        ("LINEBELOW",     (0, 0), (-1, 0),  0.5, NAVY_MID),
        # Body rows
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [WHITE, OFF_WHITE]),
        # All cells
        ("GRID",          (0, 0), (-1, -1), 0.4, LIGHT_RULE),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    if extra_style:
        base_style.extend(extra_style)

    t = Table(rows, colWidths=col_widths, repeatRows=1,
              hAlign="LEFT", splitByRow=True)
    t.setStyle(TableStyle(base_style))
    return t


# ── Document builder ──────────────────────────────────────────────────────────

def build_doc():
    doc = SimpleDocTemplate(
        OUTPUT, pagesize=A4,
        leftMargin=MARGIN_L, rightMargin=MARGIN_R,
        topMargin=MARGIN_T,  bottomMargin=MARGIN_B,
        title="Seek Wander — Legal & Compliance Architecture",
        author="ZenithAI",
        subject="Data Room — The Shield",
    )
    story = []

    # ── Cover page ────────────────────────────────────────────────────────────
    story += [
        Spacer(1, 48*mm),
        Paragraph("SEEK WANDER", COVER_TITLE),
        Spacer(1, 3*mm),
        Paragraph("Legal &amp; Compliance Architecture", COVER_SUB),
        Spacer(1, 2*mm),
        Paragraph("ZenithAI Corporate Data Room &mdash; &ldquo;The Shield&rdquo; Folder", COVER_META),
        Spacer(1, 18*mm),
        Paragraph("CONFIDENTIAL &mdash; FOR M&amp;A DUE DILIGENCE &amp; AFFILIATE PROGRAMME REVIEW ONLY", COVER_CONF),
        Spacer(1, 6*mm),
        Paragraph("Document Version 1.0 &middot; March 2026 &middot; Prepared by ZenithAI Legal &amp; Compliance Function", COVER_META),
        PageBreak(),
    ]

    # ── Purpose & ToC ─────────────────────────────────────────────────────────
    story += [
        SectionBadge("", "PURPOSE OF THIS DOCUMENT"),
        Spacer(1, 4*mm),
        QuoteBox(
            "This document constitutes the definitive legal and compliance summary for Seek Wander, "
            "a luxury AI travel concierge product developed and operated by ZenithAI. It is prepared for "
            "review by M&A counsel, prospective acquirers, and affiliate programme compliance teams "
            "(including Booking.com Partner Hub and Viator Affiliate Programme). It consolidates the "
            "product&rsquo;s corporate ownership structure, Terms of Service framework, privacy and data "
            "handling posture, FTC disclosure strategy, and third-party vendor Acceptable Use Policy "
            "compliance into a single authoritative reference."
        ),
        Spacer(1, 4*mm),
        SubsectionHeader("TABLE OF CONTENTS"),
        Spacer(1, 3*mm),
    ]
    for item in [
        "1. &nbsp; Corporate Entity &amp; Intellectual Property Ownership",
        "2. &nbsp; Terms of Service — Core Clauses",
        "3. &nbsp; Privacy &amp; Cookie Policy — Data Handling Architecture",
        "4. &nbsp; FTC Affiliate Disclosure Strategy",
        "5. &nbsp; Vendor Acceptable Use Policy Compliance",
        "6. &nbsp; Compliance Certification Matrix",
    ]:
        story.append(Paragraph(item, TOC_ITEM))
    story.append(Spacer(1, 6*mm))

    # ══════════════════════════════════════════════════════════════════════════
    # §1 CORPORATE ENTITY & IP
    # ══════════════════════════════════════════════════════════════════════════
    story += [
        SectionBadge("01", "CORPORATE ENTITY & INTELLECTUAL PROPERTY OWNERSHIP"),
        Spacer(1, 4*mm),
        SubsectionHeader("1.1 Entity Profile"),
        Spacer(1, 2*mm),
    ]

    # 2-col: 62 + 104 = 166 mm
    W1, W2 = 62*mm, 104*mm
    entity_rows = [
        [h("Field"), h("Detail")],
        [cn("Parent Entity"),            cn("ZenithAI")],
        [cn("Product Name"),             cn("Seek Wander")],
        [cn("Product Tagline"),          cn("Curated Luxury Journeys")],
        [cn("Entity Type"),              ca("[ PLACEHOLDER — e.g., LLC / C-Corp ]")],
        [cn("State of Incorporation"),   ca("[ PLACEHOLDER — e.g., Delaware, USA ]")],
        [cn("Date of Inception"),        ca("[ PLACEHOLDER — e.g., Q4 2025 ]")],
        [cn("Registered Agent"),         ca("[ PLACEHOLDER ]")],
        [cn("Primary Business Address"), ca("[ PLACEHOLDER ]")],
        [cn("EIN / Tax ID"),             ca("[ PLACEHOLDER ]")],
    ]
    story += [make_table(entity_rows, [W1, W2]), Spacer(1, 4*mm)]

    story += [
        SubsectionHeader("1.2 Parent-Product Relationship"),
        Spacer(1, 2*mm),
        Paragraph(
            "Seek Wander is a wholly-owned commercial product of <b>ZenithAI</b>, the parent operating entity. "
            "The product operates under the ZenithAI corporate umbrella and does not constitute a separate legal "
            "entity. All contractual relationships with third-party vendors, affiliate networks, and payment "
            "processors are entered into by ZenithAI on behalf of the Seek Wander product.", BODY),
        Paragraph(
            "For the avoidance of doubt: Seek Wander is a <b>product brand</b>, not a legal entity. All "
            "liabilities, obligations, and rights vest in <b>ZenithAI</b>. Any future corporate restructuring "
            "would require formal assignment agreements for all third-party contracts and IP listed herein.", BODY),
        Spacer(1, 3*mm),
        SubsectionHeader("1.3 Intellectual Property Ownership"),
        Spacer(1, 2*mm),
        Paragraph("<b>1.3.1 Proprietary Codebase</b>", H3),
    ]

    # 3-col: 44 + 80 + 42 = 166 mm
    A, B, C = 44*mm, 80*mm, 42*mm
    codebase_rows = [
        [h("Asset"), h("Description"), h("Ownership")],
        [cn("Application Source Code"),
         cn("Next.js 14 App Router TypeScript codebase — all routes, components, hooks, server actions, and API handlers"),
         cg("ZenithAI — All Rights Reserved")],
        [cn("AI Prompt Engineering"),
         cn("buildPrompt() function, SYSTEM_PROMPT injection defence constant, and all Anthropic message construction logic"),
         cg("ZenithAI — Trade Secret")],
        [cn("Data Pipeline Logic"),
         cn("enrichPlace() PlaceCache-first enrichment, Haversine transit, parseOpenNow() algorithm, normalizeDayPlan() backward-compat shim"),
         cg("ZenithAI — All Rights Reserved")],
        [cn("Cost Observability Layer"),
         cn("GenerationMeta assembly, CostLog schema, /admin/metrics BI dashboard"),
         cg("ZenithAI — All Rights Reserved")],
        [cn("PWA Infrastructure"),
         cn("Serwist service worker (sw.ts), offline caching strategy, manifest.ts"),
         cg("ZenithAI — All Rights Reserved")],
        [cn("Database Schema"),
         cn("Prisma schema: Trip, PlaceCache, CostLog models (Supabase/PostgreSQL)"),
         cg("ZenithAI — All Rights Reserved")],
    ]
    story += [make_table(codebase_rows, [A, B, C]), Spacer(1, 3*mm)]

    story += [
        Paragraph("<b>1.3.2 Automated Workflow Systems</b>", H3),
        Paragraph(
            "ZenithAI owns all proprietary automation workflows, including: n8n content automation pipelines, "
            "Vercel Cron Jobs (scheduled database garbage-collection worker /api/cron/cleanup and future "
            "operational jobs), and automated email onboarding and re-engagement sequences.", BODY),
        Paragraph("<b>1.3.3 Brand &amp; UI/UX Design Assets</b>", H3),
    ]
    for item in [
        "The <b>Seek Wander</b> wordmark and product name.",
        "The <b>&ldquo;Curated Luxury Journeys&rdquo;</b> tagline.",
        "Complete design system: colour palette, typographic system (Cormorant Garamond / DM Sans), component library, and all UI/UX compositions.",
        "All editorial copy, tone-of-voice guidelines, and brand positioning frameworks.",
    ]:
        story.append(Paragraph(f"&bull;&nbsp; {item}", BULLET))
    story.append(Spacer(1, 3*mm))

    story.append(Paragraph("<b>1.3.4 Third-Party IP — Usage Rights Only</b>", H3))
    # 3-col: 62 + 50 + 54 = 166 mm
    P1, P2, P3 = 62*mm, 50*mm, 54*mm
    tp_rows = [
        [h("Asset"), h("Owner"), h("Licence Basis")],
        [cn("Claude claude-sonnet-4-6 (Anthropic API)"), cn("Anthropic, PBC"),                     cn("API Terms of Service — usage licence")],
        [cn("Google Maps JavaScript API"),               cn("Google LLC"),                          cn("Google Maps Platform Terms of Service")],
        [cn("Google Places API"),                        cn("Google LLC"),                          cn("Google Maps Platform Terms of Service")],
        [cn("Clerk Authentication SDK"),                 cn("Clerk, Inc."),                         cn("SaaS subscription licence")],
        [cn("Supabase (PostgreSQL infrastructure)"),     cn("Supabase Inc."),                       cn("SaaS subscription licence")],
        [cn("Vercel (deployment infrastructure)"),       cn("Vercel Inc."),                         cn("SaaS subscription licence")],
        [cn("Cormorant Garamond typeface"),              cn("Christian Thalmann (Google Fonts)"),   cn("SIL Open Font Licence 1.1")],
        [cn("DM Sans typeface"),                         cn("Colophon Foundry (Google Fonts)"),     cn("SIL Open Font Licence 1.1")],
    ]
    story += [
        make_table(tp_rows, [P1, P2, P3]),
        Spacer(1, 2*mm),
        Paragraph("<i>Note: No GPL-licensed code is incorporated into the production application. "
                  "A complete Software Bill of Materials (SBOM) is available upon request during due diligence.</i>", BODY_SM),
        PageBreak(),
    ]

    # ══════════════════════════════════════════════════════════════════════════
    # §2 TERMS OF SERVICE
    # ══════════════════════════════════════════════════════════════════════════
    story += [
        SectionBadge("02", "TERMS OF SERVICE — CORE CLAUSES"),
        Spacer(1, 3*mm),
        Paragraph(
            "The following section defines the mandatory clause framework for the Seek Wander Terms of Service. "
            "A complete, attorney-reviewed ToS document is maintained separately and governs the live product. "
            "This section serves as a compliance summary for Data Room review.", BODY),
        Spacer(1, 3*mm),
        SubsectionHeader("2.1 AI Output Disclaimer"),
        Spacer(1, 2*mm),
        Paragraph("<b>Clause Intent:</b> To disclaim liability arising from the inherent limitations of large "
                  "language model output in a real-world travel context.", BODY),
        QuoteBox(
            "<b>Mandatory Language:</b> Seek Wander uses advanced artificial intelligence to generate personalised "
            "travel itineraries. While every effort is made to provide accurate, current, and relevant "
            "recommendations, <b>ZenithAI does not warrant or guarantee</b> the absolute accuracy, completeness, "
            "timeliness, or fitness for a particular purpose of any AI-generated content, including but not "
            "limited to: venue opening hours, admission prices, restaurant availability, safety conditions, "
            "visa requirements, and travel advisories. Users are solely responsible for independently verifying "
            "all itinerary details prior to travel."
        ),
        Paragraph("<b>Risk Coverage:</b> Pricing changes, venue closures, incorrect coordinates, outdated hours, "
                  "seasonal unavailability.", BODY_SM),
        Spacer(1, 3*mm),
        SubsectionHeader("2.2 Digital Media Product & Travel Agent Liability Waiver"),
        Spacer(1, 2*mm),
        Paragraph("<b>Clause Intent:</b> To establish unambiguously that Seek Wander is a digital software/media "
                  "product and not a licensed travel agency, tour operator, or booking intermediary. Protects "
                  "ZenithAI from liability for downstream travel disruptions.", BODY),
        QuoteBox(
            "<b>Mandatory Language:</b> Seek Wander is a <b>digital media and software product</b>. ZenithAI "
            "is not a licensed travel agency, tour operator, booking agent, or travel adviser under applicable "
            "law. We do not sell, book, or fulfil travel services directly. Outbound links to third-party "
            "booking platforms direct users to independent platforms governed by their own terms. ZenithAI "
            "expressly disclaims all liability for: cancelled or delayed flights; hotel service failures; tour "
            "operator cancellations; personal injury; force majeure events; visa or entry refusals; or any "
            "travel disruption arising from third-party platforms."
        ),
        Paragraph("<b>Affiliate Programme Relevance:</b> Required by Booking.com and Viator affiliate agreements, "
                  "which mandate publishers disclaim any direct booking or agency relationship.", BODY_SM),
        Spacer(1, 3*mm),
        SubsectionHeader("2.3 User Conduct & Prohibited Activities"),
        Spacer(1, 2*mm),
    ]
    for label, text in [
        ("<b>Automated Scraping:</b>",             "Use of bots, crawlers, or scripts to systematically extract Seek Wander content, itinerary output, or UI elements."),
        ("<b>Prompt Reverse Engineering:</b>",     "Any attempt to probe, extract, reconstruct, or reverse-engineer system prompts, model parameters, or AI instruction architecture."),
        ("<b>API Abuse:</b>",                      "Automated or high-frequency programmatic calls to any Seek Wander API endpoint outside normal interactive browser usage."),
        ("<b>Commercial Republication:</b>",       "Reproducing or commercially exploiting AI-generated itinerary output without express written consent from ZenithAI."),
        ("<b>Prompt Injection:</b>",               "Deliberately embedding adversarial instructions within user-controlled input fields to manipulate or extract system-level AI behaviour."),
        ("<b>Account Sharing / Credential Abuse:</b>", "Sharing authenticated accounts or circumventing usage limits through multiple account creation."),
    ]:
        story.append(Paragraph(f"&bull;&nbsp; {label} {text}", BULLET))
    story += [
        Spacer(1, 2*mm),
        Paragraph("<b>Enforcement:</b> Rate limiting (Upstash Redis slidingWindow — Phase 9), Clerk authentication, "
                  "Zod schema validation, and system-prompt injection defence at the Anthropic API layer.", BODY_SM),
        Spacer(1, 3*mm),
        PlaceholderBox("Section 2.4 — Governing Law & Dispute Resolution: State/jurisdiction, arbitration clause, class action waiver"),
        Spacer(1, 2*mm),
        PlaceholderBox("Section 2.5 — Limitation of Liability: Cap at fees paid in preceding 12 months, exclusion of consequential damages"),
        PageBreak(),
    ]

    # ══════════════════════════════════════════════════════════════════════════
    # §3 PRIVACY & DATA HANDLING
    # ══════════════════════════════════════════════════════════════════════════
    story += [
        SectionBadge("03", "PRIVACY & COOKIE POLICY — DATA HANDLING ARCHITECTURE"),
        Spacer(1, 3*mm),
        Paragraph("<b>Compliance Frameworks:</b> GDPR (EU) 2016/679 &middot; CCPA (California Consumer Privacy Act) &middot; UK GDPR", BODY),
        Spacer(1, 2*mm),
        Paragraph(
            "<b>Data Minimisation Principle:</b> Seek Wander is designed on a data minimisation by default "
            "architecture. We collect only the data strictly necessary to provide the service. We do not build "
            "advertising profiles, sell user data, or engage in behavioural tracking beyond what is disclosed "
            "in this document.", BODY),
        Spacer(1, 3*mm),
        SubsectionHeader("3.1 Data Categories & Processing Inventory"),
        Spacer(1, 2*mm),
    ]

    # 5-col: 34 + 46 + 28 + 30 + 28 = 166 mm
    D1, D2, D3, D4, D5 = 34*mm, 46*mm, 28*mm, 30*mm, 28*mm
    inv_rows = [
        [h("Data Category"), h("What Is Collected"), h("Processor"), h("Legal Basis\n(GDPR)"), h("In ZenithAI DB?")],
        [cn("Authentication Identity"), cn("Email, name, OAuth profile"),                              cn("Clerk, Inc."),         cn("Contract"),           cn("No — Clerk only")],
        [cn("Session Tokens"),          cn("JWT session cookies"),                                     cn("Clerk, Inc."),         cn("Contract"),           cn("No — Clerk only")],
        [cn("Trip Parameters"),         cn("Destination, dates, party, pace, budget, dietary, interests"), cn("Supabase (ZenithAI)"), cn("Contract"),       cn("Yes — Trip.itinerary\u200bData")],
        [cn("Generated Itinerary"),     cn("Full AI-generated JSON blob"),                             cn("Supabase (ZenithAI)"), cn("Contract"),           cn("Yes — Trip.itinerary\u200bData")],
        [cn("Place Cache"),             cn("Venue name, photo URL, rating, hours, price level"),       cn("Supabase (ZenithAI)"), cn("Legitimate Interest"),cn("Yes — PlaceCache (14d TTL)")],
        [cn("Cost Telemetry"),          cn("AI + Google API costs, cache hit rates"),                  cn("Supabase (ZenithAI)"), cn("Legitimate Interest"),cn("Yes — CostLog (no PII)")],
        [cn("Affiliate Click Events"),  cn("Outbound click destination, partner tracking cookie"),     cn("Booking.com / Viator"),cn("Consent"),            cn("No — partner only")],
        [cn("IP / Device Data"),        cn("Standard server logs"),                                    cn("Vercel Inc."),         cn("Legitimate Interest"),cn("No — Vercel edge only")],
    ]
    story += [make_table(inv_rows, [D1, D2, D3, D4, D5]), Spacer(1, 4*mm)]

    story += [
        SubsectionHeader("3.2 Authentication Data — Clerk v6"),
        Spacer(1, 2*mm),
        Paragraph(
            "All user identity management is delegated entirely to <b>Clerk, Inc.</b> Seek Wander stores only "
            "the opaque Clerk <b>userId string</b> as a foreign-key reference. No passwords, email addresses, "
            "OAuth tokens, or session credentials are stored in Seek Wander&rsquo;s database.", BODY),
    ]
    for item in ["SOC 2 Type II certified", "GDPR Data Processing Agreement available",
                 "CCPA compliant", "Data stored in US-East (configurable to EU)"]:
        story.append(Paragraph(f"&bull;&nbsp; {item}", BULLET))
    story += [
        Spacer(1, 2*mm),
        PlaceholderBox("Execute and retain a signed Clerk Data Processing Agreement (DPA) prior to any EU market launch or M&A transaction"),
        Spacer(1, 3*mm),
        SubsectionHeader("3.3 Third-Party AI Processing — Anthropic"),
        Spacer(1, 2*mm),
        Paragraph(
            "Trip parameters are transmitted to the <b>Anthropic API</b> (claude-sonnet-4-6) to generate "
            "itinerary content. The following confirms that <b>no PII is transmitted to Anthropic</b>:", BODY),
    ]

    # 3-col: 68 + 30 + 68 = 166 mm
    E1, E2, E3 = 68*mm, 30*mm, 68*mm
    anthropic_rows = [
        [h("Field Transmitted"), h("Contains PII?"), h("Notes")],
        [cn("Destination name"),     cg("No"),  cn("Public place name")],
        [cn("Travel dates"),         cg("No"),  cn("Date strings only — no user identity")],
        [cn("Travel party type"),    cg("No"),  cn("Enum: solo / couple / family / group")],
        [cn("Pace preference"),      cg("No"),  cn("Enum value")],
        [cn("Budget tier"),          cg("No"),  cn("Enum value")],
        [cn("Dietary preferences"),  cg("No"),  cn("Enum array")],
        [cn("Interests"),            cg("No"),  cn("Enum array")],
        [cn("User email address"),   cr("N/A — NOT transmitted"), cn("Never sent to Anthropic")],
        [cn("Clerk userId"),         cr("N/A — NOT transmitted"), cn("Never sent to Anthropic")],
        [cn("IP address"),           cr("N/A — NOT transmitted"), cn("Never sent to Anthropic")],
        [cn("Payment information"),  cr("N/A — NOT transmitted"), cn("Never sent to Anthropic")],
    ]
    story += [
        make_table(anthropic_rows, [E1, E2, E3]),
        Spacer(1, 2*mm),
        Paragraph(
            "<b>Note:</b> Per Anthropic&rsquo;s API usage terms, API inputs and outputs are not used to train "
            "Anthropic models by default (opt-out is the default for API customers). ZenithAI should retain a "
            "copy of the executed Anthropic API agreement confirming this position.", BODY_SM),
        Spacer(1, 3*mm),
        SubsectionHeader("3.4 Data Retention & Deletion"),
        Spacer(1, 2*mm),
    ]

    # 3-col: 46 + 44 + 76 = 166 mm
    F1, F2, F3 = 46*mm, 44*mm, 76*mm
    retention_rows = [
        [h("Data Type"), h("Retention Period"), h("Deletion Mechanism")],
        [cn("Trip records"),       cn("Indefinite (user-deletable)"),     cn("User account deletion \u2192 cascade delete")],
        [cn("PlaceCache"),         cn("14 days from last access"),         cn("Automated Vercel Cron (/api/cron/cleanup), daily 00:00 UTC")],
        [cn("CostLog"),            cn("24 months"),                       cn("Manual admin purge (Phase 9 tooling)")],
        [cn("Clerk user data"),    cn("Per Clerk retention policy"),      cn("Clerk dashboard / API deletion")],
        [cn("Vercel access logs"), cn("30 days"),                         cn("Vercel platform policy")],
    ]
    story += [make_table(retention_rows, [F1, F2, F3]), Spacer(1, 3*mm)]

    story += [
        SubsectionHeader("3.5 User Rights (GDPR Articles 15–22)"),
        Spacer(1, 2*mm),
    ]
    # 3-col: 52 + 34 + 80 = 166 mm
    G1, G2, G3 = 52*mm, 34*mm, 80*mm
    rights_rows = [
        [h("Right"), h("Legal Basis"), h("Mechanism")],
        [cn("Access (Art. 15)"),                        cn("GDPR Art. 15"), cn("Export of Trip records associated with Clerk userId")],
        [cn("Rectification (Art. 16)"),                 cn("GDPR Art. 16"), cn("Trip data correction via support request")],
        [cn("Erasure / Right to be Forgotten (Art. 17)"), cn("GDPR Art. 17"), cn("Account deletion \u2192 all Trip and CostLog rows with matching userId deleted")],
        [cn("Portability (Art. 20)"),                   cn("GDPR Art. 20"), cn("JSON export of saved itineraries")],
        [cn("Objection (Art. 21)"),                     cn("GDPR Art. 21"), cn("Opt-out of CostLog telemetry (unauthenticated mode)")],
    ]
    story += [
        make_table(rights_rows, [G1, G2, G3]),
        Spacer(1, 2*mm),
        PlaceholderBox("Privacy contact email — e.g. privacy@zenithai.com — must be published in the live Privacy Policy"),
        PageBreak(),
    ]

    # ══════════════════════════════════════════════════════════════════════════
    # §4 FTC AFFILIATE DISCLOSURE
    # ══════════════════════════════════════════════════════════════════════════
    story += [
        SectionBadge("04", "FTC AFFILIATE DISCLOSURE STRATEGY"),
        Spacer(1, 3*mm),
        Paragraph(
            "<b>Regulatory Basis:</b> FTC Endorsement Guides (16 CFR Part 255), updated 2023. The FTC requires "
            "that any material connection between a publisher and a commercial partner be clearly and "
            "conspicuously disclosed.", BODY),
        Spacer(1, 3*mm),
        SubsectionHeader("4.1 Applicability"),
        Spacer(1, 2*mm),
        Paragraph(
            "Seek Wander earns commissions when users click affiliate links to partner platforms and complete "
            "qualifying bookings. This constitutes a <b>material connection</b> between Seek Wander and its "
            "affiliate partners under FTC guidelines. Disclosure is legally mandatory.", BODY),
        Spacer(1, 3*mm),
        SubsectionHeader("4.2 Disclosure Standard — \"Clear and Conspicuous\""),
        Spacer(1, 2*mm),
    ]
    for item in [
        "<b>Prominent:</b> Not buried in fine print or hidden in a footer requiring extensive scrolling.",
        "<b>Understandable:</b> Written in plain language accessible to a general consumer.",
        "<b>Near the recommendation:</b> Placed in close proximity to the affiliated link — not solely on a separate policy page.",
        "<b>Present on every page</b> where affiliate links appear — a single sitewide footer disclosure is insufficient.",
    ]:
        story.append(Paragraph(f"&bull;&nbsp; {item}", BULLET))
    story += [
        Spacer(1, 3*mm),
        SubsectionHeader("4.3 Approved Disclosure Language"),
        Spacer(1, 2*mm),
        Paragraph("<b>Standard (footer / persistent):</b>", BODY),
        QuoteBox("&#34;Seek Wander is reader-supported. When you book through our luxury curation links, we may earn an affiliate commission at no additional cost to you.&#34;"),
        Spacer(1, 2*mm),
        Paragraph("<b>Enhanced (itinerary generation page / inline):</b>", BODY),
        QuoteBox("&#34;Our curated recommendations include partner links. If you book through them, Seek Wander may earn a commission &mdash; this never influences our editorial curation.&#34;"),
        Spacer(1, 2*mm),
        Paragraph("<b>Email / Social (condensed):</b>", BODY),
        QuoteBox("&#34;[Ad] [Affiliate] &mdash; Seek Wander earns a commission on qualifying bookings.&#34;"),
        Spacer(1, 3*mm),
        SubsectionHeader("4.4 UI Placement Requirements"),
        Spacer(1, 2*mm),
    ]

    # 4-col: 52 + 30 + 58 + 26 = 166 mm
    H1, H2, H3c, H4 = 52*mm, 30*mm, 58*mm, 26*mm
    placement_rows = [
        [h("Surface"),                              h("Required"),      h("Placement Specification"),                             h("Status")],
        [cn("Itinerary Generation (/itinerary)"),   cn("Yes — Mandatory"), cn("Persistent banner above first affiliate link"),     ca("PENDING")],
        [cn("Saved Trip Viewer (/trips/[id])"),     cn("Yes — Mandatory"), cn("Inline notice adjacent to booking CTA buttons"),    ca("PENDING")],
        [cn("Public Shared Itinerary (/shared/[id])"), cn("Yes — Mandatory"), cn("Above the fold — before any affiliate links"),  ca("PENDING")],
        [cn("Site Footer (all pages)"),             cn("Yes — Mandatory"), cn("Persistent text, min 12px, high contrast"),         ca("PENDING")],
        [cn("Email Newsletters"),                   cn("Yes — Mandatory"), cn("First paragraph of any email with affiliate links"),ca("PENDING")],
        [cn("Social Media Posts"),                  cn("Yes — Mandatory"), cn("#ad or #affiliate in first line of caption"),       ca("PENDING")],
    ]
    story += [
        make_table(placement_rows, [H1, H2, H3c, H4]),
        Spacer(1, 3*mm),
        SubsectionHeader("4.5 Editorial Independence Statement"),
        Spacer(1, 2*mm),
        QuoteBox(
            "ZenithAI affirms that affiliate commission arrangements do not influence the AI-generated "
            "itinerary content. The Anthropic model receives no information about affiliate relationships "
            "and cannot weight recommendations toward commercially advantageous venues. The buildPrompt() "
            "function and SYSTEM_PROMPT contain no affiliate-driven ranking instructions. This separation "
            "is a key compliance and credibility asset and should be highlighted to affiliate programme "
            "compliance reviewers."
        ),
        PageBreak(),
    ]

    # ══════════════════════════════════════════════════════════════════════════
    # §5 VENDOR AUP COMPLIANCE
    # ══════════════════════════════════════════════════════════════════════════
    story += [
        SectionBadge("05", "VENDOR ACCEPTABLE USE POLICY COMPLIANCE"),
        Spacer(1, 4*mm),
        SubsectionHeader("5.1 Anthropic Acceptable Use Policy"),
        Spacer(1, 2*mm),
        Paragraph("<b>Reference:</b> Anthropic Usage Policy (anthropic.com/legal/aup), current version.", BODY),
        Spacer(1, 2*mm),
        Paragraph("<b>5.1.1 Confirmed Compliant Use Cases</b>", H3),
    ]

    # 3-col: 80 + 34 + 52 = 166 mm
    I1, I2, I3 = 80*mm, 34*mm, 52*mm
    aup_rows = [
        [h("Use Case"), h("AUP Status"), h("Notes")],
        [cn("Luxury travel itinerary generation"),                    cg("PERMITTED"), cn("Creative content generation")],
        [cn("JSON-structured output generation"),                     cg("PERMITTED"), cn("Standard structured output use")],
        [cn("Personalised recommendations based on user preferences"),cg("PERMITTED"), cn("Non-sensitive personalisation")],
        [cn("System prompt injection defence (SYSTEM_PROMPT)"),       cg("PERMITTED"), cn("Standard responsible AI deployment")],
    ]
    story += [make_table(aup_rows, [I1, I2, I3]), Spacer(1, 3*mm)]

    story += [
        Paragraph("<b>5.1.2 Restricted Use Case Non-Violations</b>", H3),
        Paragraph(
            "ZenithAI affirms that Seek Wander does <b>not</b> use the Anthropic API for any of the "
            "following restricted categories:", BODY),
    ]

    # 3-col: 72 + 38 + 56 = 166 mm
    J1, J2, J3 = 72*mm, 38*mm, 56*mm
    restricted_rows = [
        [h("Restricted Category"), h("Status"), h("Evidence")],
        [cn("Medical diagnosis or clinical advice"),                         cg("NOT APPLICABLE"), cn("Travel domain only")],
        [cn("Legal advice or legal document generation"),                    cg("NOT APPLICABLE"), cn("Travel domain only")],
        [cn("Financial advice or investment recommendations"),               cg("NOT APPLICABLE"), cn("No financial content")],
        [cn("Automated high-stakes decisions without human oversight"),      cg("NOT APPLICABLE"), cn("Output is editorial; all bookings made independently by user on third-party platforms")],
        [cn("Surveillance, tracking, or profiling of individuals"),          cg("NOT APPLICABLE"), cn("No PII passed to API; no profiling use case")],
        [cn("Generation of deceptive content"),                              cg("NOT APPLICABLE"), cn("AI Output Disclaimer mandates independent verification")],
        [cn("Automated political influence or spam"),                        cg("NOT APPLICABLE"), cn("Travel content only")],
        [cn("Weapons, CBRN, or dangerous materials"),                        cg("NOT APPLICABLE"), cn("Not applicable")],
    ]
    story += [make_table(restricted_rows, [J1, J2, J3]), Spacer(1, 3*mm)]

    story.append(Paragraph("<b>5.1.3 Model Version &amp; Token Usage</b>", H3))
    # 2-col: 62 + 104 = 166 mm
    model_rows = [
        [h("Parameter"), h("Value")],
        [cn("Model"),                       cn("claude-sonnet-4-6")],
        [cn("Max Tokens Per Request"),       cn("8,192")],
        [cn("Input Pricing"),               cn("$3.00 / 1M tokens")],
        [cn("Output Pricing"),              cn("$15.00 / 1M tokens")],
        [cn("Average Cost Per Generation"), cn("~$0.08–$0.14 (logged in CostLog)")],
    ]
    story += [make_table(model_rows, [62*mm, 104*mm]), Spacer(1, 4*mm)]

    story += [
        SubsectionHeader("5.2 Google Maps Platform — Terms of Service Compliance"),
        Spacer(1, 2*mm),
        Paragraph(
            "<b>Reference:</b> Google Maps Platform Terms of Service, Section 3.2.3(a). Permits temporary "
            "performance caching of place data subject to: cache must be temporary; data must be kept "
            "current; data may not be used to build a competing database.", BODY),
        Spacer(1, 2*mm),
        Paragraph("<b>5.2.1 PlaceCache Implementation — Compliance Mapping</b>", H3),
    ]

    # 3-col: 46 + 88 + 32 = 166 mm
    K1, K2, K3 = 46*mm, 88*mm, 32*mm
    cache_rows = [
        [h("Google Requirement"), h("Seek Wander Implementation"), h("Compliance")],
        [cn("Temporary caching only"),
         cn("PlaceCache.updatedAt — 14-day rolling TTL enforced by automated Vercel Cron Job (/api/cron/cleanup) running daily at 00:00 UTC"),
         cg("COMPLIANT")],
        [cn("Data kept current"),
         cn("prisma.placeCache.deleteMany({ where: { updatedAt: { lt: fourteenDaysAgo } } }) — stale records purged automatically"),
         cg("COMPLIANT")],
        [cn("Not used as competing database"),
         cn("PlaceCache stores enrichment metadata for rendering itinerary cards only — not distributed, indexed, or exposed via any API"),
         cg("COMPLIANT")],
        [cn("No speculative pre-fetching"),
         cn("enrichPlace() is invoked only per user-initiated itinerary generation — zero background pre-fetching"),
         cg("COMPLIANT")],
    ]
    story += [make_table(cache_rows, [K1, K2, K3]), Spacer(1, 3*mm)]

    story.append(Paragraph("<b>5.2.2 API Key Architecture Compliance</b>", H3))
    # 4-col: 26 + 50 + 62 + 28 = 166 mm
    L1, L2, L3, L4 = 26*mm, 50*mm, 62*mm, 28*mm
    key_rows = [
        [h("Key Type"), h("Variable"), h("Restriction Applied"), h("Status")],
        [cn("Client-side"),
         cn("NEXT_PUBLIC_\nGOOGLE_MAPS_\nAPI_KEY"),
         cn("HTTP Referrer restricted to production Vercel domain + localhost:3000"),
         cg("COMPLIANT")],
        [cn("Server-side"),
         cn("MAPS_SERVER_KEY"),
         cn("API restriction: Places API only. Application restriction: None (server-to-server — no referrer header present)"),
         cg("COMPLIANT")],
    ]
    story += [
        make_table(key_rows, [L1, L2, L3, L4]),
        Spacer(1, 2*mm),
        Paragraph(
            "<b>Key Storage:</b> MAPS_SERVER_KEY is stored as a Vercel encrypted environment variable, "
            "never exposed to the browser or included in any client-side bundle.", BODY_SM),
        Spacer(1, 2*mm),
        PlaceholderBox("Confirm Google Maps attribution logo is not suppressed by custom CSS on any map view (QA required before launch)"),
        Spacer(1, 4*mm),
        SubsectionHeader("5.3 Other Vendor Compliance Positions"),
        Spacer(1, 2*mm),
    ]
    for vendor_name, points in [
        ("Clerk (Authentication)", [
            "Used exclusively for user authentication — no identity data replicated outside Clerk&rsquo;s managed infrastructure.",
            "Clerk v6 pinned in package.json — v7 is incompatible with Next.js 14.",
            "Modal sign-in mode — no dedicated redirect sign-in pages required, minimising attack surface.",
            "All routes are public by default — access control implemented at page/component level.",
        ]),
        ("Supabase (Database)", [
            "SOC 2 Type II certified, GDPR-compliant, EU data residency available.",
            "Data encrypted at rest (AES-256) and in transit (TLS 1.2+).",
            "No raw SQL executed — all queries via Prisma ORM with typed schema.",
            "Dual connection URL: PgBouncer (port 6543) for runtime; direct (port 5432) for Prisma migrations.",
        ]),
        ("Vercel (Infrastructure)", [
            "Processes HTTP request/response data for routing and edge serving.",
            "Environment variables encrypted at rest.",
            "No access to Supabase database, Anthropic API, or Clerk user data.",
            "Cron job scheduling for /api/cron/cleanup (vercel.json configuration).",
        ]),
    ]:
        story.append(Paragraph(f"<b>{vendor_name}</b>", H3))
        for p in points:
            story.append(Paragraph(f"&bull;&nbsp; {p}", BULLET))
        story.append(Spacer(1, 2*mm))
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════════════════════
    # §6 COMPLIANCE CERTIFICATION MATRIX
    # ══════════════════════════════════════════════════════════════════════════
    story += [
        SectionBadge("06", "COMPLIANCE CERTIFICATION MATRIX"),
        Spacer(1, 4*mm),
        SubsectionHeader("6.1 Current Compliance Status"),
        Spacer(1, 2*mm),
    ]

    # 4-col: 56 + 46 + 28 + 36 = 166 mm
    M1, M2, M3, M4 = 56*mm, 46*mm, 28*mm, 36*mm

    def status_row(area, standard, status, notes):
        if "LIVE" in status:
            s_cell = cg(status)
            bg = GREEN_BG
        elif "PENDING" in status:
            s_cell = ca(status)
            bg = AMBER_BG
        else:
            s_cell = cbi(status)
            bg = BLUE_BG
        return [cn(area), cn(standard), s_cell, cn(notes)]

    matrix_header = [h("Compliance Area"), h("Standard / Requirement"), h("Status"), h("Notes")]
    matrix_body = [
        status_row("Input Validation",              "Zod schema — all API POST bodies",               "LIVE",    "ItinerarySchema.safeParse() in route.ts"),
        status_row("Prompt Injection Defence",      "Anthropic system parameter isolation",           "LIVE",    "SYSTEM_PROMPT constant"),
        status_row("HTTP Security Headers",         "OWASP baseline headers",                         "LIVE",    "next.config.mjs headers()"),
        status_row("API Key Restriction",           "Google Maps Platform key split",                 "LIVE",    "Referrer + API restrictions applied"),
        status_row("Authentication",                "Clerk v6 (SOC2 certified)",                      "LIVE",    "All sessions managed by Clerk"),
        status_row("IDOR Prevention",               "Ownership check on all private routes",          "LIVE",    "trip.userId !== userId \u2192 notFound()"),
        status_row("Database Encryption",           "At rest + in transit",                           "LIVE",    "Supabase AES-256, TLS 1.2+"),
        status_row("PlaceCache TTL",                "14-day automated purge",                         "LIVE",    "Vercel Cron (/api/cron/cleanup)"),
        status_row("Admin Route Security",          "ADMIN_USER_ID env gating + neutral 404",         "LIVE",    "/admin/metrics"),
        status_row("Cron Job Security",             "CRON_SECRET Bearer token auth",                  "LIVE",    "/api/cron/cleanup"),
        status_row("FTC Disclosure",                "Affiliate disclosure in UI",                     "PENDING", "Required before affiliate launch"),
        status_row("Cookie Consent Banner",         "GDPR/CCPA consent management platform",         "PENDING", "Required before EU launch"),
        status_row("Rate Limiting",                 "Upstash Redis slidingWindow",                    "PENDING", "Phase 9 — pre-monetisation"),
        status_row("GDPR DPA — Clerk",              "Signed Data Processing Agreement",               "PENDING", "Required before EU market launch"),
        status_row("GDPR DPA — Supabase",           "Signed Data Processing Agreement",               "PENDING", "Required before EU market launch"),
        status_row("GDPR DPA — Anthropic",          "Signed Data Processing Agreement",               "PENDING", "Required before EU market launch"),
        status_row("ToS — Attorney Review",         "Complete Terms of Service document",             "PENDING", "Framework defined in this document"),
        status_row("Privacy Policy — Attorney Review", "Complete Privacy Policy document",            "PENDING", "Framework defined in this document"),
        status_row("Content Security Policy",       "CSP headers",                                    "DEFERRED","Would break Google Maps JS SDK + Clerk"),
        status_row("HSTS",                          "Strict-Transport-Security header",               "DEFERRED","Vercel enforces HTTPS at the edge"),
    ]

    # Row-level background colouring via extra_style
    extra_matrix = []
    for i, row in enumerate(matrix_body, start=1):
        status_text = row[2].text if hasattr(row[2], 'text') else ""
        # Infer from paragraph style name
        if row[2].style.name == "cg":
            extra_matrix.append(("BACKGROUND", (0, i), (-1, i), GREEN_BG if i % 2 == 0 else WHITE))
        elif row[2].style.name == "ca":
            extra_matrix.append(("BACKGROUND", (0, i), (-1, i), AMBER_BG if i % 2 == 0 else AMBER_PALE))
        elif row[2].style.name == "cbi":
            extra_matrix.append(("BACKGROUND", (0, i), (-1, i), BLUE_BG if i % 2 == 0 else BLUE_PALE))

    story += [
        make_table([matrix_header] + matrix_body, [M1, M2, M3, M4], extra_matrix),
        Spacer(1, 5*mm),
        SubsectionHeader("6.2 Pre-Monetisation Compliance Checklist"),
        Spacer(1, 2*mm),
        Paragraph(
            "The following items must be completed <b>before</b> enabling affiliate monetisation or "
            "processing any payments:", BODY),
        Spacer(1, 2*mm),
    ]

    checklist_items = [
        "Implement FTC affiliate disclosure on all itinerary-generating and trip-viewing pages",
        "Deploy cookie consent banner (GDPR/CCPA compliant CMP — e.g., OneTrust, Cookiebot)",
        "Implement rate limiting (Upstash Redis — 5 generations per user per hour)",
        "Execute attorney-reviewed Terms of Service and publish at permanent URL",
        "Execute attorney-reviewed Privacy &amp; Cookie Policy and publish at permanent URL",
        "Sign Clerk GDPR Data Processing Agreement",
        "Sign Supabase GDPR Data Processing Agreement",
        "Sign Anthropic API GDPR Data Processing Agreement",
        "Register with Booking.com Affiliate Programme and retain signed programme agreement",
        "Register with Viator Affiliate Programme and retain signed programme agreement",
        "Confirm Google Maps attribution logo is visible on all map views (QA sign-off)",
        "Establish privacy contact email (e.g., privacy@zenithai.com) and publish in Privacy Policy",
    ]
    # 4-col: 8 + 98 + 30 + 30 = 166 mm
    N1, N2, N3, N4 = 8*mm, 98*mm, 30*mm, 30*mm
    checklist_rows = [[h("#"), h("Action Item"), h("Owner"), h("Due Date")]]
    for i, item in enumerate(checklist_items, 1):
        checklist_rows.append([cn(str(i)), cn(item), ca("[ TBD ]"), ca("[ TBD ]")])
    story += [
        make_table(checklist_rows, [N1, N2, N3, N4]),
        Spacer(1, 6*mm),
        LightRule(),
        Spacer(1, 3*mm),
        Paragraph(
            "This document is prepared for Data Room purposes only. It does not constitute legal advice. "
            "ZenithAI should engage qualified legal counsel in the relevant jurisdiction(s) for review and "
            "formalisation of all agreements, policies, and compliance programmes referenced herein.",
            FOOTER_NOTE),
        Paragraph(
            "Document Classification: Confidential — ZenithAI Data Room &middot; Version 1.0 &middot; "
            "March 2026 &middot; Next Review: September 2026 or upon material product change",
            FOOTER_NOTE),
    ]

    # ── Build ─────────────────────────────────────────────────────────────────
    doc.build(story, onFirstPage=on_cover, onLaterPages=on_page)
    size = os.path.getsize(OUTPUT)
    print(f"PDF saved: {OUTPUT}")
    print(f"Size: {size:,} bytes ({size/1024:.1f} KB)")


if __name__ == "__main__":
    build_doc()
