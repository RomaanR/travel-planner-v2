"""
Seek Wander — Roadmap & Backlog PDF Generator
Converts ROADMAP_AND_BACKLOG.md into a professional branded PDF.
"""

import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm, cm
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer,
    Table, TableStyle, KeepTogether, HRFlowable, Flowable, PageBreak,
    NextPageTemplate
)
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ── Brand Colours ──────────────────────────────────────────────────────────────
NAVY        = colors.HexColor("#0F1C2E")
GOLD        = colors.HexColor("#C2A060")
PAPER       = colors.HexColor("#F8F6F1")
WHITE       = colors.white
CODE_BG     = colors.HexColor("#F0EDE6")
CODE_BORDER = colors.HexColor("#D4CFC5")
INK         = colors.HexColor("#0A0A0A")
INK_LIGHT   = colors.HexColor("#6B6B6B")
AMBER       = colors.HexColor("#D97706")
RED_PRIORITY    = colors.HexColor("#DC2626")
ORANGE_PRIORITY = colors.HexColor("#EA580C")
YELLOW_PRIORITY = colors.HexColor("#CA8A04")
GREY_PRIORITY   = colors.HexColor("#6B7280")
GREEN_OK    = colors.HexColor("#059669")

PAGE_W, PAGE_H = A4
MARGIN_L = 2.0 * cm
MARGIN_R = 2.0 * cm
MARGIN_T = 2.8 * cm   # space for header bar
MARGIN_B = 2.2 * cm   # space for footer

# ── Styles ─────────────────────────────────────────────────────────────────────
styles = getSampleStyleSheet()

def make_style(name, **kw):
    s = ParagraphStyle(name, **kw)
    return s

S_BODY = make_style("SW_Body",
    fontName="Helvetica", fontSize=9.5, leading=14,
    textColor=INK, spaceAfter=4)

S_BODY_SMALL = make_style("SW_BodySmall",
    fontName="Helvetica", fontSize=8.5, leading=12,
    textColor=INK_LIGHT, spaceAfter=3)

S_BOLD = make_style("SW_Bold",
    fontName="Helvetica-Bold", fontSize=9.5, leading=14,
    textColor=INK, spaceAfter=4)

S_TASK_TITLE = make_style("SW_TaskTitle",
    fontName="Helvetica-Bold", fontSize=11, leading=15,
    textColor=NAVY, spaceAfter=6, spaceBefore=6)

S_PHASE_TITLE = make_style("SW_PhaseTitle",
    fontName="Helvetica-Bold", fontSize=13, leading=18,
    textColor=WHITE, spaceAfter=0)

S_PHASE_SUB = make_style("SW_PhaseSub",
    fontName="Helvetica", fontSize=9, leading=13,
    textColor=GOLD, spaceAfter=0)

S_CONTEXT_TITLE = make_style("SW_ContextTitle",
    fontName="Helvetica-Bold", fontSize=13, leading=18,
    textColor=NAVY, spaceAfter=8, spaceBefore=4)

S_CODE = make_style("SW_Code",
    fontName="Courier", fontSize=7.8, leading=11,
    textColor=INK, backColor=CODE_BG, spaceAfter=2,
    leftIndent=8, rightIndent=8)

S_BULLET = make_style("SW_Bullet",
    fontName="Helvetica", fontSize=9.5, leading=14,
    textColor=INK, leftIndent=16, firstLineIndent=-8,
    spaceAfter=2, bulletIndent=8)

S_BULLET_NESTED = make_style("SW_BulletNested",
    fontName="Helvetica", fontSize=9, leading=13,
    textColor=INK_LIGHT, leftIndent=28, firstLineIndent=-8,
    spaceAfter=2)

S_PRIORITY_NOTE = make_style("SW_PriorityNote",
    fontName="Helvetica-Oblique", fontSize=9, leading=13,
    textColor=AMBER, spaceAfter=6, spaceBefore=2)

S_WHY = make_style("SW_Why",
    fontName="Helvetica-Oblique", fontSize=9, leading=13,
    textColor=INK_LIGHT, spaceAfter=8, leftIndent=12,
    borderPad=6)

S_SECTION_LABEL = make_style("SW_SectionLabel",
    fontName="Helvetica-Bold", fontSize=8, leading=10,
    textColor=GOLD, spaceAfter=2, spaceBefore=10)

S_TOC_TITLE = make_style("SW_TOCTitle",
    fontName="Helvetica-Bold", fontSize=10, leading=14,
    textColor=NAVY, spaceAfter=2)

S_TOC_PAGE = make_style("SW_TOCPage",
    fontName="Helvetica", fontSize=9, leading=13,
    textColor=INK_LIGHT, spaceAfter=2, alignment=TA_RIGHT)

S_COVER_TITLE = make_style("SW_CoverTitle",
    fontName="Helvetica-Bold", fontSize=38, leading=44,
    textColor=WHITE, spaceAfter=8)

S_COVER_SUB = make_style("SW_CoverSub",
    fontName="Helvetica", fontSize=16, leading=22,
    textColor=GOLD, spaceAfter=16)

S_COVER_META = make_style("SW_CoverMeta",
    fontName="Helvetica", fontSize=9, leading=14,
    textColor=colors.HexColor("#8EA8C3"), spaceAfter=4)

S_COVER_STAMP = make_style("SW_CoverStamp",
    fontName="Helvetica-Bold", fontSize=10, leading=14,
    textColor=colors.HexColor("#F59E0B"), spaceAfter=4)

