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

# ── Palette ────────────────────────────────────────────────────────────────────
PAPER       = HexColor("#F5F0E8")
PAPER_DARK  = HexColor("#EDE8DC")
INK         = HexColor("#0A0A0A")
INK_LIGHT   = HexColor("#6B6B6B")
BURNT_OG    = HexColor("#C2410C")
EMERALD     = HexColor("#059669")
NAVY        = HexColor("#0F1C2E")
GOLD        = HexColor("#C2A060")
CODE_BG     = HexColor("#F0EDE6")
CODE_BD     = HexColor("#D4CFC5")
WHITE       = colors.white
CREAM       = HexColor("#FAF7F2")

PAGE_W, PAGE_H = A4
MARGIN   = 20 * mm
USABLE_W = PAGE_W - 2 * MARGIN

OUTPUT = r"D:\travel-plannner-v2\docs\Seek_Wander_Brand_Guidelines.pdf"

doc = SimpleDocTemplate(
    OUTPUT, pagesize=A4,
    leftMargin=MARGIN, rightMargin=MARGIN,
    topMargin=MARGIN,  bottomMargin=MARGIN,
    title="Seek Wander — Brand Guidelines & Marketing Strategy",
    author="ZenithAI Data Room",
    subject="Brand & Marketing Reference",
)

base = getSampleStyleSheet()

def S(name, parent="Normal", **kw):
    return ParagraphStyle(name, parent=base[parent], **kw)

# Cover styles
cov_title   = S("CovT", fontSize=38, leading=44, textColor=PAPER,      fontName="Helvetica-Bold",    alignment=TA_LEFT)
cov_italic  = S("CovI", fontSize=16, leading=22, textColor=GOLD,       fontName="Helvetica-Oblique", alignment=TA_LEFT)
cov_sub     = S("CovS", fontSize=10, leading=15, textColor=PAPER,      fontName="Helvetica",         alignment=TA_LEFT, spaceAfter=3)
cov_conf    = S("CovC", fontSize=8,  leading=13, textColor=INK_LIGHT,  fontName="Helvetica",         alignment=TA_LEFT)

# Content styles
h1          = S("H1",  fontSize=15, leading=20, textColor=INK,         fontName="Helvetica-Bold",    spaceBefore=14, spaceAfter=5)
h2          = S("H2",  fontSize=11, leading=15, textColor=BURNT_OG,    fontName="Helvetica-Bold",    spaceBefore=10, spaceAfter=3)
h3          = S("H3",  fontSize=9.5,leading=14, textColor=INK,         fontName="Helvetica-Bold",    spaceBefore=7,  spaceAfter=3)
body        = S("Bod", fontSize=9,  leading=14, textColor=INK,         fontName="Helvetica",         spaceAfter=6,   alignment=TA_JUSTIFY)
note        = S("Not", fontSize=8.5,leading=13, textColor=HexColor("#4A5568"), fontName="Helvetica-Oblique", spaceAfter=5, leftIndent=6)
quote       = S("Quo", fontSize=11, leading=17, textColor=BURNT_OG,    fontName="Helvetica-Oblique", spaceAfter=8,   leftIndent=8, rightIndent=8)
code_s      = S("Cod", fontSize=7.5,leading=11, textColor=HexColor("#2D3748"), fontName="Courier",   spaceAfter=5)
toc_s       = S("TOC", fontSize=9,  leading=16, textColor=NAVY,        fontName="Helvetica")
bullet_s    = S("Bul", fontSize=9,  leading=14, textColor=INK,         fontName="Helvetica",         leftIndent=10, spaceAfter=3, bulletIndent=4)
label_s     = S("Lab", fontSize=7,  leading=10, textColor=WHITE,       fontName="Helvetica-Bold",    alignment=TA_CENTER)
ftr_s       = S("Ftr", fontSize=7.5,leading=10, textColor=INK_LIGHT,  fontName="Helvetica",         alignment=TA_CENTER)
swatch_lbl  = S("SwL", fontSize=8,  leading=11, textColor=INK,         fontName="Helvetica-Bold")
swatch_hex  = S("SwH", fontSize=7.5,leading=10, textColor=INK_LIGHT,  fontName="Courier")

# ── Helpers ────────────────────────────────────────────────────────────────────
def hr(color=CODE_BD, thickness=0.4, spB=4, spA=4):
    return HRFlowable(width="100%", thickness=thickness, color=color, spaceBefore=spB, spaceAfter=spA)

def section_header(num, title, color=INK):
    num_s  = S(f"sn{num}", fontSize=8, leading=10, textColor=GOLD,  fontName="Helvetica-Bold", alignment=TA_CENTER)
    ttl_s  = S(f"st{num}", fontSize=15, leading=19, textColor=INK,  fontName="Helvetica-Bold")
    tbl = Table(
        [[Paragraph(f"0{num}", num_s), Paragraph(title, ttl_s)]],
        colWidths=[10*mm, USABLE_W - 10*mm],
        style=TableStyle([
            ("BACKGROUND",    (0,0),(0,-1), BURNT_OG),
            ("BACKGROUND",    (1,0),(1,-1), PAPER_DARK),
            ("VALIGN",        (0,0),(-1,-1),"MIDDLE"),
            ("TOPPADDING",    (0,0),(-1,-1), 5),
            ("BOTTOMPADDING", (0,0),(-1,-1), 5),
            ("LEFTPADDING",   (0,0),(0,-1),  2),
            ("RIGHTPADDING",  (0,0),(0,-1),  2),
            ("LEFTPADDING",   (1,0),(1,-1),  8),
        ])
    )
    return tbl

