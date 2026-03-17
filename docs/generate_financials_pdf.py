from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, KeepTogether
)
from reportlab.lib.colors import HexColor
import os

# ── Palette — Financial / Analytical ──────────────────────────────────────────
NAVY        = HexColor("#0B1F3A")
NAVY2       = HexColor("#132D50")
TEAL        = HexColor("#0E7C5E")
TEAL_LIGHT  = HexColor("#D1FAE5")
RED_DARK    = HexColor("#991B1B")
RED_LIGHT   = HexColor("#FEE2E2")
AMBER       = HexColor("#92400E")
AMBER_LIGHT = HexColor("#FEF3C7")
SLATE       = HexColor("#334155")
SLATE_L     = HexColor("#64748B")
PAPER       = HexColor("#F8F9FA")
RULE        = HexColor("#CBD5E1")
CODE_BG     = HexColor("#F1F5F9")
WHITE       = colors.white
BLACK       = HexColor("#0A0A0A")
GOLD        = HexColor("#B8860B")

PAGE_W, PAGE_H = A4
MARGIN   = 20 * mm
USABLE_W = PAGE_W - 2 * MARGIN
OUTPUT   = r"D:\travel-plannner-v2\docs\Seek_Wander_Financials_Unit_Economics.pdf"

doc = SimpleDocTemplate(
    OUTPUT, pagesize=A4,
    leftMargin=MARGIN, rightMargin=MARGIN,
    topMargin=MARGIN,  bottomMargin=MARGIN,
    title="Seek Wander — Financials & Unit Economics",
    author="ZenithAI Data Room",
    subject="Financial Architecture & Unit Economics",
)

base = getSampleStyleSheet()
def S(name, parent="Normal", **kw):
    return ParagraphStyle(name, parent=base[parent], **kw)

cov_pre    = S("cpre",  fontSize=8,  leading=12, textColor=TEAL,   fontName="Helvetica-Bold",    alignment=TA_LEFT, spaceAfter=4)
cov_title  = S("ctit",  fontSize=34, leading=40, textColor=WHITE,  fontName="Helvetica-Bold",    alignment=TA_LEFT)
cov_sub    = S("csub",  fontSize=13, leading=18, textColor=HexColor("#94A3B8"), fontName="Helvetica", alignment=TA_LEFT)
cov_meta   = S("cmet",  fontSize=9,  leading=14, textColor=WHITE,  fontName="Helvetica",         alignment=TA_LEFT, spaceAfter=2)
cov_disc   = S("cdis",  fontSize=7.5,leading=12, textColor=HexColor("#64748B"), fontName="Helvetica", alignment=TA_LEFT)

h1         = S("H1",   fontSize=14, leading=18, textColor=NAVY,    fontName="Helvetica-Bold",    spaceBefore=12, spaceAfter=5)
h2         = S("H2",   fontSize=11, leading=15, textColor=TEAL,    fontName="Helvetica-Bold",    spaceBefore=10, spaceAfter=4)
h3         = S("H3",   fontSize=9.5,leading=14, textColor=SLATE,   fontName="Helvetica-Bold",    spaceBefore=7,  spaceAfter=3)
body       = S("Bod",  fontSize=9,  leading=14, textColor=BLACK,   fontName="Helvetica",         spaceAfter=6,   alignment=TA_JUSTIFY)
mono       = S("Mon",  fontSize=7.5,leading=11, textColor=HexColor("#1E293B"), fontName="Courier", spaceAfter=4)
note_s     = S("Not",  fontSize=8.5,leading=13, textColor=SLATE,   fontName="Helvetica-Oblique", spaceAfter=5, leftIndent=6)
insight_s  = S("Ins",  fontSize=9.5,leading=14, textColor=NAVY2,   fontName="Helvetica-BoldOblique", spaceAfter=5, leftIndent=6, rightIndent=6)
toc_s      = S("TOC",  fontSize=9,  leading=16, textColor=NAVY,    fontName="Helvetica")
bullet_s   = S("Bul",  fontSize=9,  leading=14, textColor=BLACK,   fontName="Helvetica",         leftIndent=10, spaceAfter=3)
ftr_s      = S("Ftr",  fontSize=7.5,leading=10, textColor=SLATE_L, fontName="Helvetica",         alignment=TA_CENTER)
num_s      = S("Num",  fontSize=22, leading=26, textColor=TEAL,    fontName="Helvetica-Bold",    alignment=TA_CENTER)
num_lbl    = S("NLb",  fontSize=7,  leading=10, textColor=SLATE_L, fontName="Helvetica",         alignment=TA_CENTER)

# ── Helpers ────────────────────────────────────────────────────────────────────
def hr(color=RULE, t=0.4, sb=4, sa=4):
    return HRFlowable(width="100%", thickness=t, color=color, spaceBefore=sb, spaceAfter=sa)