S_COVER_PIVOT = make_style("SW_CoverPivot",
    fontName="Helvetica-Bold", fontSize=9, leading=13,
    textColor=colors.HexColor("#FCD34D"), spaceAfter=2)

S_TABLE_HEADER = make_style("SW_TableHeader",
    fontName="Helvetica-Bold", fontSize=8.5, leading=12,
    textColor=WHITE, alignment=TA_CENTER)

S_TABLE_CELL = make_style("SW_TableCell",
    fontName="Helvetica", fontSize=8.5, leading=12,
    textColor=INK)

S_TABLE_CELL_BOLD = make_style("SW_TableCellBold",
    fontName="Helvetica-Bold", fontSize=8.5, leading=12,
    textColor=NAVY)

# ── Custom Flowables ────────────────────────────────────────────────────────────

class PhaseHeader(Flowable):
    """Full-width navy bar with gold phase number and white title."""
    def __init__(self, number, title, subtitle="", width=None):
        super().__init__()
        self.number = number
        self.title = title
        self.subtitle = subtitle
        self._width = width or (PAGE_W - MARGIN_L - MARGIN_R)
        self.height = 52

    def wrap(self, aW, aH):
        return self._width, self.height

    def draw(self):
        c = self.canv
        w = self._width
        h = self.height
        # Navy background
        c.setFillColor(NAVY)
        c.rect(0, 0, w, h, fill=1, stroke=0)
        # Gold left accent bar
        c.setFillColor(GOLD)
        c.rect(0, 0, 5, h, fill=1, stroke=0)
        # Gold phase number circle
        cx = 28
        cy = h / 2
        c.setFillColor(GOLD)
        c.circle(cx, cy, 16, fill=1, stroke=0)
        c.setFillColor(NAVY)
        c.setFont("Helvetica-Bold", 13)
        num_str = str(self.number)
        c.drawCentredString(cx, cy - 5, num_str)
        # White title
        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 13)
        c.drawString(56, h - 22, self.title)
        # Gold subtitle
        if self.subtitle:
            c.setFillColor(GOLD)
            c.setFont("Helvetica", 9)
            c.drawString(56, h - 36, self.subtitle)


class TaskBadge(Flowable):
    """Gold badge with task number + bold title on one line."""
    def __init__(self, task_id, title, width=None):
        super().__init__()
        self.task_id = task_id
        self.title = title
        self._width = width or (PAGE_W - MARGIN_L - MARGIN_R)
        self.height = 32

    def wrap(self, aW, aH):
        return self._width, self.height

    def draw(self):
        c = self.canv
        w = self._width
        h = self.height
        # Light paper background
        c.setFillColor(PAPER)
        c.rect(0, 0, w, h, fill=1, stroke=0)
        # Gold left bar
        c.setFillColor(GOLD)
        c.rect(0, 0, 3, h, fill=1, stroke=0)
        # Gold badge
        badge_w = 42
        c.setFillColor(GOLD)
        c.roundRect(10, 7, badge_w, 18, 3, fill=1, stroke=0)
        c.setFillColor(NAVY)
        c.setFont("Helvetica-Bold", 8)
        c.drawCentredString(10 + badge_w / 2, 12, self.task_id)
        # Navy task title
        c.setFillColor(NAVY)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(62, 10, self.title)


class CheckboxItem(Flowable):
    """Renders a checkbox [ ] item in body text."""
    def __init__(self, text, nested=False, width=None):
        super().__init__()
        self.text = text
        self.nested = nested
        self._width = width or (PAGE_W - MARGIN_L - MARGIN_R)
        self.height = 16

    def wrap(self, aW, aH):
        return self._width, self.height

    def draw(self):
        c = self.canv
        indent = 24 if not self.nested else 40
        box_x = indent
        box_y = 3
        # Draw checkbox
        c.setStrokeColor(INK_LIGHT)
        c.setLineWidth(0.8)
        c.rect(box_x, box_y, 8, 8, fill=0, stroke=1)
        # Text
        c.setFillColor(INK if not self.nested else INK_LIGHT)
        c.setFont("Helvetica", 9 if not self.nested else 8.5)
        c.drawString(box_x + 12, box_y + 1, self.text)


class GoldDivider(Flowable):
    """Thin gold horizontal rule."""
    def __init__(self, width=None):
        super().__init__()
        self._width = width or (PAGE_W - MARGIN_L - MARGIN_R)
        self.height = 1

    def wrap(self, aW, aH):
        return self._width, self.height

    def draw(self):
        c = self.canv
        c.setStrokeColor(GOLD)
        c.setLineWidth(0.5)
        c.line(0, 0, self._width, 0)


class CodeBlock(Flowable):
    """Renders a monospace code block with background."""
    def __init__(self, lines, width=None):
        super().__init__()
        self.lines = lines
        self._width = width or (PAGE_W - MARGIN_L - MARGIN_R)
        self.line_h = 11
        self.padding = 8
        self.height = self.line_h * len(lines) + self.padding * 2

    def wrap(self, aW, aH):
        return self._width, self.height

    def draw(self):
        c = self.canv
        w = self._width
        h = self.height
        # Background
        c.setFillColor(CODE_BG)
        c.rect(0, 0, w, h, fill=1, stroke=0)
        # Border
        c.setStrokeColor(CODE_BORDER)
        c.setLineWidth(0.5)
        c.rect(0, 0, w, h, fill=0, stroke=1)
        # Left accent
        c.setFillColor(GOLD)
        c.rect(0, 0, 2.5, h, fill=1, stroke=0)
        # Lines
        c.setFillColor(INK)
        c.setFont("Courier", 7.8)
        y = h - self.padding - 8
        for line in self.lines:
            # Truncate very long lines
            if len(line) > 100:
                line = line[:97] + "..."
            c.drawString(self.padding + 4, y, line)
            y -= self.line_h