def code_block(lines):
    text = "<br/>".join(
        l.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;").replace(" ","&nbsp;")
        for l in lines
    )
    return Table([[Paragraph(text, code_s)]], colWidths=[USABLE_W],
        style=TableStyle([
            ("BACKGROUND",    (0,0),(-1,-1), CODE_BG),
            ("BOX",           (0,0),(-1,-1), 0.5, CODE_BD),
            ("TOPPADDING",    (0,0),(-1,-1), 6),
            ("BOTTOMPADDING", (0,0),(-1,-1), 6),
            ("LEFTPADDING",   (0,0),(-1,-1), 8),
            ("RIGHTPADDING",  (0,0),(-1,-1), 8),
        ]))

def pull_quote(text):
    return Table([[Paragraph(text, quote)]], colWidths=[USABLE_W],
        style=TableStyle([
            ("LINEBEFORE",    (0,0),(0,-1), 3, BURNT_OG),
            ("BACKGROUND",    (0,0),(-1,-1), HexColor("#FDF9F5")),
            ("TOPPADDING",    (0,0),(-1,-1), 8),
            ("BOTTOMPADDING", (0,0),(-1,-1), 8),
            ("LEFTPADDING",   (0,0),(-1,-1), 14),
            ("RIGHTPADDING",  (0,0),(-1,-1), 10),
        ]))

def note_box(text):
    return Table([[Paragraph(text, note)]], colWidths=[USABLE_W],
        style=TableStyle([
            ("BACKGROUND",    (0,0),(-1,-1), HexColor("#EDF2F7")),
            ("LINEBEFORE",    (0,0),(0,-1),  3, GOLD),
            ("TOPPADDING",    (0,0),(-1,-1), 5),
            ("BOTTOMPADDING", (0,0),(-1,-1), 5),
            ("LEFTPADDING",   (0,0),(-1,-1), 10),
            ("RIGHTPADDING",  (0,0),(-1,-1), 8),
        ]))

def std_table(headers, rows, col_widths=None, zebra=True):
    if col_widths is None:
        col_widths = [USABLE_W / len(headers)] * len(headers)
    hdr_s  = ParagraphStyle("th", fontSize=8, leading=11, fontName="Helvetica-Bold", textColor=WHITE)
    cel_s  = ParagraphStyle("td", fontSize=8, leading=12, fontName="Helvetica",      textColor=INK)
    data = [[Paragraph(str(c), hdr_s) for c in headers]]
    for row in rows:
        data.append([Paragraph(str(c), cel_s) for c in row])
    ts = TableStyle([
        ("BACKGROUND",    (0,0),(-1,0),  INK),
        ("TOPPADDING",    (0,0),(-1,-1), 4),
        ("BOTTOMPADDING", (0,0),(-1,-1), 4),
        ("LEFTPADDING",   (0,0),(-1,-1), 6),
        ("RIGHTPADDING",  (0,0),(-1,-1), 6),
        ("LINEBELOW",     (0,0),(-1,-1), 0.3, CODE_BD),
        ("VALIGN",        (0,0),(-1,-1), "TOP"),
    ])
    if zebra:
        for i in range(1, len(data)):
            if i % 2 == 0:
                ts.add("BACKGROUND", (0,i),(-1,i), PAPER)
    return Table(data, colWidths=col_widths, style=ts, repeatRows=1)

def colour_swatch(hex_val, token, usage):
    swatch = Table([[""]], colWidths=[12*mm], rowHeights=[12*mm],
        style=TableStyle([
            ("BACKGROUND", (0,0),(-1,-1), HexColor(hex_val)),
            ("BOX",        (0,0),(-1,-1), 0.5, CODE_BD),
        ]))
    info = Table([[
        Paragraph(f"<b>{token}</b>", swatch_lbl),
        Paragraph(hex_val, swatch_hex),
    ],[
        Paragraph(usage, ParagraphStyle("su", fontSize=7.5, leading=10, fontName="Helvetica", textColor=INK_LIGHT, colSpan=2)),
        Paragraph("", swatch_hex),
    ]], colWidths=[25*mm, 30*mm],
        style=TableStyle([
            ("TOPPADDING",    (0,0),(-1,-1), 1),
            ("BOTTOMPADDING", (0,0),(-1,-1), 1),
            ("LEFTPADDING",   (0,0),(-1,-1), 0),
            ("SPAN",          (0,1),(1,1)),
        ]))
    return Table([[swatch, info]], colWidths=[14*mm, USABLE_W/3 - 14*mm],
        style=TableStyle([
            ("VALIGN",       (0,0),(-1,-1), "MIDDLE"),
            ("LEFTPADDING",  (0,0),(-1,-1), 0),
            ("RIGHTPADDING", (0,0),(-1,-1), 4),
            ("TOPPADDING",   (0,0),(-1,-1), 2),
            ("BOTTOMPADDING",(0,0),(-1,-1), 2),
        ]))