def section_hdr(num, title):
    n_s = ParagraphStyle(f"sn{num}", fontSize=8, fontName="Helvetica-Bold",
                         textColor=WHITE, alignment=TA_CENTER, leading=10)
    t_s = ParagraphStyle(f"st{num}", fontSize=14, fontName="Helvetica-Bold",
                         textColor=WHITE, leading=18)
    tbl = Table(
        [[Paragraph(f"{num:02d}", n_s), Paragraph(title, t_s)]],
        colWidths=[10*mm, USABLE_W - 10*mm],
        style=TableStyle([
            ("BACKGROUND",    (0,0),(-1,-1), NAVY),
            ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
            ("TOPPADDING",    (0,0),(-1,-1), 6),
            ("BOTTOMPADDING", (0,0),(-1,-1), 6),
            ("LEFTPADDING",   (0,0),(0,-1),  3),
            ("LEFTPADDING",   (1,0),(1,-1),  10),
            ("LINEBEFORE",    (1,0),(1,-1),  2, TEAL),
        ])
    )
    return tbl

def code_block(lines):
    text = "<br/>".join(
        l.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;").replace(" ","&nbsp;")
        for l in lines
    )
    return Table([[Paragraph(text, mono)]], colWidths=[USABLE_W],
        style=TableStyle([
            ("BACKGROUND",    (0,0),(-1,-1), CODE_BG),
            ("BOX",           (0,0),(-1,-1), 0.5, RULE),
            ("TOPPADDING",    (0,0),(-1,-1), 7),
            ("BOTTOMPADDING", (0,0),(-1,-1), 7),
            ("LEFTPADDING",   (0,0),(-1,-1), 10),
            ("RIGHTPADDING",  (0,0),(-1,-1), 10),
            ("LINEBEFORE",    (0,0),(0,-1),  3, TEAL),
        ]))

def insight_box(text, color=TEAL, bg=None):
    bg = bg or HexColor("#E6F7F2")
    return Table([[Paragraph(text, insight_s)]], colWidths=[USABLE_W],
        style=TableStyle([
            ("BACKGROUND",    (0,0),(-1,-1), bg),
            ("LINEBEFORE",    (0,0),(0,-1),  3, color),
            ("TOPPADDING",    (0,0),(-1,-1), 7),
            ("BOTTOMPADDING", (0,0),(-1,-1), 7),
            ("LEFTPADDING",   (0,0),(-1,-1), 12),
            ("RIGHTPADDING",  (0,0),(-1,-1), 10),
        ]))

def note_box(text, color=GOLD, bg=AMBER_LIGHT):
    return Table([[Paragraph(text, note_s)]], colWidths=[USABLE_W],
        style=TableStyle([
            ("BACKGROUND",    (0,0),(-1,-1), bg),
            ("LINEBEFORE",    (0,0),(0,-1),  3, color),
            ("TOPPADDING",    (0,0),(-1,-1), 5),
            ("BOTTOMPADDING", (0,0),(-1,-1), 5),
            ("LEFTPADDING",   (0,0),(-1,-1), 10),
            ("RIGHTPADDING",  (0,0),(-1,-1), 8),
        ]))

def std_table(headers, rows, col_widths=None, zebra=True, hdr_bg=NAVY):
    if col_widths is None:
        col_widths = [USABLE_W / len(headers)] * len(headers)
    hdr_p = ParagraphStyle("th", fontSize=8, leading=11, fontName="Helvetica-Bold", textColor=WHITE)
    cel_p = ParagraphStyle("td", fontSize=8, leading=12, fontName="Helvetica",      textColor=BLACK)
    data = [[Paragraph(str(c), hdr_p) for c in headers]]
    for row in rows:
        data.append([Paragraph(str(c), cel_p) for c in row])
    ts = TableStyle([
        ("BACKGROUND",    (0,0),(-1,0),  hdr_bg),
        ("TOPPADDING",    (0,0),(-1,-1), 4),
        ("BOTTOMPADDING", (0,0),(-1,-1), 4),
        ("LEFTPADDING",   (0,0),(-1,-1), 6),
        ("RIGHTPADDING",  (0,0),(-1,-1), 6),
        ("LINEBELOW",     (0,0),(-1,-1), 0.3, RULE),
        ("VALIGN",        (0,0),(-1,-1), "TOP"),
    ])
    if zebra:
        for i in range(1, len(data)):
            if i % 2 == 0:
                ts.add("BACKGROUND", (0,i),(-1,i), PAPER)
    return Table(data, colWidths=col_widths, style=ts, repeatRows=1)

def kpi_card(value, label, sub="", color=TEAL):
    vs = ParagraphStyle("kv", fontSize=24, leading=28, fontName="Helvetica-Bold",
                        textColor=color, alignment=TA_CENTER)
    ls = ParagraphStyle("kl", fontSize=7.5, leading=10, fontName="Helvetica-Bold",
                        textColor=SLATE, alignment=TA_CENTER)
    ss = ParagraphStyle("ks", fontSize=7, leading=10, fontName="Helvetica",
                        textColor=SLATE_L, alignment=TA_CENTER)
    inner = [[Paragraph(value, vs)], [Paragraph(label, ls)]]
    if sub:
        inner.append([Paragraph(sub, ss)])
    return Table(inner, colWidths=[USABLE_W/4 - 4*mm],
        style=TableStyle([
            ("BACKGROUND",    (0,0),(-1,-1), WHITE),
            ("BOX",           (0,0),(-1,-1), 0.5, RULE),
            ("LINEABOVE",     (0,0),(-1,0),  2, color),
            ("ALIGN",         (0,0),(-1,-1), "CENTER"),
            ("TOPPADDING",    (0,0),(-1,-1), 6),
            ("BOTTOMPADDING", (0,0),(-1,-1), 6),
        ]))