class PriorityDot(Flowable):
    """Coloured priority indicator dot with label."""
    COLORS = {
        "IMMEDIATE": RED_PRIORITY,
        "HIGH": ORANGE_PRIORITY,
        "MEDIUM": YELLOW_PRIORITY,
        "LOW": GREY_PRIORITY,
    }

    def __init__(self, label):
        super().__init__()
        self.label = label
        self.height = 14
        self._width = 80

    def wrap(self, aW, aH):
        return self._width, self.height

    def draw(self):
        c = self.canv
        col = self.COLORS.get(self.label, GREY_PRIORITY)
        c.setFillColor(col)
        c.circle(5, 5, 5, fill=1, stroke=0)
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(14, 2, self.label)


# ── Page Templates ─────────────────────────────────────────────────────────────

def draw_header_footer(canvas_obj, doc):
    """Header bar + footer on every non-cover page."""
    canvas_obj.saveState()
    w = PAGE_W
    # Header bar
    canvas_obj.setFillColor(NAVY)
    canvas_obj.rect(0, PAGE_H - 18 * mm, w, 12 * mm, fill=1, stroke=0)
    canvas_obj.setFillColor(WHITE)
    canvas_obj.setFont("Helvetica-Bold", 9)
    canvas_obj.drawString(MARGIN_L, PAGE_H - 18 * mm + 3.5 * mm, "SEEK WANDER")
    canvas_obj.setFont("Helvetica", 8)
    canvas_obj.setFillColor(GOLD)
    canvas_obj.drawRightString(w - MARGIN_R, PAGE_H - 18 * mm + 3.5 * mm, "CONFIDENTIAL")
    # Footer
    canvas_obj.setStrokeColor(GOLD)
    canvas_obj.setLineWidth(0.4)
    canvas_obj.line(MARGIN_L, 16 * mm, w - MARGIN_R, 16 * mm)
    canvas_obj.setFillColor(INK_LIGHT)
    canvas_obj.setFont("Helvetica", 7.5)
    canvas_obj.drawString(MARGIN_L, 11 * mm, "Seek Wander — Implementation Roadmap & Backlog | Confidential — ZenithAI Data Room")
    canvas_obj.setFont("Helvetica-Bold", 8)
    canvas_obj.setFillColor(NAVY)
    canvas_obj.drawRightString(w - MARGIN_R, 11 * mm, f"Page {doc.page}")
    canvas_obj.restoreState()


def draw_cover_background(canvas_obj, doc):
    """Full navy cover page background."""
    canvas_obj.saveState()
    canvas_obj.setFillColor(NAVY)
    canvas_obj.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    canvas_obj.restoreState()


# ── Build Cover Page ───────────────────────────────────────────────────────────

def build_cover():
    """Returns a list of flowables for the cover page."""
    story = []
    # Vertical spacer to push content down
    story.append(Spacer(1, 4.5 * cm))

    # Gold accent bar visual — rendered via a custom flowable
    class CoverAccentBar(Flowable):
        def __init__(self):
            super().__init__()
            self.height = 6
            self._width = PAGE_W - MARGIN_L - MARGIN_R

        def wrap(self, aW, aH):
            return self._width, self.height

        def draw(self):
            c = self.canv
            c.setFillColor(GOLD)
            c.rect(0, 0, 60, self.height, fill=1, stroke=0)
            c.setFillColor(colors.HexColor("#1E3A5F"))
            c.rect(64, 0, self._width - 64, self.height, fill=1, stroke=0)

    story.append(CoverAccentBar())
    story.append(Spacer(1, 1.2 * cm))

    story.append(Paragraph("Seek Wander", S_COVER_TITLE))
    story.append(Paragraph("Implementation Roadmap &amp; Backlog", S_COVER_SUB))
    story.append(Spacer(1, 0.8 * cm))

    story.append(Paragraph("Engineering &amp; Business Execution Plan", S_COVER_META))
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph("Classification: Confidential — ZenithAI Data Room", S_COVER_STAMP))
    story.append(Paragraph("Document Version: 1.0", S_COVER_META))
    story.append(Paragraph("Last Updated: March 2026", S_COVER_META))
    story.append(Spacer(1, 1.5 * cm))

    # Strategy pivot notice
    class PivotBox(Flowable):
        def __init__(self):
            super().__init__()
            self.height = 64
            self._width = PAGE_W - MARGIN_L - MARGIN_R

        def wrap(self, aW, aH):
            return self._width, self.height

        def draw(self):
            c = self.canv
            w = self._width
            h = self.height
            c.setFillColor(colors.HexColor("#1A2F47"))
            c.rect(0, 0, w, h, fill=1, stroke=0)
            c.setStrokeColor(colors.HexColor("#D97706"))
            c.setLineWidth(1)
            c.rect(0, 0, w, h, fill=0, stroke=1)
            c.setFillColor(colors.HexColor("#F59E0B"))
            c.setFont("Helvetica-Bold", 8)
            c.drawString(12, h - 18, "STRATEGY STATUS: ACTIVE")
            c.setFillColor(colors.HexColor("#FCD34D"))
            c.setFont("Helvetica-Bold", 10)
            c.drawString(12, h - 34, "Native Affiliate Pivot")
            c.setFillColor(colors.HexColor("#CBD5E1"))
            c.setFont("Helvetica", 8.5)
            c.drawString(12, h - 50, "Primary monetization strategy pivoted from Stripe paywall to native affiliate")
            c.drawString(12, h - 62, "placements. Free product, backend revenue capture on booking events.")

    story.append(PivotBox())
    story.append(Spacer(1, 2.0 * cm))

    # Bottom line
    class BottomLine(Flowable):
        def __init__(self):
            super().__init__()
            self.height = 2
            self._width = PAGE_W - MARGIN_L - MARGIN_R

        def wrap(self, aW, aH):
            return self._width, self.height

        def draw(self):
            c = self.canv
            c.setFillColor(GOLD)
            c.rect(0, 0, self._width, 2, fill=1, stroke=0)

    story.append(BottomLine())

    return story