# ── Page callbacks ─────────────────────────────────────────────────────────────
def on_cover(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(INK)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    canvas.setFillColor(BURNT_OG)
    canvas.rect(0, 0, 5*mm, PAGE_H, fill=1, stroke=0)
    # Bottom paper strip
    canvas.setFillColor(PAPER_DARK)
    canvas.rect(0, 0, PAGE_W, 28*mm, fill=1, stroke=0)
    canvas.restoreState()

def on_page(canvas, doc):
    canvas.saveState()
    # Header
    canvas.setFillColor(PAPER_DARK)
    canvas.rect(0, PAGE_H - 9*mm, PAGE_W, 9*mm, fill=1, stroke=0)
    canvas.setStrokeColor(BURNT_OG)
    canvas.setLineWidth(1.5)
    canvas.line(0, PAGE_H - 9*mm, PAGE_W, PAGE_H - 9*mm)
    canvas.setFillColor(INK)
    canvas.setFont("Helvetica-Bold", 7)
    canvas.drawString(MARGIN, PAGE_H - 5.5*mm, "SEEK WANDER")
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(INK_LIGHT)
    canvas.drawRightString(PAGE_W - MARGIN, PAGE_H - 5.5*mm, "BRAND GUIDELINES & MARKETING STRATEGY")
    # Footer
    canvas.setFillColor(INK_LIGHT)
    canvas.setFont("Helvetica", 7)
    canvas.drawString(MARGIN, 8*mm, "Confidential — ZenithAI Data Room  |  v1.0  |  March 2026")
    canvas.drawRightString(PAGE_W - MARGIN, 8*mm, f"Page {doc.page}")
    canvas.setStrokeColor(BURNT_OG)
    canvas.setLineWidth(0.5)
    canvas.line(MARGIN, 12*mm, PAGE_W - MARGIN, 12*mm)
    canvas.restoreState()

# ── Story ──────────────────────────────────────────────────────────────────────
story = []

# ── COVER ──────────────────────────────────────────────────────────────────────
story.append(Spacer(1, 42*mm))
story.append(Paragraph("Seek Wander", cov_title))
story.append(Spacer(1, 2*mm))
story.append(Paragraph("Brand Guidelines &amp; Marketing Strategy", cov_italic))
story.append(Spacer(1, 18*mm))
story.append(HRFlowable(width="55%", thickness=0.8, color=BURNT_OG, spaceBefore=0, spaceAfter=10))
story.append(Paragraph("Classification: &nbsp; CONFIDENTIAL — ZenithAI Data Room", cov_sub))
story.append(Paragraph("Document Version: &nbsp; 1.0", cov_sub))
story.append(Paragraph("Last Updated: &nbsp; March 2026", cov_sub))
story.append(Spacer(1, 55*mm))
story.append(Paragraph(
    "The definitive reference for brand identity, visual standards, tone of voice, "
    "and marketing strategy. All product, editorial, and growth decisions must be "
    "evaluated against the standards defined herein.",
    cov_conf
))
story.append(PageBreak())

# ── TOC ────────────────────────────────────────────────────────────────────────
story.append(Spacer(1, 4*mm))
story.append(Paragraph("Table of Contents", h1))
story.append(hr(BURNT_OG, 1.2, 2, 8))

toc = [
    ("01", "Brand Positioning &amp; Core Identity"),
    ("02", "Visual Guidelines — The Million-Dollar UI/UX"),
    ("03", "Tone &amp; Voice — Copywriting Lexicon"),
    ("04", "Zero-CAC Acquisition Engine"),
    ("05", "User Lifecycle &amp; White-Glove Retention"),
    ("06", "Monetization Aesthetics"),
]
for num, title in toc:
    n_s = ParagraphStyle("tn", fontSize=9, fontName="Helvetica-Bold", textColor=BURNT_OG)
    t_s = ParagraphStyle("tt", fontSize=9, leading=16, fontName="Helvetica", textColor=NAVY)
    row = Table([[Paragraph(num, n_s), Paragraph(title, t_s)]],
        colWidths=[10*mm, USABLE_W - 10*mm],
        style=TableStyle([
            ("LINEBELOW",     (0,0),(-1,-1), 0.3, CODE_BD),
            ("TOPPADDING",    (0,0),(-1,-1), 5),
            ("BOTTOMPADDING", (0,0),(-1,-1), 5),
            ("LEFTPADDING",   (1,0),(1,-1),  6),
            ("LEFTPADDING",   (0,0),(0,-1),  0),
        ]))
    story.append(row)

story.append(PageBreak())

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 1 — BRAND POSITIONING
# ══════════════════════════════════════════════════════════════════════════════
story.append(section_header(1, "Brand Positioning & Core Identity"))
story.append(Spacer(1, 5*mm))

story.append(Paragraph("The Archetype: The Ultimate Digital Concierge", h2))
story.append(Paragraph(
    "Seek Wander occupies a singular position in the travel category: it is not a booking engine, "
    "not a review aggregator, and emphatically not a chatbot. It is a <b>digital concierge</b> — "
    "the invisible, impeccably-informed companion that curates a complete, opinionated luxury "
    "itinerary for a discerning traveller in under sixty seconds.",
    body
))
story.append(Paragraph(
    "The aesthetic reference point is deliberate and non-negotiable: <b>Vogue meets National "
    "Geographic.</b> The editorial authority of Cond&#233; Nast. The geographic authority of "
    "National Geographic. Combined into a product that looks and feels like it was designed by "
    "the art department of a luxury print magazine, not a Silicon Valley startup.",
    body
))
story.append(Spacer(1, 2*mm))
story.append(pull_quote(
    '"Affluent travellers do not want more options — they want fewer, better ones. The anxiety '
    'of infinite choice is the enemy of the luxury experience. Seek Wander\'s entire value '
    'proposition is the confident, opinionated elimination of that anxiety."'
))
story.append(Spacer(1, 4*mm))

story.append(Paragraph("Target Demographics", h2))
story.append(std_table(
    [" Segment", " Profile", " Seek Wander Value"],
    [
        ["The Affluent Escapist",    "HHI $200k+, 35-55, 4-6 international trips/year, 5-star properties", "Eliminates planning overhead; validates instincts with editorial authority"],
        ["The Luxury Digital Nomad", "Location-independent, $80k-$150k, values experience over possessions", "Rapid destination research; shareable itineraries as social currency"],
        ["The Occasion Traveller",   "Anniversary, honeymoon, milestone — once-in-a-decade, budget unconstrained", "High emotional stakes demand trusted curation, not crowdsourced opinions"],
        ["The Corporate Traveller",  "Bleisure extension, 2-3 free days post-conference", "Fast, high-quality options with zero research burden"],
    ],
    [38*mm, 62*mm, USABLE_W - 100*mm]
))
story.append(Spacer(1, 4*mm))

story.append(Paragraph("Competitive Positioning", h2))
story.append(std_table(
    [" Competitor", " Their Category", " Seek Wander's Differentiation"],
    [
        ["TripAdvisor",          "Crowdsourced reviews",    "Editorial curation — one authoritative voice, not 10,000 conflicting ones"],
        ["Google Travel",        "Utility / search",        "Aesthetic + narrative — a dossier, not a search result"],
        ["ChatGPT",              "Raw AI output",           "Purpose-built luxury UI; enriched with live data; no prompt engineering required"],
        ["Airbnb Experiences",   "Booking platform",        "Zero commercial bias — recommendations curated, not paid placements"],
        ["Conde Nast Traveller", "Editorial media",         "Interactive and personalised — the magazine curates your trip, not a generic one"],
    ],
    [30*mm, 35*mm, USABLE_W - 65*mm]
))
story.append(Spacer(1, 4*mm))

story.append(Paragraph("The Brand Promise", h2))
story.append(pull_quote(
    '"Every journey, curated with the care of a private travel consultant '
    'who has been everywhere you want to go."'
))

story.append(PageBreak())

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 2 — VISUAL GUIDELINES
# ══════════════════════════════════════════════════════════════════════════════
story.append(section_header(2, "Visual Guidelines — The Million-Dollar UI/UX"))
story.append(Spacer(1, 5*mm))

story.append(Paragraph("Design Philosophy", h2))
story.append(Paragraph(
    "Every pixel of the Seek Wander interface must pass a single editorial test: "
    "<b>would this feel at home in a luxury print publication?</b> The reference documents "
    "are Kinfolk, Monocle, and Cond&#233; Nast Traveller — not app stores. The consequence "
    "is a set of non-negotiable design constraints that differentiate the product from every "
    "generic SaaS travel tool on the market.",
    body
))
story.append(Spacer(1, 4*mm))

story.append(Paragraph("Color Palette — Paper and Ink", h2))
story.append(Paragraph(
    "The palette is derived from the physical materials of luxury print: warm paper stock, "
    "carbon ink, and restrained accent colours that signal status without shouting.",
    body
))
story.append(Spacer(1, 3*mm))

# Colour swatches as a grid table
swatches = [
    ("#F5F0E8", "paper",          "Primary backgrounds — warm off-white, never pure white"),
    ("#EDE8DC", "paper-dark",     "Card surfaces, input backgrounds, subtle depth"),
    ("#0A0A0A", "ink",            "Primary text, borders, wordmark"),
    ("#6B6B6B", "ink-light",      "Secondary text, captions, metadata"),
    ("#059669", "emerald-accent", "Links, active states, OPEN status"),
    ("#C2410C", "burnt-orange",   "Primary CTAs, active tab indicator, CLOSED status"),
]

sw_rows = []
row_pair = []
for i, (hx, tok, use) in enumerate(swatches):
    sw = colour_swatch(hx, tok, use)
    row_pair.append(sw)
    if len(row_pair) == 3:
        sw_rows.append(row_pair)
        row_pair = []
if row_pair:
    while len(row_pair) < 3:
        row_pair.append(Spacer(1,1))
    sw_rows.append(row_pair)

sw_tbl = Table(sw_rows, colWidths=[USABLE_W/3]*3,
    style=TableStyle([
        ("TOPPADDING",    (0,0),(-1,-1), 3),
        ("BOTTOMPADDING", (0,0),(-1,-1), 3),
        ("LEFTPADDING",   (0,0),(-1,-1), 2),
        ("RIGHTPADDING",  (0,0),(-1,-1), 2),
        ("BOX",           (0,0),(-1,-1), 0.3, CODE_BD),
    ]))
story.append(sw_tbl)
story.append(Spacer(1, 4*mm))

story.append(note_box(
    "<b>Critical rules:</b> paper (#F5F0E8) is the default page background — never pure white. "
    "burnt-orange is reserved exclusively for primary actions — never decorative. "
    "No gradients, no drop shadows, no glassmorphism."
))
story.append(Spacer(1, 4*mm))

story.append(Paragraph("Typography", h2))
story.append(std_table(
    [" Role", " Font Family", " Usage Rules"],
    [
        ["Display headings", "Cormorant Garamond, serif", "Italic, massive scale (48-96px), tight leading (0.9-1.0), editorial opener text"],
        ["UI headings",       "Cormorant Garamond, serif", "H1-H3, bold or semi-bold, generous tracking"],
        ["Body & UI",         "DM Sans, sans-serif",       "All body copy, navigation, buttons, labels — never italic in UI"],
        ["Micro-copy",        "DM Sans, sans-serif",       "UPPERCASE, letter-spacing: 0.2em — category labels, nav items"],
    ],
    [32*mm, 40*mm, USABLE_W - 72*mm]
))
story.append(Spacer(1, 4*mm))

story.append(Paragraph("Component Rules — Non-Negotiable", h2))

rules = [
    ("<b>Shape:</b>", "border-radius: 0 on every component — buttons, cards, inputs, modals, images. No pill buttons, no rounded badges, no soft corners anywhere."),
    ("<b>Motion:</b>", "Framer Motion on all sections. Entrance: opacity 0 → 1, y 24 → 0, duration 0.6s easeOut. Stagger children at 0.1s. Tab transitions: y:8 in / y:-8 out, duration 0.35s."),
    ("<b>Photography:</b>", "All images grayscale by default (filter: grayscale(100%)). Transition to full colour on hover over 700ms. This is the editorial magazine reveal effect."),
    ("<b>Spacing:</b>", "Generous whitespace is mandatory. Section padding minimum py-24 (96px vertical). Never compress layouts — cut content instead."),
    ("<b>Borders:</b>", "Hairline only: border border-black/5 or border-b border-ink/20. No box shadows. Dividers at border-ink/10."),
    ("<b>Copy rule:</b>", "Never use 'AI' anywhere in UI, page titles, metadata, or marketing. The product is positioned around the outcome, never the technology."),
]
for label, text in rules:
    story.append(KeepTogether([
        Paragraph(f"{label} {text}", bullet_s),
    ]))

story.append(PageBreak())

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 3 — TONE & VOICE
# ══════════════════════════════════════════════════════════════════════════════
story.append(section_header(3, "Tone & Voice — Copywriting Lexicon"))
story.append(Spacer(1, 5*mm))

story.append(Paragraph("The Voice: Understated Confidence", h2))
story.append(Paragraph(
    "Seek Wander speaks the way a world-travelled private member's club concierge speaks "
    "to a returning guest: with authority, warmth, and zero filler. It does not exclaim. "
    "It does not beg. It does not use power words borrowed from SaaS growth marketing.",
    body
))
story.append(pull_quote('"The three-word brief: Confident. Understated. Specific."'))
story.append(Spacer(1, 3*mm))

story.append(Paragraph("Core Voice Principles", h2))
voice_principles = [
    ("Specificity over superlatives", "Never say \"the best restaurants.\" Say \"a kaiseki counter with a six-month waitlist.\" Specificity signals insider knowledge. Superlatives signal a generic listicle."),
    ("Declarative over interrogative", "Never ask the user what they want — the product already knows. Avoid \"What kind of trip are you looking for?\" Replace with \"Tell us your destination. We'll handle the rest.\""),
    ("Restraint over enthusiasm",      "Excitement is vulgar at the luxury price point. Replace \"You're going to love this!\" with silence — let the quality of the itinerary speak for itself."),
    ("Editorial authority",            "Write every line as if it appeared in a Conde Nast publication. Every recommendation is considered. Every word is chosen. Nothing is filler."),
]
for title, desc in voice_principles:
    story.append(KeepTogether([
        Paragraph(f"<b>{title}</b>", h3),
        Paragraph(desc, body),
    ]))

story.append(Spacer(1, 4*mm))
story.append(Paragraph("Use This / Not That — Copywriting Lexicon", h2))
story.append(std_table(
    [" Use This", " Not That", " Reason"],
    [
        ["Curation",          "Generation / Creation",     "Generation signals AI machinery; Curation signals editorial judgment"],
        ["Journey",           "Trip / Vacation",           "Journey implies significance and intentionality"],
        ["Itinerary",         "Plan / Schedule",           "Itinerary is luxury travel vocabulary; plan is logistics vocabulary"],
        ["Complimentary",     "Free",                      "Free is a discount word; complimentary is a hospitality word"],
        ["Dossier",           "Document / PDF",            "A dossier is what a private concierge or intelligence firm prepares"],
        ["Curated by Seek Wander", "Generated by AI",     "Never mention the technology; only the outcome"],
        ["Your concierge",    "The app / The tool",        "Anthropomorphise the service; dehumanise the technology"],
        ["Discover",          "Find / Search",             "Discover implies revelation; find implies a search engine"],
        ["Tailored",          "Personalised / Custom",     "Personalised is SaaS; tailored is Savile Row"],
        ["We recommend",      "You might like / Suggested","Authority over suggestion"],
        ["Archive this journey","Save trip",               "Archive implies permanence and value; save implies a utility action"],
        ["Share your dossier","Share your itinerary",      "Dossier elevates the object being shared"],
    ],
    [32*mm, 32*mm, USABLE_W - 64*mm]
))
story.append(Spacer(1, 4*mm))

story.append(Paragraph("Sample Copy by Context", h2))
samples = [
    ("Landing page hero:",     '"The journeys you deserve, curated."',                                                   "Not: AI-powered travel planning for everyone."),
    ("Empty state (/trips):",  '"Your journeys begin here. Every itinerary your concierge curates is archived here."',   "Not: You have no saved trips yet."),
    ("Save button:",           '"Archive this journey"',                                                                  "Not: Save trip"),
    ("Error state:",           '"Your concierge encountered an unexpected interruption. Please try again."',              "Not: Something went wrong."),
]
for ctx, use, avoid in samples:
    story.append(KeepTogether([
        Paragraph(f"<b>{ctx}</b>", h3),
        Paragraph(f"<i>{use}</i>", ParagraphStyle("ex", fontSize=9, leading=13, fontName="Helvetica-Oblique", textColor=BURNT_OG, leftIndent=8, spaceAfter=2)),
        Paragraph(f"<font color='#6B6B6B'>{avoid}</font>", ParagraphStyle("av", fontSize=8, leading=12, fontName="Helvetica", textColor=INK_LIGHT, leftIndent=8, spaceAfter=6)),
    ]))

story.append(PageBreak())

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 4 — ZERO-CAC ACQUISITION
# ══════════════════════════════════════════════════════════════════════════════
story.append(section_header(4, "Zero-CAC Acquisition Engine"))
story.append(Spacer(1, 5*mm))
story.append(Paragraph(
    "The Seek Wander growth model is built on a single principle: every piece of infrastructure "
    "we build should also be a distribution channel. The application generates the marketing "
    "content. The database drives the SEO. The AI writes the social copy. Customer acquisition "
    "cost approaches zero as the system matures.",
    body
))
story.append(Spacer(1, 3*mm))

story.append(Paragraph("Channel 1 — Programmatic SEO", h2))
story.append(Paragraph(
    "Static Next.js pages generated for high-intent luxury travel search queries, sourced "
    "directly from the PlaceCache table — every destination ever generated becomes a "
    "candidate landing page automatically.",
    body
))
story.append(code_block([
    "URL structure:",
    "  /destinations/[slug]",
    "  /destinations/amalfi-coast-luxury-itinerary",
    "  /destinations/kyoto-3-day-luxury-guide",
    "  /destinations/maldives-overwater-villa-itinerary",
    "",
    "Next.js implementation:",
    "  generateStaticParams() reads PlaceCache → builds static pages at deploy time",
    "  Each page: editorial hero (Google Places photo) + Claude-generated editorial",
    "             + 1-day sample timeline + single CTA: 'Curate Your Complete Journey'",
    "",
    "SEO target keywords:",
    "  '[destination] luxury itinerary'",
    "  '[destination] 3-day luxury travel guide'",
    "  '[destination] private concierge itinerary'",
]))
story.append(note_box(
    "<b>Compounding moat:</b> As PlaceCache grows with every generation, indexable destination "
    "pages grow automatically. By month 12, the site could have 500+ indexed luxury travel "
    "landing pages with zero additional editorial effort."
))
story.append(Spacer(1, 4*mm))

story.append(Paragraph("Channel 2 — Automated Social Content Engine (n8n)", h2))
story.append(Paragraph(
    "n8n cloud instance triggered daily via Vercel Cron (GET /api/cron/social, 09:00 UTC). "
    "Queries the most-generated destination, generates an editorial caption via Claude, "
    "and posts to Pinterest and Twitter/X.",
    body
))
story.append(code_block([
    "n8n Workflow — Daily Social Post:",
    "",
    "Step 1: Vercel Cron → POST /api/cron/social (SOCIAL_CRON_SECRET header)",
    "Step 2: Webhook node receives trigger",
    "Step 3: Supabase Query — top destination last 7 days",
    "          SELECT destination, COUNT(*) FROM CostLog",
    "          WHERE createdAt > NOW() - INTERVAL '7 days'",
    "          GROUP BY destination ORDER BY COUNT DESC LIMIT 1",
    "Step 4: Anthropic node — generate editorial caption (240 chars, Vogue tone, no hashtags)",
    "Step 5: POST → Pinterest Boards API (PlaceCache photo + destination slug URL)",
    "Step 6: POST → Twitter/X API v2 (caption + /destinations/[slug] link)",
    "Step 7: Error handler → Slack alert on failure",
    "",
    "Sample output caption:",
    "  'Three days in Kyoto, and you haven't seen the real city yet.",
    "   The tourists leave Fushimi Inari by noon. That's when it becomes yours.'",
]))
story.append(note_box(
    "<b>Pinterest strategy:</b> Pinterest has a 4-6 month content decay curve — a pin posted "
    "today continues driving traffic for half a year. Luxury travel is Pinterest's second-largest "
    "category. A single viral pin can drive 50,000+ monthly impressions at zero marginal cost."
))
story.append(Spacer(1, 4*mm))

story.append(Paragraph("Channel 3 — Referral via Shared Dossiers", h2))
story.append(Paragraph(
    "Every /shared/[id] page is a public, SEO-indexable URL with full OG metadata. "
    "Every user share creates a branded acquisition touchpoint. The recipient lands on a "
    "Seek Wander page with: acquisition CTA banner, mobile sticky burnt-orange CTA button, "
    "and the full itinerary as social proof of the product quality.",
    body
))

story.append(PageBreak())

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 5 — USER LIFECYCLE
# ══════════════════════════════════════════════════════════════════════════════
story.append(section_header(5, "User Lifecycle & White-Glove Retention"))
story.append(Spacer(1, 5*mm))

story.append(Paragraph("The Onboarding Philosophy", h2))
story.append(Paragraph(
    "The first 10 minutes after sign-up are the highest-leverage retention window in the "
    "entire user lifecycle. Most SaaS products waste this window with an automated HTML "
    "email template featuring a logo, three feature bullets, and a 'Get Started' button "
    "that nobody clicks. Seek Wander's onboarding is built around a single, radical "
    "constraint: <b>it must feel like a human sent it.</b>",
    body
))
story.append(Spacer(1, 3*mm))

story.append(Paragraph("The Automated Founder's Welcome", h2))
story.append(Paragraph(
    "<b>Trigger:</b> Clerk user.created webhook → POST /api/webhooks/clerk → "
    "verified via svix → n8n webhook with user email and first_name.",
    body
))
story.append(code_block([
    "n8n Workflow — Founder's Welcome:",
    "",
    "Step 1: Webhook receives { email, firstName, userId }",
    "Step 2: Wait node — 10 minutes",
    "          (User has had time to generate their first itinerary)",
    "Step 3: Supabase Query — check if user has generated >= 1 trip",
    "          If yes: personalise copy with destination name",
    "          If no:  use generic welcome variant",
    "Step 4: Send Email via Resend",
    "          From:    roman@seekwander.com",
    "          Reply-To: roman@seekwander.com",
    "          Subject: Your first journey",
    "          Format:  Plain text ONLY — no HTML, no logo, no unsubscribe footer",
]))
story.append(Spacer(1, 3*mm))
story.append(Paragraph("Email copy (destination-aware variant):", h3))
story.append(code_block([
    "Hi [firstName],",
    "",
    "I wanted to reach out personally. You just curated your first journey",
    "to [destination] with Seek Wander, and I'm genuinely grateful you gave",
    "it a try.",
    "",
    "Seek Wander isn't a search engine. Every itinerary is considered with",
    "the same care a private travel consultant gives a long-standing client.",
    "Hidden restaurants. The museum room nobody queues for. The hotel that",
    "doesn't advertise.",
    "",
    "If you have feedback, a dream destination, or just want to tell me what",
    "we got right or wrong — reply here. I read every email.",
    "",
    "Warmly,",
    "Roman",
    "Founder, Seek Wander",
]))
story.append(note_box(
    "<b>Why plain text:</b> HTML emails are immediately recognisable as automated. "
    "A plain-text email from roman@seekwander.com with no logo, no CTA button, and "
    "no unsubscribe footer reads as a personal message from a founder. "
    "Open rates for this format consistently reach 60-80% versus 20-25% for HTML equivalents."
))
story.append(Spacer(1, 4*mm))

story.append(Paragraph("Retention Touchpoints", h2))
story.append(std_table(
    [" Touchpoint", " Trigger", " Channel", " Goal"],
    [
        ["Founder's Welcome",    "Sign-up + 10 min",    "Email (plain text)",     "Establish personal relationship with founder"],
        ["Journey Archived",     "Trip saved",          "In-app toast",           "Reinforce value of the save action"],
        ["Share Prompt",         "After generation",    "In-app modal",           "Viral referral loop via shared dossier"],
        ["Programmatic SEO",     "Organic search",      "Web / Google",           "Top-of-funnel re-acquisition"],
        ["Social Pin",           "Daily cron (09:00)",  "Pinterest / Twitter",    "Brand awareness + SEO backlinks"],
    ],
    [35*mm, 32*mm, 25*mm, USABLE_W - 92*mm]
))

story.append(PageBreak())

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 6 — MONETIZATION AESTHETICS
# ══════════════════════════════════════════════════════════════════════════════
story.append(section_header(6, "Monetization Aesthetics"))
story.append(Spacer(1, 5*mm))

story.append(Paragraph("The Inviolable Rule: No Display Advertising", h2))
story.append(Paragraph(
    "Seek Wander will never run display advertising. Banner ads, sponsored content labels, "
    "affiliate badges, 'Ad' markers, and interstitials are categorically incompatible with "
    "the luxury brand positioning.",
    body
))
story.append(pull_quote(
    '"The moment a user sees a banner ad on Seek Wander, the brand becomes indistinguishable '
    'from TripAdvisor. The trust that justifies acting on a Seek Wander recommendation — '
    'which is the entire monetization thesis — is instantly destroyed. '
    'All revenue must be invisible at the point of experience."'
))
story.append(Spacer(1, 4*mm))

story.append(Paragraph("Revenue Stream 1 — Native Affiliate Placements", h2))
story.append(Paragraph(
    "<b>The concierge model:</b> A luxury hotel concierge who books a restaurant for a guest "
    "receives a referral fee. The guest never sees the transaction. The recommendation is "
    "trusted because it is excellent — the fee is irrelevant to its quality. "
    "This is the exact model Seek Wander applies.",
    body
))
story.append(Spacer(1, 2*mm))
story.append(Paragraph("In-UI rendering (TimelineCard):", h3))
story.append(code_block([
    "[TimelineCard — Le Bernardin, New York]",
    "",
    "  Michelin three-star French cuisine...          <- AI-generated description",
    "  DINNER  |  $$$$  |  Reservation recommended   <- metadata badges",
    "  Reserve a table ->                             <- affiliate link (OpenTable)",
    "                                                    DM Sans 8pt, ink-light colour",
    "                                                    Indistinguishable from concierge copy",
]))
story.append(Spacer(1, 3*mm))
story.append(Paragraph("Affiliate partners and commission structure:", h3))
story.append(std_table(
    [" Partner", " Category", " Commission", " Est. Revenue per Booking"],
    [
        ["Booking.com",    "Hotels & accommodation",  "4-6% of booking value",  "$120-180 on a $3,000 night"],
        ["Viator",         "Tours & experiences",     "8% of booking value",    "$32-80 on a $400-1,000 tour"],
        ["GetYourGuide",   "Activities",              "8-10% of booking value", "$24-50 on a $300-500 activity"],
        ["OpenTable",      "Restaurant reservations", "$1-2 per seated cover",  "$2-8 per table of 2-4"],
    ],
    [30*mm, 35*mm, 30*mm, USABLE_W - 95*mm]
))
story.append(Spacer(1, 3*mm))
story.append(note_box(
    "<b>Revenue at scale:</b> At 1,000 monthly active users with a 15% hotel booking "
    "conversion rate and average booking value of $2,000, affiliate commissions represent "
    "$12,000-18,000 MRR with zero marginal cost per transaction."
))
story.append(Spacer(1, 4*mm))

story.append(Paragraph("Revenue Stream 2 — Stripe Paywall (Deprioritized)", h2))
story.append(Paragraph(
    "Status: Architecture complete, implementation deprioritized pending affiliate "
    "revenue validation. The affiliate model has higher lifetime value per user with "
    "zero conversion friction. A $4.99 gate reduces top-of-funnel conversion by an "
    "estimated 60-80% at the pre-brand-awareness stage.",
    body
))
story.append(Paragraph(
    "<b>UI approach when implemented:</b> Stripe Checkout triggered via a custom luxury "
    "modal — not a redirect. The modal uses paper background (#F5F0E8), Cormorant Garamond "
    "heading ('Unlock Your Journey'), and a single burnt-orange button. "
    "Designed to feel like a membership application, not a payment form.",
    body
))
story.append(Spacer(1, 4*mm))

story.append(Paragraph("Legal Disclosure Requirements", h2))
story.append(Paragraph(
    "All affiliate link placements must include a passive disclosure per FTC guidelines "
    "and affiliate programme terms of service:",
    body
))
for item in [
    "<b>Per-itinerary footer:</b> 'Seek Wander may earn a commission on bookings made through links in this itinerary. Our recommendations are never influenced by commercial relationships.'",
    "<b>Privacy Policy:</b> Must reference affiliate data collection (click tracking, booking attribution).",
    "<b>Terms of Service:</b> Must reference the nature of affiliate relationships and that recommendations are editorially independent.",
]:
    story.append(Paragraph(f"&bull; &nbsp; {item}", bullet_s))

story.append(Spacer(1, 6*mm))
story.append(hr(BURNT_OG, 1, 4, 6))
story.append(Paragraph(
    "This document defines the non-negotiable brand standards for Seek Wander. "
    "All product, marketing, and editorial decisions must be evaluated against "
    "the single test: does this belong in a luxury print publication? "
    "If not, it does not belong in Seek Wander.",
    ftr_s
))

# ── Build ──────────────────────────────────────────────────────────────────────
doc.build(story, onFirstPage=on_cover, onLaterPages=on_page)
print(f"PDF saved: {OUTPUT}")
import os
size = os.path.getsize(OUTPUT)
print(f"Size: {size:,} bytes ({size/1024:.1f} KB)")