# ── Page callbacks ─────────────────────────────────────────────────────────────
def on_cover(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(NAVY)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    canvas.setFillColor(TEAL)
    canvas.rect(0, 0, PAGE_W, 6*mm, fill=1, stroke=0)
    canvas.setFillColor(NAVY2)
    canvas.rect(0, PAGE_H * 0.38, PAGE_W, PAGE_H * 0.62, fill=1, stroke=0)
    canvas.restoreState()

def on_page(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(NAVY)
    canvas.rect(0, PAGE_H - 9*mm, PAGE_W, 9*mm, fill=1, stroke=0)
    canvas.setFillColor(TEAL)
    canvas.rect(0, PAGE_H - 9.8*mm, PAGE_W, 0.8*mm, fill=1, stroke=0)
    canvas.setFillColor(WHITE)
    canvas.setFont("Helvetica-Bold", 7)
    canvas.drawString(MARGIN, PAGE_H - 5.8*mm, "SEEK WANDER")
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(HexColor("#94A3B8"))
    canvas.drawRightString(PAGE_W - MARGIN, PAGE_H - 5.8*mm,
                           "FINANCIALS & UNIT ECONOMICS  |  CONFIDENTIAL")
    canvas.setFillColor(SLATE_L)
    canvas.setFont("Helvetica", 7)
    canvas.drawString(MARGIN, 8*mm, "ZenithAI Data Room  |  v1.0  |  March 2026")
    canvas.drawRightString(PAGE_W - MARGIN, 8*mm, f"Page {doc.page}")
    canvas.setStrokeColor(TEAL)
    canvas.setLineWidth(0.6)
    canvas.line(MARGIN, 12*mm, PAGE_W - MARGIN, 12*mm)
    canvas.restoreState()

# ── Story ──────────────────────────────────────────────────────────────────────
story = []

# ── COVER ──────────────────────────────────────────────────────────────────────
story.append(Spacer(1, 16*mm))
story.append(Paragraph("THE LEDGER", cov_pre))
story.append(Spacer(1, 3*mm))
story.append(Paragraph("Seek Wander", cov_title))
story.append(Spacer(1, 2*mm))
story.append(Paragraph("Financials &amp; Unit Economics", cov_sub))
story.append(Spacer(1, 24*mm))
story.append(HRFlowable(width="100%", thickness=0.5, color=TEAL, spaceBefore=0, spaceAfter=12))
story.append(Paragraph("Classification: &nbsp; CONFIDENTIAL — ZenithAI Data Room", cov_meta))
story.append(Paragraph("Document Version: &nbsp; 1.0", cov_meta))
story.append(Paragraph("Last Updated: &nbsp; March 2026", cov_meta))
story.append(Paragraph("Revenue Model: &nbsp; Native Affiliate Placements (Pivoted from Stripe Paywall)", cov_meta))
story.append(Spacer(1, 50*mm))
story.append(Paragraph(
    "This document contains forward-looking financial projections and proprietary cost "
    "architecture data. Distribution is restricted to authorised parties. "
    "Projections are illustrative and based on the assumptions stated herein.",
    cov_disc
))
story.append(PageBreak())

# ── TOC ────────────────────────────────────────────────────────────────────────
story.append(Spacer(1, 4*mm))
story.append(Paragraph("Table of Contents", h1))
story.append(hr(TEAL, 1.2, 2, 8))
toc_entries = [
    ("01", "Executive Summary: The Business Model"),
    ("02", "Margin Protection &amp; Cost Engineering"),
    ("03", "Unit Economics — Cost Per Curation"),
    ("04", "Revenue Model — The Affiliate Math"),
    ("05", "The Internal Ledger — CostLog"),
    ("06", "Infrastructure Runway — Fixed Costs"),
]
for num, title in toc_entries:
    n_s = ParagraphStyle("tn2", fontSize=9, fontName="Helvetica-Bold", textColor=TEAL)
    row = Table([[Paragraph(num, n_s), Paragraph(title, toc_s)]],
        colWidths=[10*mm, USABLE_W - 10*mm],
        style=TableStyle([
            ("LINEBELOW",     (0,0),(-1,-1), 0.3, RULE),
            ("TOPPADDING",    (0,0),(-1,-1), 5),
            ("BOTTOMPADDING", (0,0),(-1,-1), 5),
            ("LEFTPADDING",   (1,0),(1,-1),  6),
            ("LEFTPADDING",   (0,0),(0,-1),  0),
        ]))
    story.append(row)
story.append(PageBreak())

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 1 — EXECUTIVE SUMMARY
# ══════════════════════════════════════════════════════════════════════════════
story.append(section_hdr(1, "Executive Summary: The Business Model"))
story.append(Spacer(1, 5*mm))

story.append(Paragraph("Model Classification: High-Volume Affiliate Commerce", h2))
story.append(Paragraph(
    "Seek Wander operates as a <b>zero-CAC, high-ARPU affiliate commerce platform</b> "
    "dressed in the aesthetic of a luxury editorial product. The product is free at the "
    "point of use. Revenue is captured entirely on the backend when users act on the "
    "curated recommendations embedded in their itinerary.",
    body
))
story.append(Paragraph(
    "The model is structurally identical to the playbooks that built NerdWallet ($8.7B IPO), "
    "TripAdvisor ($4B peak market cap), and Booking Holdings ($120B+ market cap): acquire "
    "users at zero marginal cost via a genuinely useful free product, then monetize the "
    "high-intent behaviour that the product naturally produces.",
    body
))
story.append(Spacer(1, 3*mm))

# KPI cards
kpi_row = [[
    kpi_card("$0", "Customer Acquisition Cost", "Programmatic SEO + viral sharing", TEAL),
    kpi_card("~$0.12", "Cost Per Generation", "Blended, 80% cache hit rate", NAVY),
    kpi_card("$160", "Revenue Per Hotel Conv.", "@ $2,000 stay, 8% commission", TEAL),
    kpi_card(">95%", "Gross Margin at Scale", "LLM tokens only variable cost", NAVY),
]]
kpi_tbl = Table(kpi_row, colWidths=[USABLE_W/4]*4,
    style=TableStyle([
        ("LEFTPADDING",   (0,0),(-1,-1), 2),
        ("RIGHTPADDING",  (0,0),(-1,-1), 2),
        ("TOPPADDING",    (0,0),(-1,-1), 0),
        ("BOTTOMPADDING", (0,0),(-1,-1), 0),
    ]))
story.append(kpi_tbl)
story.append(Spacer(1, 5*mm))

story.append(Paragraph("The Strategic Pivot: Removing the Paywall", h2))
story.append(Paragraph(
    "The original monetization strategy ($4.99 Stripe paywall per generation) was "
    "analytically sound but strategically premature. At the pre-brand-awareness stage, "
    "a hard paywall imposes a <b>60-80% estimated conversion penalty</b> on top-of-funnel "
    "user acquisition. Every user who bounces at the payment screen is a lost affiliate "
    "opportunity worth a potential $160+ in backend commissions.",
    body
))
story.append(insight_box(
    "Key insight: One converted hotel booking (commission: ~$160) is worth 32 paywall "
    "transactions ($4.99 x 32 = $159.68). Maximizing the volume of users who receive and "
    "act on curated recommendations is therefore a higher expected-value strategy than "
    "maximizing payment conversions at acquisition."
))
story.append(Spacer(1, 4*mm))

story.append(Paragraph("Business Model Summary", h2))
story.append(std_table(
    [" Dimension", " Value"],
    [
        ["Revenue model",                 "Native affiliate commissions on travel bookings"],
        ["User acquisition cost (CAC)",   "$0 — programmatic SEO + social automation + viral sharing"],
        ["Cost per generation (cache miss)", "~$0.08–$0.41 depending on destination novelty"],
        ["Cost per generation (cache hit)",  "~$0.05 (Claude tokens only)"],
        ["Blended affiliate commission",  "4–10% of booking value"],
        ["Revenue per converted user",    "$60–$825 (hotel: $160, tour: $32–$64, activity: $8–$50)"],
        ["Gross margin at scale",         ">95% (only true variable cost is LLM tokens)"],
        ["Primary fixed infrastructure",  "Vercel + Supabase + Clerk + Upstash (all free/hobby tier)"],
    ],
    [45*mm, USABLE_W - 45*mm]
))

story.append(PageBreak())

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 2 — MARGIN PROTECTION
# ══════════════════════════════════════════════════════════════════════════════
story.append(section_hdr(2, "Margin Protection & Cost Engineering"))
story.append(Spacer(1, 5*mm))
story.append(Paragraph(
    "Three specific engineering decisions were implemented before the first dollar of "
    "revenue — each targeting a distinct API cost vector that would otherwise erode "
    "gross margins at scale.",
    body
))
story.append(Spacer(1, 3*mm))

# 2.1
story.append(Paragraph("2.1 — The PlaceCache: Supabase Google Places Cache", h2))
story.append(Paragraph(
    "The Google Places API charges $0.032 per Text Search call and $0.017 per Place "
    "Details call. With 8-10 TimelineItem entries per itinerary, a fully uncached "
    "generation incurs approximately $0.40-$0.49 in Google API costs alone. "
    "The PlaceCache table eliminates this on all repeat destinations.",
    body
))
story.append(code_block([
    "Cache key:    '{normalized-name}|{normalized-city}'",
    "              e.g. 'nobu malibu|malibu'",
    "",
    "Cached data:  photoUrl, rating, userRatingsTotal, hoursOpen, priceLevel",
    "TTL:          30 days (updatedAt < NOW - 14 days purged by Vercel Cron)",
    "",
    "Daily Cron cleanup (00:00 UTC):",
    "  DELETE FROM PlaceCache WHERE updatedAt < NOW() - INTERVAL '14 days'",
    "  Prisma @updatedAt auto-refreshes on every cache hit — popular venues",
    "  perpetually renew their TTL. Only stale data is purged.",
]))
story.append(std_table(
    [" Scenario", " Google API Cost", " Cache Behaviour"],
    [
        ["New destination (Month 1)",       "$0.40–$0.49",  "100% miss — all calls live"],
        ["Repeat destination",              "$0.00",        "100% hit — zero API calls"],
        ["Blended — 50% popular dest.",     "~$0.20–$0.24", "50% hit rate"],
        ["Mature platform (80% hit rate)",  "~$0.08–$0.10", "80% hit — major savings"],
    ],
    [55*mm, 35*mm, USABLE_W - 90*mm]
))
story.append(Spacer(1, 4*mm))

# 2.2
story.append(Paragraph("2.2 — Haversine Replacement: Distance Matrix API Removed", h2))
story.append(Paragraph(
    "The Google Distance Matrix API charges $0.005 per origin-destination element. "
    "A 5-day itinerary with 8 stops per day generates 35 consecutive-stop pairs — "
    "$0.175 per generation for transit estimates that a mathematical formula produces "
    "with equivalent utility for a planning application.",
    body
))
story.append(code_block([
    "// Pure Haversine — zero API cost, runs in-process on serverless function",
    "km = 2 x R x arcsin(sqrt(sin2(dlat/2) + cos(lat_a) x cos(lat_b) x sin2(dlng/2)))",
    "walkingMinutes  = max(1, round((km / 5)  x 60))   // 5 km/h pedestrian",
    "drivingMinutes  = max(1, round((km / 25) x 60))   // 25 km/h urban average",
    "",
    "Saving per generation:         $0.175",
    "Saving at 1,000 MAU/month:     $175/month",
    "Saving at 10,000 MAU/month:    $1,750/month",
]))
story.append(Spacer(1, 4*mm))

# 2.3
story.append(Paragraph("2.3 — Local Time Computation: parseOpenNow()", h2))
story.append(Paragraph(
    "Displaying real-time open/closed venue status would require a live Google Place "
    "Details call on every cache hit — $0.017 per item. The hoursOpen string stored "
    "in PlaceCache ('9:00 AM - 9:00 PM') is instead parsed locally against a "
    "longitude-derived UTC offset estimate.",
    body
))
story.append(code_block([
    "parseOpenNow(hoursOpen: string, lng: number): boolean | undefined",
    "",
    "  UTC offset estimate = Math.round(lng / 15) hours",
    "  Accuracy: +/- 30 minutes vs actual local time",
    "",
    "  'Open 24 hours'       -> true   (no parse needed)",
    "  'Closed'              -> false  (no parse needed)",
    "  '9:00 AM - 9:00 PM'  -> compare currentMins against [openMins, closeMins]",
    "  Overnight spans       -> handled: closeMins < openMins branch",
    "",
    "  Result: ZERO Google API calls on all cache hits for openNow status",
]))
story.append(note_box(
    "Combined saving from all three optimisations at 80% cache hit rate, 10,000 MAU: "
    "~$2,500/month in avoided Google API costs. This is the structural cost moat that "
    "makes the affiliate model viable at every scale."
))

story.append(PageBreak())

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 3 — UNIT ECONOMICS
# ══════════════════════════════════════════════════════════════════════════════
story.append(section_hdr(3, "Unit Economics — Cost Per Curation"))
story.append(Spacer(1, 5*mm))

story.append(Paragraph("Pricing Constants", h2))
story.append(std_table(
    [" Service", " Cost Unit", " Rate"],
    [
        ["Anthropic Claude (input tokens)",  "Per 1,000,000 tokens", "$3.00"],
        ["Anthropic Claude (output tokens)", "Per 1,000,000 tokens", "$15.00"],
        ["Google Places Text Search",        "Per API call",         "$0.032"],
        ["Google Place Details",             "Per API call",         "$0.017"],
        ["Google Distance Matrix",           "Per element",          "$0.005 — PERMANENTLY REMOVED"],
    ],
    [55*mm, 40*mm, USABLE_W - 95*mm]
))
story.append(Spacer(1, 5*mm))

story.append(Paragraph("Scenario A — New Destination (Cache Miss, 100%)", h2))
story.append(std_table(
    [" Cost Component", " Calculation", " Cost (USD)"],
    [
        ["Claude input tokens",      "~3,500 tokens x ($3.00 / 1,000,000)",   "$0.0105"],
        ["Claude output tokens",     "~2,800 tokens x ($15.00 / 1,000,000)",  "$0.0420"],
        ["Google Text Search x 8",   "8 x $0.032",                            "$0.2560"],
        ["Google Place Details x 6", "6 x $0.017 (NATURE/ADVENTURE skipped)", "$0.1020"],
        ["Distance Matrix",          "Permanently removed",                    "$0.0000"],
        ["TOTAL",                    "",                                        "~$0.41"],
    ],
    [55*mm, 55*mm, USABLE_W - 110*mm]
))
story.append(Spacer(1, 4*mm))

story.append(Paragraph("Scenario B — Popular Destination (Cache Hit, 100%)", h2))
story.append(std_table(
    [" Cost Component", " Calculation", " Cost (USD)"],
    [
        ["Claude input tokens",  "~3,500 tokens x ($3.00 / 1,000,000)",  "$0.0105"],
        ["Claude output tokens", "~2,800 tokens x ($15.00 / 1,000,000)", "$0.0420"],
        ["Google Places API",    "100% cache hit — zero calls made",      "$0.0000"],
        ["TOTAL",                "",                                       "~$0.053"],
    ],
    [55*mm, 55*mm, USABLE_W - 110*mm]
))
story.append(Spacer(1, 4*mm))

story.append(Paragraph("Scenario C — Blended (80% Cache Hit Rate, Mature Platform)", h2))
story.append(std_table(
    [" Cost Component", " Calculation", " Cost (USD)"],
    [
        ["Claude tokens (constant)",   "All generations",          "$0.0525"],
        ["Google APIs (20% miss rate)","20% x $0.3580",            "$0.0716"],
        ["TOTAL",                      "",                          "~$0.124"],
    ],
    [55*mm, 55*mm, USABLE_W - 110*mm]
))
story.append(Spacer(1, 4*mm))

story.append(Paragraph("Cost Trajectory — As Platform Matures", h2))
story.append(std_table(
    [" Stage", " Cache Hit Rate", " Cost Per Generation"],
    [
        ["Launch (Month 1)",    "0%",   "~$0.41"],
        ["Early growth (Month 3)", "40%", "~$0.20"],
        ["Growth (Month 6)",    "65%",  "~$0.18"],
        ["Mature (Month 12+)", "80%+",  "~$0.12"],
        ["Theoretical max",    "100%",  "~$0.05"],
    ],
    [55*mm, 40*mm, USABLE_W - 95*mm]
))
story.append(Spacer(1, 3*mm))
story.append(insight_box(
    "The cost curve is permanently downward. Every generation at a previously-visited "
    "destination reduces the marginal cost of every future generation at that destination "
    "to $0.05. PlaceCache is a compounding cost moat — the longer the platform operates, "
    "the lower its unit economics become."
))

story.append(PageBreak())

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 4 — REVENUE MODEL
# ══════════════════════════════════════════════════════════════════════════════
story.append(section_hdr(4, "Revenue Model — The Affiliate Math"))
story.append(Spacer(1, 5*mm))

story.append(Paragraph("Commission Structure", h2))
story.append(std_table(
    [" Partner", " Category", " Commission Rate", " Avg Booking Value", " Revenue / Conversion"],
    [
        ["Booking.com",   "Hotels & resorts",      "4–6%",    "$1,500–$4,000/stay",     "$60–$240"],
        ["Viator",        "Tours & experiences",   "8%",      "$150–$800/booking",      "$12–$64"],
        ["GetYourGuide",  "Activities",            "8–10%",   "$100–$500/booking",      "$8–$50"],
        ["OpenTable",     "Restaurant reservations","$1–2/cover","N/A",                 "$2–$8/booking"],
    ],
    [28*mm, 30*mm, 25*mm, 33*mm, USABLE_W - 116*mm]
))
story.append(Spacer(1, 5*mm))

story.append(Paragraph("The ARPU Model — Conservative vs Aspirational", h2))
story.append(code_block([
    "CONSERVATIVE — 3-Day Paris Itinerary",
    "  Books 1 hotel night via Booking.com:   $800 stay x 5%   = $40 commission",
    "  Books 1 Louvre private tour via Viator: $200 x 8%       = $16 commission",
    "  Makes 2 restaurant reservations:        2 x $3 (covers) = $6  commission",
    "  ─────────────────────────────────────────────────────────────────────────",
    "  Total revenue from 1 user, 1 itinerary:                   $62",
    "  Cost of generation:                                        $0.12",
    "  Gross margin on this transaction:                          99.8%",
    "",
    "ASPIRATIONAL — 5-Day Maldives Itinerary",
    "  Books overwater villa via Booking.com: $3,000/night x 5 = $15,000 booking",
    "  Commission: $15,000 x 5%                                 = $750 commission",
    "  Books seaplane transfer via Viator:    $600 x 8%        = $48  commission",
    "  Books diving excursion via GYG:        $300 x 9%        = $27  commission",
    "  ─────────────────────────────────────────────────────────────────────────",
    "  Total revenue from 1 user, 1 itinerary:                   $825",
    "  Cost of generation:                                        $0.12",
    "  Gross margin on this transaction:                          99.985%",
]))
story.append(Spacer(1, 4*mm))

story.append(Paragraph("Scale Model — Monthly Revenue Projections", h2))
story.append(std_table(
    [" MAU", " Gen/User", " Conv. Rate", " Avg Rev/Conv", " Monthly Revenue", " AI Cost", " Net Margin"],
    [
        ["500",    "2",   "8%",  "$80",  "$3,200",    "$124",    "96.1%"],
        ["1,000",  "2",   "8%",  "$80",  "$6,400",    "$248",    "96.1%"],
        ["5,000",  "2.5", "10%", "$100", "$50,000",   "$1,550",  "96.9%"],
        ["10,000", "3",   "12%", "$120", "$144,000",  "$3,720",  "97.4%"],
        ["50,000", "3",   "15%", "$150", "$337,500",  "$18,600", "94.5%"],
    ],
    [18*mm, 17*mm, 18*mm, 20*mm, 28*mm, 20*mm, USABLE_W - 121*mm]
))
story.append(Spacer(1, 3*mm))
story.append(note_box(
    "Assumptions: 80% cache hit rate at scale; blended generation cost $0.124; "
    "conversion rate increases with brand authority; affiliate commission blended at 6%. "
    "AI cost column represents Anthropic-only variable cost — Google Places API costs "
    "approach zero at 80%+ cache hit rate."
))
story.append(Spacer(1, 4*mm))
story.append(insight_box(
    "The model scales near-linearly with users and super-linearly with brand authority. "
    "As Seek Wander becomes a trusted editorial voice, both conversion rates and average "
    "booking values increase — without any increase in marginal cost per user."
))

story.append(PageBreak())

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 5 — COSTLOG
# ══════════════════════════════════════════════════════════════════════════════
story.append(section_hdr(5, "The Internal Ledger — CostLog"))
story.append(Spacer(1, 5*mm))

story.append(Paragraph("Architecture", h2))
story.append(Paragraph(
    "Every itinerary generation writes a financial record to the CostLog table in Supabase "
    "<b>synchronously</b> — awaited before the HTTP response is returned. This is a "
    "deliberate architectural decision: Vercel serverless functions are frozen the instant "
    "the HTTP response exits, killing any fire-and-forget background write. Awaiting the "
    "write guarantees zero financial data loss.",
    body
))
story.append(code_block([
    "// Executed after every generation — route.ts",
    "await prisma.costLog.create({",
    "  data: {",
    "    userId,       // Clerk userId (null for unauthenticated)",
    "    destination,  // 'Paris, France'",
    "    aiCost,       // Decimal(10,6) — e.g. 0.052500",
    "    googleCost,   // Decimal(10,6) — e.g. 0.071600",
    "    totalCost,    // Decimal(10,6) — e.g. 0.124100",
    "    cacheHits,    // int — PlaceCache hits this generation",
    "    cacheMisses,  // int — fresh Google API calls this generation",
    "  }",
    "});",
    "// GenerationMeta logged to server console ONLY — never in HTTP response",
    "return Response.json(itinerary);",
]))
story.append(Spacer(1, 4*mm))

story.append(Paragraph("Prisma Schema", h2))
story.append(code_block([
    "model CostLog {",
    "  id          String   @id @default(uuid())",
    "  userId      String?                         // null = unauthenticated",
    "  destination String",
    "  aiCost      Decimal  @db.Decimal(10, 6)     // 6dp = $0.000001 precision",
    "  googleCost  Decimal  @db.Decimal(10, 6)",
    "  totalCost   Decimal  @db.Decimal(10, 6)",
    "  cacheHits   Int",
    "  cacheMisses Int",
    "  createdAt   DateTime @default(now())",
    "}",
]))
story.append(note_box(
    "Why Decimal(10,6) and not Float: IEEE 754 floating-point arithmetic accumulates "
    "rounding errors in financial summations. Decimal(10,6) stores exact decimal values, "
    "giving the /admin/metrics aggregate queries (SUM, AVG) mathematically correct "
    "results regardless of row count. This is the same reason financial systems "
    "universally use DECIMAL over FLOAT."
))
story.append(Spacer(1, 4*mm))

story.append(Paragraph("Admin Dashboard — /admin/metrics KPIs", h2))
story.append(std_table(
    [" KPI Card", " SQL Aggregate", " Insight"],
    [
        ["Total Spent",      "SUM(totalCost)",                                     "Cumulative platform spend — gross cost of all generations"],
        ["Total Generations","COUNT(*)",                                            "Volume metric — proxy for user engagement"],
        ["Avg Cost / Trip",  "AVG(totalCost)",                                     "Tracks cache efficiency over time — should trend down"],
        ["Cache Hit Rate",   "SUM(cacheHits) / (SUM(cacheHits) + SUM(cacheMisses))","Key margin health indicator — target >70% at Month 6"],
    ],
    [35*mm, 55*mm, USABLE_W - 90*mm]
))
story.append(Spacer(1, 3*mm))
story.append(insight_box(
    "Cost data confidentiality: GenerationMeta (the per-generation cost breakdown) "
    "is logged to the Vercel server console only. It is never included in the API "
    "response body — protecting margin data from exposure via browser DevTools."
))

story.append(PageBreak())

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 6 — INFRASTRUCTURE
# ══════════════════════════════════════════════════════════════════════════════
story.append(section_hdr(6, "Infrastructure Runway — Fixed Costs"))
story.append(Spacer(1, 5*mm))

story.append(Paragraph("The Lean Stack", h2))
story.append(Paragraph(
    "Seek Wander's fixed infrastructure cost is effectively zero at pre-revenue scale. "
    "Every service in the stack has a generous free or hobby tier that covers the "
    "operational requirements of a pre-Series A product.",
    body
))
story.append(std_table(
    [" Service", " Role", " Tier", " Monthly Fixed Cost"],
    [
        ["Vercel",      "Hosting, serverless functions, cron jobs, edge CDN", "Hobby (free)",         "$0"],
        ["Supabase",    "PostgreSQL — Trip, PlaceCache, CostLog, UserBalance", "Free (500MB, 2 CPU)", "$0"],
        ["Clerk",       "Authentication, user management, webhooks",           "Free (10,000 MAU)",   "$0"],
        ["Upstash Redis","Serverless rate limiting (sliding window)",          "Free (10k cmds/day)", "$0"],
        ["n8n Cloud",   "Social automation, onboarding email workflows",       "Free (5 workflows)",  "$0"],
        ["Resend",      "Transactional email (Founder's Welcome)",             "Free (100/day)",      "$0"],
        ["TOTAL",       "",                                                    "",                    "$0/month"],
    ],
    [25*mm, 55*mm, 30*mm, USABLE_W - 110*mm]
))
story.append(Spacer(1, 5*mm))

story.append(Paragraph("Upgrade Thresholds", h2))
story.append(std_table(
    [" Service", " Free Tier Limit", " Upgrade Trigger", " Upgrade Cost"],
    [
        ["Vercel",      "100GB bandwidth, 6,000 function min/mo", ">10,000 MAU",              "$20/month (Pro)"],
        ["Supabase",    "500MB database, 2GB bandwidth",          ">50,000 CostLog rows",     "$25/month (Pro)"],
        ["Clerk",       "10,000 MAU",                             ">10,000 registered users", "$25/month (Pro)"],
        ["Upstash Redis","10,000 commands/day",                   ">500 daily generations",   "$10/month (PAYG)"],
    ],
    [25*mm, 45*mm, 35*mm, USABLE_W - 105*mm]
))
story.append(Spacer(1, 3*mm))
story.append(note_box(
    "The platform can serve approximately 5,000-10,000 MAU before a single dollar of "
    "fixed infrastructure cost is incurred. By that point, affiliate commissions from a "
    "5% conversion rate at $80 average would yield $20,000-$40,000/month — making the "
    "$80/month infrastructure bill economically irrelevant."
))
story.append(Spacer(1, 4*mm))

story.append(Paragraph("The Only True Variable Cost", h2))
story.append(Paragraph(
    "Anthropic API usage is the sole variable cost at scale. At $0.0525 per generation "
    "(Claude tokens, constant regardless of cache), and assuming 2.5 average generations "
    "per monthly active user:",
    body
))
story.append(std_table(
    [" MAU", " Monthly Generations", " Anthropic Cost", " As % of Revenue (5% conv, $80 ARPU)"],
    [
        ["1,000",  "2,500",   "$131.25",   "2.1%"],
        ["5,000",  "12,500",  "$656.25",   "0.8%"],
        ["10,000", "25,000",  "$1,312.50", "0.5%"],
        ["50,000", "125,000", "$6,562.50", "0.3%"],
    ],
    [20*mm, 35*mm, 30*mm, USABLE_W - 85*mm]
))
story.append(Spacer(1, 4*mm))

story.append(Paragraph("Gross Margin Summary — 50,000 MAU Scenario", h2))
story.append(code_block([
    "Revenue (50,000 MAU, 5% conversion, $80 avg commission):   $200,000/month",
    "  Less: Anthropic API costs                               -$6,563/month",
    "  Less: Google Places API (blended 20% miss rate)         -$3,100/month",
    "  Less: Fixed infrastructure (upgraded tiers)             -$80/month",
    "  ─────────────────────────────────────────────────────────────────────",
    "  Gross Profit:                                           $190,257/month",
    "  Gross Margin:                                           95.1%",
]))
story.append(Spacer(1, 3*mm))
story.append(insight_box(
    "95%+ gross margins at scale. The product is a software intermediary between "
    "user intent and high-value travel transactions. The marginal cost of serving each "
    "additional user is a fraction of a cent. This is the defining financial profile "
    "of a category-leading affiliate commerce business."
))

story.append(Spacer(1, 6*mm))
story.append(hr(TEAL, 1, 4, 6))
story.append(Paragraph(
    "This document reflects the financial architecture and unit economics of Seek Wander "
    "as of March 2026. Projections are illustrative and based on stated assumptions. "
    "Actual results will vary based on user acquisition, conversion rates, and affiliate "
    "programme terms.",
    ftr_s
))

doc.build(story, onFirstPage=on_cover, onLaterPages=on_page)
print(f"PDF saved: {OUTPUT}")
size = os.path.getsize(OUTPUT)
print(f"Size: {size:,} bytes ({size/1024:.1f} KB)")