# ── Build Strategic Context ─────────────────────────────────────────────────────

def build_strategic_context():
    story = []
    story.append(Spacer(1, 0.4 * cm))
    story.append(Paragraph("Strategic Context", S_CONTEXT_TITLE))
    story.append(GoldDivider())
    story.append(Spacer(1, 0.3 * cm))

    body1 = (
        "Seek Wander is pivoting its primary monetization strategy from a hard Stripe paywall to "
        "<b>Native Affiliate Placements</b> — invisible, frictionless monetization embedded directly "
        "into the luxury itinerary experience."
    )
    story.append(Paragraph(body1, S_BODY))
    story.append(Spacer(1, 0.2 * cm))

    body2 = (
        "<b>The thesis:</b> Every hotel, restaurant, and tour the AI recommends is a monetizable booking "
        "event. By keeping the product completely free at the point of use, we eliminate conversion friction "
        "and maximize top-of-funnel growth. Revenue is captured on the backend when users book the $3,000 "
        "hotel or $400 Viator tour that our AI recommended. This is the exact playbook that made NerdWallet, "
        "TripAdvisor, and Booking Holdings into category-defining businesses."
    )
    story.append(Paragraph(body2, S_BODY))
    story.append(Spacer(1, 0.3 * cm))

    story.append(Paragraph("<b>Strategic priority order:</b>", S_BOLD))

    priorities = [
        ("1", "Infrastructure stability", "protect margins, prevent abuse"),
        ("2", "UX polish", "maximize retention"),
        ("3", "Native affiliate monetization", "primary revenue engine"),
        ("4", "Zero-CAC growth automation", "n8n flywheel"),
        ("5", "Legal &amp; compliance", "affiliate program approvals"),
        ("6", "Stripe paywall", "deprioritized — optionality, not urgency"),
    ]

    for num, title, note in priorities:
        story.append(Paragraph(
            f"<b>{num}.</b> {title} <font color='#6B6B6B'>({note})</font>",
            S_BULLET))

    story.append(Spacer(1, 0.4 * cm))
    return story


# ── Phase Builder ───────────────────────────────────────────────────────────────

def phase_section(number, title, subtitle, priority_label, priority_text, tasks):
    """
    tasks: list of task dicts with keys:
      id, title, checkboxes, impl_title, impl_code, why, sub_tables
    """
    story = []
    story.append(Spacer(1, 0.5 * cm))
    story.append(PhaseHeader(number, title, subtitle))
    story.append(Spacer(1, 0.2 * cm))

    # Priority callout
    class PriorityBar(Flowable):
        def __init__(self, label, text):
            super().__init__()
            self.label = label
            self.text = text
            self._width = PAGE_W - MARGIN_L - MARGIN_R
            self.height = 22

        def wrap(self, aW, aH):
            return self._width, self.height

        def draw(self):
            c = self.canv
            col_map = {
                "IMMEDIATE": RED_PRIORITY, "HIGH": ORANGE_PRIORITY,
                "MEDIUM": YELLOW_PRIORITY, "LOW": GREY_PRIORITY
            }
            col = col_map.get(self.label, GREY_PRIORITY)
            c.setFillColor(colors.HexColor("#FFF8F0"))
            c.rect(0, 0, self._width, self.height, fill=1, stroke=0)
            c.setFillColor(col)
            c.circle(9, 11, 6, fill=1, stroke=0)
            c.setFillColor(col)
            c.setFont("Helvetica-Bold", 8)
            c.drawString(20, 8, f"[{self.label}]")
            c.setFillColor(INK_LIGHT)
            c.setFont("Helvetica-Oblique", 8.5)
            c.drawString(20 + len(self.label) * 5.5 + 10, 8, self.text)

    story.append(PriorityBar(priority_label, priority_text))
    story.append(Spacer(1, 0.35 * cm))

    for task in tasks:
        story.append(TaskBadge(task["id"], task["title"]))
        story.append(Spacer(1, 0.15 * cm))

        for cb in task.get("checkboxes", []):
            if isinstance(cb, tuple):
                text, nested = cb
                story.append(Paragraph(
                    ("&nbsp;&nbsp;&nbsp;&nbsp;- " if nested else "- ") + text,
                    S_BULLET_NESTED if nested else S_BULLET))
            else:
                story.append(Paragraph("- " + cb, S_BULLET))

        if task.get("impl_title") and task.get("impl_code"):
            story.append(Spacer(1, 0.15 * cm))
            story.append(Paragraph(task["impl_title"], S_SECTION_LABEL))
            story.append(CodeBlock(task["impl_code"]))
            story.append(Spacer(1, 0.1 * cm))

        if task.get("sub_tables"):
            for tbl_data, col_widths in task["sub_tables"]:
                story.append(Spacer(1, 0.15 * cm))
                story.append(build_table(tbl_data, col_widths))

        if task.get("why"):
            story.append(Spacer(1, 0.15 * cm))
            story.append(Paragraph(f"<i>{task['why']}</i>", S_WHY))

        story.append(Spacer(1, 0.3 * cm))
        story.append(GoldDivider())
        story.append(Spacer(1, 0.2 * cm))

    return story


def build_table(data, col_widths=None):
    """Build a styled table with NAVY headers."""
    table = Table(data, colWidths=col_widths, repeatRows=1)
    num_rows = len(data)
    cmds = [
        # Header row
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 8.5),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, 0), 6),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
        # Body rows
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 8.5),
        ("TEXTCOLOR", (0, 1), (-1, -1), INK),
        ("TOPPADDING", (0, 1), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        # Grid
        ("GRID", (0, 0), (-1, -1), 0.4, CODE_BORDER),
        ("LINEBELOW", (0, 0), (-1, 0), 1.5, GOLD),
    ]
    # Zebra rows — only add for rows that exist
    for i in range(1, num_rows):
        if i % 2 == 1:
            cmds.append(("BACKGROUND", (0, i), (-1, i), PAPER))
    style = TableStyle(cmds)
    table.setStyle(style)
    return table


# ── Backlog Summary Table ───────────────────────────────────────────────────────

def build_backlog_summary():
    story = []
    story.append(Spacer(1, 0.5 * cm))
    story.append(PhaseHeader("", "Backlog Summary", "All tasks, priorities, and current status"))
    story.append(Spacer(1, 0.4 * cm))

    headers = ["#", "Task", "Phase", "Priority", "Status"]
    col_widths = [1.2*cm, 6.5*cm, 3.5*cm, 3.0*cm, 2.8*cm]

    rows = [
        ["1.1", "Upstash Redis Rate Limiting",    "Infrastructure", "[IMMEDIATE]", "Pending"],
        ["1.2", "AI JSON Error Handling",          "Infrastructure", "[IMMEDIATE]", "Pending"],
        ["2.1", "Empty State UX (/trips)",         "UX Polish",      "[HIGH]",      "Pending"],
        ["3.1", "Affiliate Link Injection",        "Monetization",   "[HIGH]",      "Pending"],
        ["4.1", "Automated Social Engine (n8n)",   "Growth",         "[MEDIUM]",    "Pending"],
        ["4.2", "Founder's Welcome Email (n8n)",   "Growth",         "[MEDIUM]",    "Pending"],
        ["5.1", "Terms of Service & Privacy",      "Legal",          "[MEDIUM]",    "Pending"],
        ["6.1", "Stripe Paywall ($4.99)",          "Monetization",   "[LOW]",       "Pending"],
    ]

    PRIORITY_COLORS = {
        "[IMMEDIATE]": RED_PRIORITY,
        "[HIGH]":      ORANGE_PRIORITY,
        "[MEDIUM]":    YELLOW_PRIORITY,
        "[LOW]":       GREY_PRIORITY,
    }

    table_data = [headers] + rows
    table = Table(table_data, colWidths=col_widths, repeatRows=1)

    ts = TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 8.5),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 8.5),
        ("TEXTCOLOR", (0, 1), (-1, -1), INK),
        ("GRID", (0, 0), (-1, -1), 0.4, CODE_BORDER),
        ("LINEBELOW", (0, 0), (-1, 0), 1.5, GOLD),
        ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),
        ("TEXTCOLOR", (0, 1), (0, -1), GOLD),
    ])

    # Zebra
    for i in range(1, len(table_data)):
        if i % 2 == 0:
            ts.add("BACKGROUND", (0, i), (-1, i), PAPER)

    # Priority colour coding
    for i, row in enumerate(rows, start=1):
        priority = row[3]
        col = PRIORITY_COLORS.get(priority, GREY_PRIORITY)
        ts.add("TEXTCOLOR", (3, i), (3, i), col)
        ts.add("FONTNAME", (3, i), (3, i), "Helvetica-Bold")

    table.setStyle(ts)
    story.append(table)
    story.append(Spacer(1, 0.6 * cm))

    # Legend
    story.append(Paragraph("Priority Legend", S_SECTION_LABEL))

    legend_data = [
        ["Label", "Meaning", "Action Required"],
        ["[IMMEDIATE]", "Critical infrastructure gap — deploy before growth", "This sprint"],
        ["[HIGH]",      "Revenue-impacting or retention-critical",             "Next sprint"],
        ["[MEDIUM]",    "Important but not blocking revenue",                   "This quarter"],
        ["[LOW]",       "Optionality — deprioritized",                         "Backlog"],
    ]
    legend_col_widths = [3.0*cm, 8.0*cm, 4.0*cm]
    story.append(build_table(legend_data, legend_col_widths))
    story.append(Spacer(1, 0.5 * cm))

    # Closing note
    story.append(GoldDivider())
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph(
        "<i>This document is a living backlog. Update task statuses and add sub-tasks as "
        "implementation progresses. Sync with CLAUDE.md when any item reaches production.</i>",
        S_BODY_SMALL))

    return story


# ── Main Build Function ─────────────────────────────────────────────────────────

def build_pdf(output_path):
    doc = BaseDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=MARGIN_L,
        rightMargin=MARGIN_R,
        topMargin=MARGIN_T,
        bottomMargin=MARGIN_B,
        title="Seek Wander — Implementation Roadmap & Backlog",
        author="Seek Wander",
        subject="Engineering & Business Execution Plan",
    )

    # Cover frame (no header/footer)
    cover_frame = Frame(
        MARGIN_L, MARGIN_B,
        PAGE_W - MARGIN_L - MARGIN_R,
        PAGE_H - MARGIN_B - 0.5 * cm,
        id="cover_frame"
    )

    # Content frame (with header/footer)
    content_frame = Frame(
        MARGIN_L, MARGIN_B,
        PAGE_W - MARGIN_L - MARGIN_R,
        PAGE_H - MARGIN_T - MARGIN_B,
        id="content_frame"
    )

    cover_template = PageTemplate(
        id="Cover",
        frames=[cover_frame],
        onPage=draw_cover_background
    )
    content_template = PageTemplate(
        id="Content",
        frames=[content_frame],
        onPage=draw_header_footer
    )

    doc.addPageTemplates([cover_template, content_template])

    story = []

    # ── Cover ──
    story.extend(build_cover())
    story.append(PageBreak())

    # Switch to content template
    story.append(NextPageTemplate("Content"))

    # ── Strategic Context ──
    story.extend(build_strategic_context())
    story.append(PageBreak())

    # ── Phase 1: Security & Infrastructure ──
    phase1_tasks = [
        {
            "id": "1.1",
            "title": "Upstash Redis Rate Limiting",
            "checkboxes": [
                "Install @upstash/ratelimit and @upstash/redis packages",
                "Create Upstash Redis database at console.upstash.com — copy REST URL + token to env vars",
                "Implement sliding-window rate limiter in src/app/api/itinerary/route.ts:",
                ("Authenticated users: 5 generations / hour keyed by Clerk userId", True),
                ("Unauthenticated users: 2 generations / hour keyed by IP address (x-forwarded-for)", True),
                "Return 429 Too Many Requests with Retry-After header on limit breach",
                "Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to Vercel environment variables",
            ],
            "impl_title": "TECHNICAL IMPLEMENTATION",
            "impl_code": [
                "// src/app/api/itinerary/route.ts",
                'import { Ratelimit } from "@upstash/ratelimit";',
                'import { Redis } from "@upstash/redis";',
                "",
                "const ratelimit = new Ratelimit({",
                "  redis: Redis.fromEnv(),",
                '  limiter: Ratelimit.slidingWindow(5, "1 h"),',
                "  analytics: true,",
                "});",
                "",
                'const identifier = userId ?? request.headers.get("x-forwarded-for") ?? "anonymous";',
                "const { success, reset } = await ratelimit.limit(identifier);",
                "if (!success) {",
                '  return Response.json({ error: "Rate limit exceeded" }, {',
                "    status: 429,",
                '    headers: { "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)) }',
                "  });",
                "}",
            ],
            "why": "Why this matters: Without rate limiting, a single malicious actor can drain $50+ of Anthropic credits "
                   "in minutes. This is the most critical infrastructure gap before any marketing or growth activity.",
        },
        {
            "id": "1.2",
            "title": "AI JSON Error Handling (Retry + Fix Prompt)",
            "checkboxes": [
                "Wrap JSON.parse(aiResponse) in a try/catch inside src/app/api/itinerary/route.ts",
                "On parse failure, trigger a secondary 'fix' prompt to Claude:",
                ("Pass the malformed output back to the model", True),
                ("Instruct it to return only the corrected, valid JSON", True),
                "If the fix prompt also fails, return a user-friendly 503 error (never expose raw AI output)",
                "Log both failures to server console with destination + token counts for monitoring",
            ],
            "impl_title": "TECHNICAL IMPLEMENTATION",
            "impl_code": [
                "let itinerary: ItineraryResponse;",
                "try {",
                "  itinerary = JSON.parse(rawContent);",
                "} catch {",
                "  // Secondary 'fix' prompt",
                "  const fixResponse = await client.messages.create({",
                '    model: "claude-sonnet-4-6",',
                "    max_tokens: 8192,",
                '    system: "You are a JSON repair tool. Return only valid JSON, nothing else.",',
                "    messages: [{ role: \"user\", content: `Fix this malformed JSON:\\n\\n${rawContent}` }]",
                "  });",
                "  try {",
                "    itinerary = JSON.parse(fixResponse.content[0].text);",
                "  } catch {",
                '    return Response.json({ error: "Generation failed. Please try again." }, { status: 503 });',
                "  }",
                "}",
            ],
            "why": "Why this matters: Claude produces valid JSON >99% of the time, but network interruptions, "
                   "token truncation, or edge-case destinations can cause malformed output. Without a retry, "
                   "users see a broken experience with no path to recovery.",
        },
    ]
    story.extend(phase_section(
        1, "Security & Infrastructure Stability",
        "Protects Anthropic margins from abuse before any growth activity",
        "IMMEDIATE", "Deploy before any marketing or growth activity",
        phase1_tasks
    ))
    story.append(PageBreak())

    # ── Phase 2: UX Polish ──
    phase2_tasks = [
        {
            "id": "2.1",
            "title": "Empty State UX (/trips)",
            "checkboxes": [
                "Detect trips.length === 0 in src/app/trips/page.tsx (server component — no client JS needed)",
                "Design full-page editorial empty state matching the Million-Dollar Aesthetic:",
                ('Large Cormorant Garamond italic heading: "Your journeys begin here."', True),
                ('DM Sans body copy: "Every curated itinerary you generate is archived here..."', True),
                ("Single burnt-orange CTA button → / (the curation form)", True),
                ("Optional: Framer Motion fade-in-up animation on the empty state container", True),
                "Ensure print:hidden is applied so the empty state never appears in PDF exports",
            ],
            "impl_title": None,
            "impl_code": None,
            "why": "Design reference: Match the visual language of the custom not-found.tsx page — centered, "
                   "generous whitespace, serif heading, single clear action.",
        },
    ]
    story.extend(phase_section(
        2, "Core User Experience & Polish",
        "Retention infrastructure before growth spend",
        "HIGH", "Implement before significant user acquisition begins",
        phase2_tasks
    ))

    # ── Phase 3: Monetization ──
    phase3_tasks = [
        {
            "id": "3.1",
            "title": "Affiliate Link Injection System",
            "checkboxes": [
                "Register affiliate accounts:",
                ("Booking.com Partner Programme (hotels): partners.booking.com", True),
                ("Viator Partner Programme (tours & experiences): partner.viator.com", True),
                ("GetYourGuide Affiliate (activities): getyourguide.com/partner", True),
                ("OpenTable (restaurant reservations): opentable.com/affiliate", True),
                "Build affiliate URL resolver at src/lib/affiliateLinks.ts:",
                ("Input: TimelineItem (type, title, destination)", True),
                ("Output: affiliate URL with tracking parameters or null if no match", True),
                ("Map type === 'activity' → Viator / GetYourGuide deep link", True),
                ("Map type === 'breakfast' | 'lunch' | 'dinner' → OpenTable reservation link", True),
                ("Map hotel mentions in description → Booking.com search link", True),
                "Inject links into TimelineCard in ItineraryViewer.tsx:",
                ('Activity/meal cards: add subtle "Book Now" text link (DM Sans, text-ink-light)', True),
                ("Link opens in target=_blank rel=noopener noreferrer sponsored", True),
                "UTM parameter strategy: append ?utm_source=seekwander&utm_medium=itinerary&utm_campaign={destination}",
                "Add affiliate disclosure to /shared/[id] page footer (required by FTC + affiliate program TOS)",
            ],
            "impl_title": None,
            "impl_code": None,
            "sub_tables": [
                (
                    [
                        ["Platform", "Commission Type", "Est. Rate"],
                        ["Booking.com", "% of hotel booking value", "4-6%"],
                        ["Viator", "% of tour booking value", "8%"],
                        ["GetYourGuide", "% of activity value", "8-10%"],
                        ["OpenTable", "Per-cover fee", "$1-2/cover"],
                    ],
                    [5.0*cm, 7.5*cm, 4.5*cm]
                )
            ],
            "why": "Why native, not banner: The product's luxury positioning is its primary differentiator. "
                   "A 'Book on Booking.com' text link styled in ink-light is invisible as advertising. "
                   "A banner ad destroys the Vogue aesthetic and the trust that drives conversions.",
        },
    ]
    story.extend(phase_section(
        3, "Primary Monetization: Native Affiliate Placements",
        "Primary revenue engine — implement before significant user growth",
        "HIGH", "Primary revenue engine — implement before significant user growth",
        phase3_tasks
    ))
    story.append(PageBreak())

    # ── Phase 4: Growth ──
    phase4_tasks = [
        {
            "id": "4.1",
            "title": "Automated Social Content Engine",
            "checkboxes": [
                "Vercel Cron trigger: Add GET /api/cron/social to vercel.json — schedule: 0 9 * * * (09:00 UTC daily)",
                "n8n workflow design:",
                ("Webhook node receives trigger from Vercel Cron (secured with SOCIAL_CRON_SECRET)", True),
                ("Supabase node queries most-generated destination in last 7 days from CostLog", True),
                ("Anthropic node generates editorial caption (<=280 chars, no hashtags, Vogue tone)", True),
                ("HTTP Request node posts to Pinterest Boards API + Twitter/X API v2", True),
                ("Error handler node sends Slack/email alert on failure", True),
                "Store N8N_WEBHOOK_URL and SOCIAL_CRON_SECRET in Vercel environment variables",
                "Create n8n instance at cloud.n8n.io (free tier sufficient for this volume)",
            ],
            "impl_title": None,
            "impl_code": None,
            "why": "Zero-CAC thesis: Every AI-generated social post is a free acquisition touchpoint. "
                   "A single viral Pinterest pin of a '7-Day Amalfi Coast Itinerary' can drive hundreds "
                   "of organic sign-ups with zero ad spend.",
        },
        {
            "id": "4.2",
            "title": "White-Glove Founder's Welcome Email",
            "checkboxes": [
                "Clerk webhook setup: Dashboard → Webhooks → Add endpoint → POST /api/webhooks/clerk",
                ("Subscribe to user.created event", True),
                ("Copy Webhook Secret to CLERK_WEBHOOK_SECRET env var", True),
                "Webhook route at src/app/api/webhooks/clerk/route.ts:",
                ("Verify signature using svix package (Clerk's webhook verification library)", True),
                ("Extract email_address and first_name from payload", True),
                ("POST to n8n webhook with user data + 10-minute delay instruction", True),
                "n8n workflow: Wait 10 minutes → Send Email via Resend or Postmark",
                ("From: roman@seekwander.com (personal, not noreply)", True),
                ("Subject: 'Your first journey' — plain text, no HTML, no logo", True),
            ],
            "impl_title": "EMAIL TEMPLATE (PLAIN TEXT — NO HTML)",
            "impl_code": [
                "Hi [first_name],",
                "",
                "I wanted to reach out personally. You just used Seek Wander",
                "to plan your first trip — and I'm genuinely grateful.",
                "",
                "Seek Wander isn't an algorithm. Every itinerary is curated",
                "with the same care a private travel consultant would give",
                "a long-standing client.",
                "",
                "If you have feedback, questions, or a dream destination",
                "you want me to know about — just reply here.",
                "I read every email.",
                "",
                "Warmly,",
                "Roman",
                "Founder, Seek Wander",
            ],
            "why": "Why this converts: Plain-text founder emails sent 10 minutes after sign-up consistently "
                   "achieve 60-80% open rates. This is the highest-leverage retention touchpoint in the "
                   "entire stack.",
        },
    ]
    story.extend(phase_section(
        4, "Zero-CAC Growth & Operations (n8n Automations)",
        "Build after affiliate infrastructure is live and generating revenue signals",
        "MEDIUM", "Build after affiliate infrastructure is live and generating revenue signals",
        phase4_tasks
    ))
    story.append(PageBreak())

    # ── Phase 5: Legal ──
    phase5_tasks = [
        {
            "id": "5.1",
            "title": "Terms of Service & Privacy Policy",
            "checkboxes": [
                "Generate legal pages using Termly.io or iubenda configured for:",
                ("Affiliate link disclosure (FTC compliance)", True),
                ("Cookie usage (Clerk session cookies, Google Maps)", True),
                ("Data retention policy (trips stored until user deletion request)", True),
                ("AI-generated content disclaimer", True),
                "Create routes:",
                ("src/app/legal/terms/page.tsx — Terms of Service", True),
                ("src/app/legal/privacy/page.tsx — Privacy Policy", True),
                ("Both: server components, export const dynamic = 'force-dynamic', Seek Wander aesthetic", True),
                "Add footer links: 'Terms · Privacy · (c) 2026 Seek Wander'",
                "Affiliate disclosure banner on ItineraryViewer.tsx and /shared/[id]",
            ],
            "impl_title": None,
            "impl_code": None,
            "why": "Why this is a blocker: Booking.com, Viator, and GetYourGuide all require a Privacy Policy "
                   "URL at affiliate application time. This must be live before submitting applications.",
        },
    ]
    story.extend(phase_section(
        5, "Legal & Compliance",
        "Required for affiliate programme approvals and general liability",
        "MEDIUM", "Required before affiliate programme applications can be submitted",
        phase5_tasks
    ))

    # ── Phase 6: Future Expansion ──
    phase6_tasks = [
        {
            "id": "6.1",
            "title": "Stripe Paywall ($4.99 Transactional Gate)",
            "checkboxes": [
                "Add UserBalance Prisma model (run prisma db push)",
                "Install Stripe: npm install stripe @stripe/stripe-js",
                "Checkout session route at src/app/api/stripe/checkout/route.ts:",
                ("Creates Stripe Checkout session for $4.99 one-time payment", True),
                ("success_url → /itinerary?session_id={CHECKOUT_SESSION_ID}", True),
                ("cancel_url → /", True),
                "Webhook fulfillment at src/app/api/webhooks/stripe/route.ts:",
                ("Verify Stripe webhook signature", True),
                ("On checkout.session.completed: increment paidCredits", True),
                "Gate itinerary generation in route.ts — check free + paid credit balance",
                "Paywall UI in CurationForm.tsx — burnt-orange 'Unlock for $4.99' button",
                "Add env vars: STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET",
            ],
            "impl_title": None,
            "impl_code": None,
            "why": "Deprioritization rationale: The affiliate model has higher lifetime value per user with zero "
                   "conversion friction. A $4.99 gate reduces top-of-funnel conversion by an estimated 60-80% "
                   "at the pre-brand-awareness stage. This feature is preserved as an option — not abandoned.",
        },
    ]
    story.extend(phase_section(
        6, "Future Expansion (Deprioritized)",
        "Optionality — implement only if affiliate revenue is insufficient",
        "LOW", "Deprioritized — implement only if affiliate revenue is insufficient",
        phase6_tasks
    ))
    story.append(PageBreak())

    # ── Backlog Summary ──
    story.extend(build_backlog_summary())

    doc.build(story)


# ── Entry Point ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    output_path = r"D:\travel-plannner-v2\docs\Seek_Wander_Roadmap_And_Backlog.pdf"
    print(f"Building PDF: {output_path}")
    build_pdf(output_path)
    if os.path.exists(output_path):
        size_bytes = os.path.getsize(output_path)
        size_kb = size_bytes / 1024
        print(f"PDF generated successfully.")
        print(f"File: {output_path}")
        print(f"Size: {size_kb:.1f} KB ({size_bytes:,} bytes)")
    else:
        print("ERROR: PDF file was not created.")
        sys.exit(1)
