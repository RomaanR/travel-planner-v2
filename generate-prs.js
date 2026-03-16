const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, ExternalHyperlink,
  HeadingLevel, BorderStyle, WidthType, ShadingType, VerticalAlign,
  PageNumber, PageBreak, TableOfContents
} = require("C:/Users/User/AppData/Roaming/npm/node_modules/docx");

// ─── Colour palette ────────────────────────────────────────────────────────────
const NAVY   = "1B2A4A";  // section headers
const GOLD   = "B8860B";  // accent / table headers
const LIGHT  = "F0F4F8";  // alternating row tint
const WHITE  = "FFFFFF";
const BORDER_COLOR = "CCCCCC";

// ─── Page geometry (US Letter, 1-inch margins) ─────────────────────────────────
const PAGE_W   = 12240;
const PAGE_H   = 15840;
const MARGIN   = 1440;           // 1 inch
const CONTENT_W = PAGE_W - 2 * MARGIN;  // 9360 DXA

// ─── Border helper ─────────────────────────────────────────────────────────────
const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR };
const allBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

// ─── Cell factory ──────────────────────────────────────────────────────────────
function cell(text, width, { bold = false, shade = false, color = "000000", fontSize = 20, vAlign = VerticalAlign.CENTER, italic = false } = {}) {
  return new TableCell({
    borders: allBorders,
    width: { size: width, type: WidthType.DXA },
    shading: shade ? { fill: shade, type: ShadingType.CLEAR } : undefined,
    verticalAlign: vAlign,
    margins: { top: 80, bottom: 80, left: 160, right: 160 },
    children: [new Paragraph({
      children: [new TextRun({ text, bold, color, size: fontSize, font: "Arial", italics: italic })]
    })]
  });
}

// ─── Heading helpers ───────────────────────────────────────────────────────────
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text, bold: true, color: NAVY, size: 32, font: "Arial" })],
    spacing: { before: 360, after: 180 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: GOLD, space: 1 } },
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text, bold: true, color: NAVY, size: 28, font: "Arial" })],
    spacing: { before: 280, after: 120 },
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    children: [new TextRun({ text, bold: true, color: "444444", size: 24, font: "Arial" })],
    spacing: { before: 200, after: 80 },
  });
}

function body(text, { bold = false, italic = false, color = "222222", spacing = { before: 0, after: 120 } } = {}) {
  return new Paragraph({
    spacing,
    children: [new TextRun({ text, bold, italics: italic, size: 20, font: "Arial", color })],
  });
}

function label(text) {
  return new Paragraph({
    spacing: { before: 60, after: 40 },
    children: [new TextRun({ text, bold: true, size: 18, font: "Arial", color: "555555", allCaps: true })],
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "bullets", level },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, size: 20, font: "Arial", color: "222222" })],
  });
}

function numbered(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "numbers", level },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, size: 20, font: "Arial", color: "222222" })],
  });
}

function gap(size = 160) {
  return new Paragraph({ spacing: { before: 0, after: size }, children: [new TextRun("")] });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function infoBox(lines) {
  // A shaded info paragraph
  const children = lines.map((l, i) =>
    new Paragraph({
      spacing: { before: i === 0 ? 0 : 60, after: 60 },
      children: [new TextRun({ text: l, size: 19, font: "Arial", color: "1B2A4A" })],
      indent: { left: 200, right: 200 },
    })
  );
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [CONTENT_W],
    rows: [new TableRow({ children: [new TableCell({
      borders: {
        top:    { style: BorderStyle.SINGLE, size: 4, color: GOLD },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: GOLD },
        left:   { style: BorderStyle.SINGLE, size: 4, color: GOLD },
        right:  { style: BorderStyle.SINGLE, size: 4, color: GOLD },
      },
      shading: { fill: "FFF8E7", type: ShadingType.CLEAR },
      margins: { top: 120, bottom: 120, left: 200, right: 200 },
      width: { size: CONTENT_W, type: WidthType.DXA },
      children,
    })] })],
  });
}

// ─── Two-column key-value table ────────────────────────────────────────────────
function kvTable(rows, col1W = 2800) {
  const col2W = CONTENT_W - col1W;
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [col1W, col2W],
    rows: rows.map(([k, v], i) => new TableRow({ children: [
      cell(k, col1W, { bold: true, shade: i % 2 === 0 ? LIGHT : WHITE, fontSize: 19 }),
      cell(v, col2W, { shade: i % 2 === 0 ? LIGHT : WHITE, fontSize: 19 }),
    ]})),
  });
}

// ─── Header table (navy) ───────────────────────────────────────────────────────
function headerRow(cols, widths) {
  return new TableRow({
    tableHeader: true,
    children: cols.map((c, i) => new TableCell({
      borders: allBorders,
      width: { size: widths[i], type: WidthType.DXA },
      shading: { fill: NAVY, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 160, right: 160 },
      children: [new Paragraph({ children: [new TextRun({ text: c, bold: true, color: WHITE, size: 19, font: "Arial" })] })],
    })),
  });
}

function dataRow(cols, widths, shade = false) {
  return new TableRow({ children: cols.map((c, i) => cell(c, widths[i], { shade: shade ? LIGHT : WHITE, fontSize: 19 })) });
}

// ─── DATE ──────────────────────────────────────────────────────────────────────
const TODAY = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENT
// ═══════════════════════════════════════════════════════════════════════════════

const doc = new Document({
  // ─── Numbering ──────────────────────────────────────────────────────────────
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
          { level: 1, format: LevelFormat.BULLET, text: "\u25E6", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 1080, hanging: 360 } } } },
        ],
      },
      {
        reference: "numbers",
        levels: [
          { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
        ],
      },
    ],
  },
  // ─── Styles ─────────────────────────────────────────────────────────────────
  styles: {
    default: { document: { run: { font: "Arial", size: 20, color: "222222" } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: NAVY },
        paragraph: { spacing: { before: 360, after: 180 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: NAVY },
        paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: "444444" },
        paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2 } },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: PAGE_W, height: PAGE_H },
        margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
      },
    },
    headers: {
      default: new Header({ children: [
        new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: GOLD, space: 1 } },
          spacing: { after: 0 },
          children: [
            new TextRun({ text: "SEEK WANDER", bold: true, size: 16, font: "Arial", color: NAVY }),
            new TextRun({ text: "   |   Product Requirements Specification", size: 16, font: "Arial", color: "888888" }),
          ],
          tabStops: [{ type: "right", position: 9360 }],
        }),
      ]}),
    },
    footers: {
      default: new Footer({ children: [
        new Paragraph({
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: GOLD, space: 1 } },
          spacing: { before: 0 },
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "Confidential  |  Page ", size: 16, font: "Arial", color: "888888" }),
            new TextRun({ children: [PageNumber.CURRENT], size: 16, font: "Arial", color: "888888" }),
            new TextRun({ text: " of ", size: 16, font: "Arial", color: "888888" }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, font: "Arial", color: "888888" }),
          ],
        }),
      ]}),
    },
    children: [

      // ═══════════════════════════════════════════════════════════════════════
      // COVER PAGE
      // ═══════════════════════════════════════════════════════════════════════
      gap(2400),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [new TextRun({ text: "SEEK WANDER", bold: true, size: 64, font: "Arial", color: NAVY })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [new TextRun({ text: "Curated Luxury Journeys", italics: true, size: 32, font: "Arial", color: GOLD })],
      }),
      gap(240),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: {
          top:    { style: BorderStyle.SINGLE, size: 4, color: GOLD, space: 1 },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: GOLD, space: 1 },
        },
        spacing: { before: 120, after: 120 },
        children: [new TextRun({ text: "PRODUCT REQUIREMENTS SPECIFICATION", bold: true, size: 28, font: "Arial", color: NAVY, allCaps: true })],
      }),
      gap(480),
      new Table({
        width: { size: 5040, type: WidthType.DXA },
        columnWidths: [2160, 2880],
        rows: [
          new TableRow({ children: [
            cell("Document Version",  2160, { bold: true, shade: LIGHT, fontSize: 20 }),
            cell("1.0",               2880, { shade: LIGHT, fontSize: 20 }),
          ]}),
          new TableRow({ children: [
            cell("Status",            2160, { bold: true, shade: WHITE, fontSize: 20 }),
            cell("Released",          2880, { shade: WHITE, fontSize: 20, color: "2E7D32", bold: true }),
          ]}),
          new TableRow({ children: [
            cell("Date",              2160, { bold: true, shade: LIGHT, fontSize: 20 }),
            cell(TODAY,               2880, { shade: LIGHT, fontSize: 20 }),
          ]}),
          new TableRow({ children: [
            cell("Author",            2160, { bold: true, shade: WHITE, fontSize: 20 }),
            cell("Business Analysis", 2880, { shade: WHITE, fontSize: 20 }),
          ]}),
          new TableRow({ children: [
            cell("Audience",          2160, { bold: true, shade: LIGHT, fontSize: 20 }),
            cell("Software Architect, Engineering Lead", 2880, { shade: LIGHT, fontSize: 20 }),
          ]}),
          new TableRow({ children: [
            cell("Classification",    2160, { bold: true, shade: WHITE, fontSize: 20 }),
            cell("Confidential",      2880, { shade: WHITE, fontSize: 20 }),
          ]}),
        ],
      }),
      pageBreak(),

      // ═══════════════════════════════════════════════════════════════════════
      // TABLE OF CONTENTS
      // ═══════════════════════════════════════════════════════════════════════
      h1("Table of Contents"),
      new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-2" }),
      pageBreak(),

      // ═══════════════════════════════════════════════════════════════════════
      // SECTION 1 — EXECUTIVE SUMMARY
      // ═══════════════════════════════════════════════════════════════════════
      h1("1. Executive Summary"),
      body("Seek Wander is a luxury travel curation platform that generates bespoke, multi-day travel itineraries tailored to the traveller's party size, pace, budget tier, dietary requirements, and personal interests. The product is positioned as a digital concierge — the intersection of a private Rolls-Royce attache and the editorial voice of Conde Nast Traveller."),
      body("The platform deliberately omits any reference to artificial intelligence in its user-facing presentation. The technology is the engine; the curated outcome is the product."),
      gap(80),
      infoBox([
        "Key Metrics at a Glance",
        "",
        "  Phase:          7 of 8 complete",
        "  Current Stack:  Next.js 14 + Supabase + Clerk + Anthropic Claude + Google Maps",
        "  Deployment:     Vercel (production)",
        "  Cost/Generation: ~$0.72 (Anthropic $0.05 + Google Places $0.64 + Distance Matrix $0.025)",
        "  Next Decision:  Phase 8 — PlaceCache cost reduction OR Stripe paywall monetisation",
      ]),
      gap(),

      body("This document defines the complete functional and non-functional requirements of Seek Wander as delivered through Phase 7, and specifies the two candidate approaches for Phase 8. It is intended as a handoff artefact from Business Analysis to the Software Architect and Engineering Lead."),
      pageBreak(),

      // ═══════════════════════════════════════════════════════════════════════
      // SECTION 2 — PRODUCT VISION & POSITIONING
      // ═══════════════════════════════════════════════════════════════════════
      h1("2. Product Vision & Positioning"),

      h2("2.1 Vision Statement"),
      body("To become the definitive digital concierge for the discerning luxury traveller — an invisible intelligence that produces editorial-quality, deeply personalised itineraries at the speed of thought."),

      h2("2.2 Brand Identity"),
      kvTable([
        ["Brand Name",       "Seek Wander"],
        ["Tagline",          "Curated Luxury Journeys"],
        ["Aesthetic",        "Vogue meets National Geographic — expensive, minimalist, editorial"],
        ["Tone of Voice",    "Restrained elegance. No hyperbole. Condé Nast Traveller editorial copy."],
        ["AI Positioning",   "Deliberately absent from all user-facing copy, manifests, and metadata. The product is the luxury outcome, not the technology."],
        ["Target Channel",   "Web (PWA-installable), mobile web, and desktop"],
      ]),

      h2("2.3 Design System Summary"),
      body("The front-end enforces a non-negotiable design language:"),
      bullet("Zero border-radius on all components (rounded-none everywhere)"),
      bullet("Typography: Cormorant Garamond (serif) for display headings; DM Sans (sans-serif) for body and micro-copy"),
      bullet("Colour palette: paper #F5F0E8, ink #0A0A0A, burnt-orange #C2410C, emerald-accent #059669"),
      bullet("Framer Motion fade-in-up animations on all sections (duration 0.6s, easeOut)"),
      bullet("All images render grayscale by default; full colour on hover (transition 700ms)"),
      bullet("Map markers keyed by day number, not activity type (5-colour day palette)"),
      pageBreak(),

      // ═══════════════════════════════════════════════════════════════════════
      // SECTION 3 — USER PERSONAS
      // ═══════════════════════════════════════════════════════════════════════
      h1("3. User Personas"),

      h2("3.1 The Affluent Independent Traveller (Primary)"),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [2200, 7160],
        rows: [
          new TableRow({ children: [ cell("Name",        2200, { bold:true, shade:LIGHT }), cell("Alexandra, 38 — Senior Partner, London",                               7160, { shade:LIGHT }) ]}),
          new TableRow({ children: [ cell("Travel Style",2200, { bold:true, shade:WHITE }), cell("Couple or solo; 4-7 day city breaks; budget: ultra-luxury ($$$-$$$$)",  7160, { shade:WHITE }) ]}),
          new TableRow({ children: [ cell("Pain Point",  2200, { bold:true, shade:LIGHT }), cell("No time to research. Existing tools feel generic. Wants curation, not lists.", 7160, { shade:LIGHT }) ]}),
          new TableRow({ children: [ cell("Goal",        2200, { bold:true, shade:WHITE }), cell("A ready-to-execute itinerary that feels like it was built by a concierge who knows her.", 7160, { shade:WHITE }) ]}),
          new TableRow({ children: [ cell("Key Features",2200, { bold:true, shade:LIGHT }), cell("Budget tier selection, dietary filters, pace control, PDF export for offline use.", 7160, { shade:LIGHT }) ]}),
        ],
      }),
      gap(),

      h2("3.2 The Luxury Family Organiser (Secondary)"),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [2200, 7160],
        rows: [
          new TableRow({ children: [ cell("Name",        2200, { bold:true, shade:LIGHT }), cell("Marcus, 44 — CFO, New York",                                           7160, { shade:LIGHT }) ]}),
          new TableRow({ children: [ cell("Travel Style",2200, { bold:true, shade:WHITE }), cell("Family of 4; annual 10-day holiday; premium to luxury tier",            7160, { shade:WHITE }) ]}),
          new TableRow({ children: [ cell("Pain Point",  2200, { bold:true, shade:LIGHT }), cell("Itineraries that ignore child suitability. Dietary complexity (one vegan, one gluten-free).", 7160, { shade:LIGHT }) ]}),
          new TableRow({ children: [ cell("Goal",        2200, { bold:true, shade:WHITE }), cell("Itinerary that balances adult cultural depth with child-appropriate activities and safe dining.", 7160, { shade:WHITE }) ]}),
          new TableRow({ children: [ cell("Key Features",2200, { bold:true, shade:LIGHT }), cell("Family travel party, dietary stacking, FAMILY RULE enforcement in prompt.", 7160, { shade:LIGHT }) ]}),
        ],
      }),
      gap(),

      h2("3.3 The Lifestyle Sharer (Growth / Viral)"),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [2200, 7160],
        rows: [
          new TableRow({ children: [ cell("Name",        2200, { bold:true, shade:LIGHT }), cell("Priya, 29 — Travel Content Creator, Dubai",                            7160, { shade:LIGHT }) ]}),
          new TableRow({ children: [ cell("Travel Style",2200, { bold:true, shade:WHITE }), cell("Frequent solo travel; photography and culture focus; moderate budget",  7160, { shade:WHITE }) ]}),
          new TableRow({ children: [ cell("Pain Point",  2200, { bold:true, shade:LIGHT }), cell("Wants to share her itineraries with followers without exposing personal account.", 7160, { shade:LIGHT }) ]}),
          new TableRow({ children: [ cell("Goal",        2200, { bold:true, shade:WHITE }), cell("One-click shareable link to a read-only itinerary with beautiful OG metadata.", 7160, { shade:WHITE }) ]}),
          new TableRow({ children: [ cell("Key Features",2200, { bold:true, shade:LIGHT }), cell("/shared/[id] public route, ShareButton, dynamic OG tags, acquisition banner.", 7160, { shade:LIGHT }) ]}),
        ],
      }),
      pageBreak(),

      // ═══════════════════════════════════════════════════════════════════════
      // SECTION 4 — FUNCTIONAL REQUIREMENTS
      // ═══════════════════════════════════════════════════════════════════════
      h1("4. Functional Requirements"),
      body("Requirements are grouped by feature area and assigned unique IDs. Priority: P1 = Must Have (shipped), P2 = Should Have (shipped), P3 = Nice to Have."),
      gap(80),

      h2("4.1 Itinerary Generation"),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [800, 4760, 1600, 2200],
        rows: [
          headerRow(["ID", "Requirement", "Priority", "Status"], [800, 4760, 1600, 2200]),
          dataRow(["FR-001", "System shall accept a 7-field concierge intake form: destination, departure/return dates, travel party, pace, budget tier, dietary restrictions, and interests.", "P1", "Shipped — Phase 2"], [800, 4760, 1600, 2200]),
          dataRow(["FR-002", "Destination field shall use Google Places Autocomplete, returning place name, placeId, lat, and lng.", "P1", "Shipped — Phase 1"], [800, 4760, 1600, 2200], true),
          dataRow(["FR-003", "Date picker shall compute trip duration (clamped 1-5 days) and display a duration badge.", "P1", "Shipped — Phase 2"], [800, 4760, 1600, 2200]),
          dataRow(["FR-004", "System shall send a structured POST request to /api/itinerary and display a live loading state.", "P1", "Shipped — Phase 1"], [800, 4760, 1600, 2200], true),
          dataRow(["FR-005", "API shall call Claude claude-sonnet-4-6 (max 8192 tokens) and parse the JSON response.", "P1", "Shipped — Phase 1"], [800, 4760, 1600, 2200]),
          dataRow(["FR-006", "AI output shall follow the timeline[] schema: type, title, description, startTime, coordinates, and type-specific fields.", "P1", "Shipped — Phase 7"], [800, 4760, 1600, 2200], true),
          dataRow(["FR-007", "Each day shall contain 1-2 meal items (breakfast/lunch/dinner) interwoven chronologically with activities by startTime.", "P1", "Shipped — Phase 7"], [800, 4760, 1600, 2200]),
          dataRow(["FR-008", "Each day shall include one hidden gem: a real named place with 1-sentence description.", "P2", "Shipped — Phase 2"], [800, 4760, 1600, 2200], true),
          dataRow(["FR-009", "FAMILY RULE: when travelParty=family, all activities must be child-appropriate; 18+ venues prohibited.", "P1", "Shipped — Phase 2"], [800, 4760, 1600, 2200]),
          dataRow(["FR-010", "Dietary rules (Halal, Kosher, Gluten-Free, Dairy-Free) shall generate detailed dietaryNote fields on all meal items.", "P1", "Shipped — Phase 2"], [800, 4760, 1600, 2200], true),
        ],
      }),
      gap(),

      h2("4.2 Google Places Enrichment"),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [800, 4760, 1600, 2200],
        rows: [
          headerRow(["ID", "Requirement", "Priority", "Status"], [800, 4760, 1600, 2200]),
          dataRow(["FR-011", "System shall enrich every timeline item with a Google Places photo URL (photoreference, no underscore), rating, review count, open/closed status, and price level.", "P1", "Shipped — Phase 2"], [800, 4760, 1600, 2200]),
          dataRow(["FR-012", "System shall make a secondary Place Details call to retrieve today's opening hours (weekday_text[todayIdx]).", "P2", "Shipped — Phase 3"], [800, 4760, 1600, 2200], true),
          dataRow(["FR-013", "All enrichment calls shall use AbortSignal.timeout() (5000ms / 4000ms) and fail gracefully with null.", "P1", "Shipped — Phase 2"], [800, 4760, 1600, 2200]),
          dataRow(["FR-014", "Enrichment shall run in parallel across all timeline items via Promise.allSettled.", "P1", "Shipped — Phase 2"], [800, 4760, 1600, 2200], true),
        ],
      }),
      gap(),

      h2("4.3 Map & Transit"),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [800, 4760, 1600, 2200],
        rows: [
          headerRow(["ID", "Requirement", "Priority", "Status"], [800, 4760, 1600, 2200]),
          dataRow(["FR-015", "System shall render an interactive Google Map with day-centric SVG dot markers (5 colour palette by day number) and a subtle polyline connecting all stops.", "P1", "Shipped — Phase 3"], [800, 4760, 1600, 2200]),
          dataRow(["FR-016", "Map shall auto-fit bounds to all visible points with 40px padding.", "P1", "Shipped — Phase 3"], [800, 4760, 1600, 2200], true),
          dataRow(["FR-017", "Map legend shall display only days present in the current mapPoints array.", "P2", "Shipped — Phase 3"], [800, 4760, 1600, 2200]),
          dataRow(["FR-018", "System shall compute transit times (walking minutes, driving minutes) between consecutive timeline stops using Haversine as a guaranteed baseline, overridden by Google Distance Matrix where available.", "P2", "Shipped — Phase 3"], [800, 4760, 1600, 2200], true),
          dataRow(["FR-019", "Transit connectors shall render as dashed vertical lines between cards, showing walk time and drive time.", "P2", "Shipped — Phase 3"], [800, 4760, 1600, 2200]),
        ],
      }),
      gap(),

      h2("4.4 Authentication & User Accounts"),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [800, 4760, 1600, 2200],
        rows: [
          headerRow(["ID", "Requirement", "Priority", "Status"], [800, 4760, 1600, 2200]),
          dataRow(["FR-020", "System shall use Clerk v6 modal sign-in (no dedicated /sign-in or /sign-up pages).", "P1", "Shipped — Phase 4"], [800, 4760, 1600, 2200]),
          dataRow(["FR-021", "ClerkProvider shall be conditional: app shall build and function fully without Clerk keys present.", "P2", "Shipped — Phase 4"], [800, 4760, 1600, 2200], true),
          dataRow(["FR-022", "All middleware routes shall be public; auth enforcement happens at the component and server-action level.", "P1", "Shipped — Phase 4"], [800, 4760, 1600, 2200]),
          dataRow(["FR-023", "auth() in all server-side contexts must be awaited (Clerk v6.39+ returns a Promise).", "P1", "Shipped — Phase 4"], [800, 4760, 1600, 2200], true),
        ],
      }),
      gap(),

      h2("4.5 Trip Persistence"),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [800, 4760, 1600, 2200],
        rows: [
          headerRow(["ID", "Requirement", "Priority", "Status"], [800, 4760, 1600, 2200]),
          dataRow(["FR-024", "Authenticated users shall be able to save a generated itinerary to the database via a server action.", "P1", "Shipped — Phase 5"], [800, 4760, 1600, 2200]),
          dataRow(["FR-025", "/trips shall display all saved trips for the authenticated user, with destination photos and formatted dates.", "P1", "Shipped — Phase 5"], [800, 4760, 1600, 2200], true),
          dataRow(["FR-026", "/trips/[id] shall render the full saved itinerary for the authenticated owner.", "P1", "Shipped — Phase 5"], [800, 4760, 1600, 2200]),
          dataRow(["FR-027", "All DB queries for user-owned records must include userId ownership verification (IDOR prevention).", "P1", "Shipped — Phase 5"], [800, 4760, 1600, 2200], true),
        ],
      }),
      gap(),

      h2("4.6 PWA, Sharing & Export"),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [800, 4760, 1600, 2200],
        rows: [
          headerRow(["ID", "Requirement", "Priority", "Status"], [800, 4760, 1600, 2200]),
          dataRow(["FR-028", "App shall be installable as a PWA with name 'Seek Wander' (no 'AI'), standalone display mode, and brand-coloured splash screen.", "P2", "Shipped — Phase 6"], [800, 4760, 1600, 2200]),
          dataRow(["FR-029", "Service worker shall cache Google Places photos CacheFirst with 30-day TTL (100 entries max).", "P2", "Shipped — Phase 6"], [800, 4760, 1600, 2200], true),
          dataRow(["FR-030", "/shared/[id] shall be publicly accessible without authentication. It shall render a read-only itinerary with dynamic OG metadata and an acquisition CTA.", "P1", "Shipped — Phase 6"], [800, 4760, 1600, 2200]),
          dataRow(["FR-031", "ShareButton shall attempt navigator.share() (mobile native sheet) then fall back to clipboard copy, with an AnimatePresence toast confirmation.", "P2", "Shipped — Phase 6"], [800, 4760, 1600, 2200], true),
          dataRow(["FR-032", "PDF export shall use window.print() with Tailwind print: modifiers. Output shall include a branded dossier header and all itinerary days. No third-party PDF library.", "P2", "Shipped — Phase 6"], [800, 4760, 1600, 2200]),
          dataRow(["FR-033", "Print CSS shall reset Framer Motion inline opacity ([style*='opacity'] { opacity: 1 !important }) to prevent blank cards in PDF output.", "P2", "Shipped — Phase 6"], [800, 4760, 1600, 2200], true),
        ],
      }),
      pageBreak(),

      // ═══════════════════════════════════════════════════════════════════════
      // SECTION 5 — NON-FUNCTIONAL REQUIREMENTS
      // ═══════════════════════════════════════════════════════════════════════
      h1("5. Non-Functional Requirements"),

      h2("5.1 Performance"),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [800, 5360, 3200],
        rows: [
          headerRow(["ID", "Requirement", "Target"], [800, 5360, 3200]),
          dataRow(["NFR-001", "Itinerary generation end-to-end latency (AI + enrichment + transit)", "<= 15 seconds P95"], [800, 5360, 3200]),
          dataRow(["NFR-002", "Google Places enrichment individual call timeout", "<= 5000ms (AbortSignal)"], [800, 5360, 3200], true),
          dataRow(["NFR-003", "Place Details (opening hours) call timeout", "<= 4000ms (AbortSignal)"], [800, 5360, 3200]),
          dataRow(["NFR-004", "Destination photo fetch (/trips dashboard) timeout", "<= 4000ms (AbortSignal)"], [800, 5360, 3200], true),
          dataRow(["NFR-005", "First Contentful Paint (landing page)", "<= 1.5s on 4G"], [800, 5360, 3200]),
          dataRow(["NFR-006", "Google Places photo cache hit rate (repeat destinations, PWA)", ">= 70% within 30-day TTL"], [800, 5360, 3200], true),
        ],
      }),
      gap(),

      h2("5.2 Security"),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [800, 5360, 3200],
        rows: [
          headerRow(["ID", "Requirement", "Mechanism"], [800, 5360, 3200]),
          dataRow(["NFR-007", "IDOR Prevention: user-owned DB records must not be accessible by other users", "userId ownership check on every query"], [800, 5360, 3200]),
          dataRow(["NFR-008", "All secret keys must be server-side only", "No NEXT_PUBLIC_ prefix on ANTHROPIC_API_KEY, CLERK_SECRET_KEY, DATABASE_URL, DIRECT_URL"], [800, 5360, 3200], true),
          dataRow(["NFR-009", "Google Maps API key must have no HTTP referrer restrictions", "Required for server-side enrichment calls"], [800, 5360, 3200]),
          dataRow(["NFR-010", "/shared/[id] intentionally bypasses auth — this is by design", "Public viral loop; no user data exposed beyond itinerary content"], [800, 5360, 3200], true),
          dataRow(["NFR-011", "Stripe webhook endpoint must verify Stripe-Signature header (Phase 8B)", "stripe.webhooks.constructEvent()"], [800, 5360, 3200]),
        ],
      }),
      gap(),

      h2("5.3 Scalability"),
      bullet("The application is deployed on Vercel serverless functions. Each request is stateless."),
      bullet("Supabase PgBouncer (port 6543) is used for connection pooling in serverless contexts."),
      bullet("Google Places enrichment runs in parallel via Promise.allSettled across all timeline items (~38 per 5-day itinerary). This is the primary cost and latency driver."),
      bullet("Phase 8A (PlaceCache) is the primary architectural lever for reducing API cost and improving generation latency on repeat destinations."),
      gap(),

      h2("5.4 Availability & Resilience"),
      bullet("All third-party API calls (Google Places, Distance Matrix) use AbortSignal.timeout() and return null on failure — enrichment is additive, never blocking."),
      bullet("Haversine transit calculation provides a guaranteed baseline fallback if Distance Matrix API fails."),
      bullet("The application functions without Clerk keys (conditional ClerkProvider) — useful for development and partial deployments."),
      bullet("PWA offline caching ensures previously-viewed destination photos remain available without network connectivity."),
      gap(),

      h2("5.5 Maintainability"),
      bullet("src/types/itinerary.ts exports types and interfaces ONLY. No runtime functions."),
      bullet("All runtime helpers (normalizeDayPlan, isMealType, computeMapPoints) live exclusively in src/lib/itineraryUtils.ts."),
      bullet("ItineraryViewer.tsx is display-only. Page-specific CTAs are injected via the bottomSection: ReactNode slot."),
      bullet("The normalizeDayPlan() shim provides zero-migration backward compatibility for all legacy DB records."),
      pageBreak(),

      // ═══════════════════════════════════════════════════════════════════════
      // SECTION 6 — SYSTEM ARCHITECTURE OVERVIEW
      // ═══════════════════════════════════════════════════════════════════════
      h1("6. System Architecture Overview"),

      h2("6.1 Technology Stack"),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [2400, 3960, 3000],
        rows: [
          headerRow(["Layer", "Technology", "Notes"], [2400, 3960, 3000]),
          dataRow(["Framework",   "Next.js 14 (App Router, TypeScript)",                   "Server components, server actions, force-dynamic routes"], [2400, 3960, 3000]),
          dataRow(["Styling",     "Tailwind CSS v3 + custom design tokens",                "rounded-none enforced everywhere"], [2400, 3960, 3000], true),
          dataRow(["Animation",   "Framer Motion 12",                                      "fade-in-up on all sections; AnimatePresence for tab transitions"], [2400, 3960, 3000]),
          dataRow(["AI Engine",   "Anthropic claude-sonnet-4-6 (max 8192 tokens)",         "Invisible to users; JSON-only output enforced"], [2400, 3960, 3000], true),
          dataRow(["Auth",        "@clerk/nextjs v6 (modal only)",                         "v6 locked — v7 requires Next.js 15"], [2400, 3960, 3000]),
          dataRow(["ORM",         "Prisma 7",                                              "postinstall: prisma generate (Vercel binary compat)"], [2400, 3960, 3000], true),
          dataRow(["Database",    "Supabase (PostgreSQL)",                                 "Dual URL: port 6543 (PgBouncer) + port 5432 (direct)"], [2400, 3960, 3000]),
          dataRow(["Maps",        "@react-google-maps/api",                                "Places Autocomplete + GoogleMap + Marker + Polyline"], [2400, 3960, 3000], true),
          dataRow(["PWA",         "@serwist/next + serwist",                               "Disabled in development; CacheFirst for Google photos"], [2400, 3960, 3000]),
          dataRow(["Deployment",  "Vercel",                                                "Serverless functions; Prisma auto-detects Linux binary"], [2400, 3960, 3000], true),
        ],
      }),
      gap(),

      h2("6.2 Route Map"),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [2600, 1400, 5360],
        rows: [
          headerRow(["Route", "Type", "Description"], [2600, 1400, 5360]),
          dataRow(["/",                     "Server",       "Landing page with CurationForm (force-dynamic)"], [2600, 1400, 5360]),
          dataRow(["/itinerary",            "Client",       "Live generation results — 55/45 split screen (force-dynamic)"], [2600, 1400, 5360], true),
          dataRow(["/trips",                "Server",       "Authenticated archive dashboard"], [2600, 1400, 5360]),
          dataRow(["/trips/[id]",           "Server",       "Authenticated saved trip viewer + PDF export"], [2600, 1400, 5360], true),
          dataRow(["/shared/[id]",          "Server",       "PUBLIC read-only itinerary — no auth, OG metadata, acquisition CTA"], [2600, 1400, 5360]),
          dataRow(["/api/itinerary",        "Route Handler","POST: AI generation + Google enrichment + transit pipeline"], [2600, 1400, 5360], true),
          dataRow(["saveTrip (action)",     "Server Action","Auth-gated Prisma trip.create"], [2600, 1400, 5360]),
        ],
      }),
      gap(),

      h2("6.3 Key Architectural Patterns"),
      h3("Server-to-Client Composition"),
      body("ItineraryViewer.tsx is a 'use client' component used across three pages. It accepts a bottomSection?: ReactNode slot so each page can inject page-specific CTAs (save button, back-to-archive links, acquisition banner) without coupling those concerns to the display component."),

      h3("Map Point Computation"),
      body("computeMapPoints(days: DayPlan[]): MapPoint[] is called server-side in trips/[id] and shared/[id] (direct call), and client-side in itinerary/page.tsx (useMemo). Both import from @/lib/itineraryUtils — no duplicated logic."),

      h3("Backward Compatibility Shim"),
      body("normalizeDayPlan(day: DayPlan) detects legacy DB records (no timeline array) and synthesises a timeline[] from morning/afternoon/evening/dining fields. Called at the top of DaySection — transparent to all consumers. Zero DB migration required."),
      pageBreak(),

      // ═══════════════════════════════════════════════════════════════════════
      // SECTION 7 — DATA MODELS
      // ═══════════════════════════════════════════════════════════════════════
      h1("7. Data Models"),

      h2("7.1 Database — Trip (Prisma)"),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [2000, 1600, 5760],
        rows: [
          headerRow(["Field", "Type", "Description"], [2000, 1600, 5760]),
          dataRow(["id",            "String (UUID)", "Primary key — auto-generated UUID"], [2000, 1600, 5760]),
          dataRow(["userId",        "String",        "Clerk userId — no FK constraint (Clerk manages identity separately)"], [2000, 1600, 5760], true),
          dataRow(["destination",   "String",        "Display name of the destination (e.g. 'Kyoto, Japan')"], [2000, 1600, 5760]),
          dataRow(["days",          "Int",           "Number of days (1-5)"], [2000, 1600, 5760], true),
          dataRow(["itineraryData", "Json",          "Full ItineraryResponse blob including all enriched timeline data"], [2000, 1600, 5760]),
          dataRow(["createdAt",     "DateTime",      "Auto-set on create; used for archive sorting"], [2000, 1600, 5760], true),
        ],
      }),
      gap(),
      body("JSON access pattern: trip.itineraryData as unknown as ItineraryResponse (double-cast through unknown; always use optional chaining on result)."),
      gap(),

      h2("7.2 ItineraryRequest (POST Body)"),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [2400, 2160, 4800],
        rows: [
          headerRow(["Field", "Type", "Description"], [2400, 2160, 4800]),
          dataRow(["destination",   "string",                             "'Kyoto, Japan'"], [2400, 2160, 4800]),
          dataRow(["placeId",       "string",                             "Google Place ID"], [2400, 2160, 4800], true),
          dataRow(["lat / lng",     "number",                             "Destination centre coordinates"], [2400, 2160, 4800]),
          dataRow(["departureDate", "string (ISO YYYY-MM-DD)",            "Trip start date"], [2400, 2160, 4800], true),
          dataRow(["returnDate",    "string (ISO YYYY-MM-DD)",            "Trip end date"], [2400, 2160, 4800]),
          dataRow(["duration",      "number (1-5)",                       "Computed from date diff; clamped server-side"], [2400, 2160, 4800], true),
          dataRow(["travelParty",   "solo | couple | family | group",     "Travel party type"], [2400, 2160, 4800]),
          dataRow(["pace",          "relaxed | moderate | packed",        "Day density preference"], [2400, 2160, 4800], true),
          dataRow(["budgetTier",    "premium | luxury | ultra-luxury",    "Aligns dining and venue tier"], [2400, 2160, 4800]),
          dataRow(["dietary",       "DietaryOption[]",                    "none | vegetarian | vegan | halal | kosher | gluten-free | dairy-free"], [2400, 2160, 4800], true),
          dataRow(["interests",     "Interest[]",                         "10 options; no max cap"], [2400, 2160, 4800]),
        ],
      }),
      gap(),

      h2("7.3 TimelineItem (Canonical — Phase 7)"),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [2200, 1600, 2000, 3560],
        rows: [
          headerRow(["Field", "Type", "Applicability", "Description"], [2200, 1600, 2000, 3560]),
          dataRow(["type",               "TimelineItemType", "All",       "activity | breakfast | lunch | dinner | snack | drinks"], [2200, 1600, 2000, 3560]),
          dataRow(["title",              "string",           "All",       "Activity or restaurant name (real names only)"], [2200, 1600, 2000, 3560], true),
          dataRow(["description",        "string",           "All",       "Exactly 2 sentences (editorial tone)"], [2200, 1600, 2000, 3560]),
          dataRow(["duration",           "string",           "All",       "e.g. '2 hours'; empty string for meals"], [2200, 1600, 2000, 3560], true),
          dataRow(["startTime",          "string?",          "All",       "HH:MM — must be strictly sequential within day"], [2200, 1600, 2000, 3560]),
          dataRow(["category",           "string?",          "Activities","SIGHTSEEING | MUSEUM | CULTURE | NATURE | WELLNESS | ADVENTURE | SHOPPING"], [2200, 1600, 2000, 3560], true),
          dataRow(["coordinates",        "Coordinate",       "All",       "{ lat, lng } — real GPS, used for map markers"], [2200, 1600, 2000, 3560]),
          dataRow(["cuisine",            "string?",          "Meals",     "Cuisine type description"], [2200, 1600, 2000, 3560], true),
          dataRow(["pricePoint",         "string?",          "Meals",     "$$ | $$$ | $$$$"], [2200, 1600, 2000, 3560]),
          dataRow(["reservation",        "boolean?",         "Meals",     "Whether reservation is required"], [2200, 1600, 2000, 3560], true),
          dataRow(["dietaryNote",        "string?",          "Meals",     "Dietary compliance detail (Halal/Kosher/GF enforcement)"], [2200, 1600, 2000, 3560]),
          dataRow(["photoUrl",           "string?",          "All",       "Google Places photo URL (enriched post-generation)"], [2200, 1600, 2000, 3560], true),
          dataRow(["rating",             "number?",          "All",       "Google Places rating (enriched)"], [2200, 1600, 2000, 3560]),
          dataRow(["openNow",            "boolean?",         "All",       "Current open/closed status (enriched)"], [2200, 1600, 2000, 3560], true),
          dataRow(["hoursOpen",          "string?",          "All",       "Today's trading hours e.g. '9:00 AM - 9:00 PM' (enriched)"], [2200, 1600, 2000, 3560]),
          dataRow(["priceLevel",         "number?",          "All",       "Google price_level 0-4 (enriched)"], [2200, 1600, 2000, 3560], true),
          dataRow(["transitFromPrevious","TransitInfo?",     "All",       "{ walkingMinutes, drivingMinutes } — computed post-enrichment"], [2200, 1600, 2000, 3560]),
        ],
      }),
      gap(),

      h2("7.4 DayPlan"),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [2400, 1600, 5360],
        rows: [
          headerRow(["Field", "Type", "Description"], [2400, 1600, 5360]),
          dataRow(["day",                  "number",        "1-indexed day number"], [2400, 1600, 5360]),
          dataRow(["theme",                "string",        "Poetic day title (e.g. 'Tea Houses & Temple Shadows')"], [2400, 1600, 5360], true),
          dataRow(["pace",                 "Pace",          "relaxed | moderate | packed"], [2400, 1600, 5360]),
          dataRow(["timeline",             "TimelineItem[]","CANONICAL — chronological array of all activities and meals"], [2400, 1600, 5360], true),
          dataRow(["hiddenGem",            "string",        "Named place + 1-sentence description"], [2400, 1600, 5360]),
          dataRow(["hiddenGemCoordinates", "Coordinate",    "GPS coordinates for hidden gem map marker"], [2400, 1600, 5360], true),
          dataRow(["morning?",             "Activity",      "LEGACY — present only in pre-Phase-7 DB records"], [2400, 1600, 5360]),
          dataRow(["afternoon?",           "Activity",      "LEGACY — present only in pre-Phase-7 DB records"], [2400, 1600, 5360], true),
          dataRow(["evening?",             "Activity",      "LEGACY — present only in pre-Phase-7 DB records"], [2400, 1600, 5360]),
          dataRow(["dining?",              "DiningRec[]",   "LEGACY — present only in pre-Phase-7 DB records"], [2400, 1600, 5360], true),
        ],
      }),
      pageBreak(),

      // ═══════════════════════════════════════════════════════════════════════
      // SECTION 8 — API CONTRACTS
      // ═══════════════════════════════════════════════════════════════════════
      h1("8. API Contracts"),

      h2("8.1 POST /api/itinerary"),
      kvTable([
        ["Method",          "POST"],
        ["Path",            "/api/itinerary"],
        ["Authentication",  "None required (AI generation is public; save action is auth-gated separately)"],
        ["Content-Type",    "application/json"],
        ["Response",        "application/json"],
      ]),
      gap(),

      h3("Request Body"),
      body("See Section 7.2 — ItineraryRequest. All fields are required except dietary (defaults to empty array) and interests."),
      gap(),

      h3("Success Response — 200 OK"),
      body("Returns a fully enriched ItineraryResponse JSON object:"),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [2000, 7360],
        rows: [
          headerRow(["Field", "Description"], [2000, 7360]),
          dataRow(["destination", "Display destination name"], [2000, 7360]),
          dataRow(["editorial",   "Vogue-style opener sentence (<= 25 words)"], [2000, 7360], true),
          dataRow(["days[]",      "Array of DayPlan objects (1-5); each contains a timeline[] array, hiddenGem, and hiddenGemCoordinates"], [2000, 7360]),
        ],
      }),
      gap(),

      h3("Error Responses"),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [1200, 2000, 6160],
        rows: [
          headerRow(["Status", "Error Field", "Condition"], [1200, 2000, 6160]),
          dataRow(["400", "destination and placeId are required", "Request body missing destination or placeId"], [1200, 2000, 6160]),
          dataRow(["500", "AI returned malformed JSON — please try again", "Claude response fails JSON.parse() — SyntaxError"], [1200, 2000, 6160], true),
          dataRow(["500", "Failed to generate itinerary", "All other unhandled exceptions"], [1200, 2000, 6160]),
        ],
      }),
      gap(),

      h3("Processing Pipeline"),
      numbered("Validate request body (destination + placeId required); clamp duration 1-5."),
      numbered("Call Anthropic claude-sonnet-4-6 (max 8192 tokens) with buildPrompt(). Strip markdown fences. Parse JSON."),
      numbered("Build flat workItems array from day.timeline[]. Run enrichPlace() on all items in parallel via Promise.allSettled."),
      numbered("For each day, build stops[] from timeline[].coordinates. Call getDayTransits() (Haversine baseline + Distance Matrix override). Assign transitFromPrevious to each timeline item."),
      numbered("Return fully enriched ItineraryResponse."),
      gap(),

      h2("8.2 Server Action — saveTrip"),
      kvTable([
        ["Type",            "Next.js Server Action ('use server')"],
        ["File",            "src/app/actions/saveTrip.ts"],
        ["Authentication",  "Required — throws if no Clerk userId"],
        ["Arguments",       "destination: string, days: number, itinerary: ItineraryResponse"],
        ["DB Operation",    "prisma.trip.create({ data: { userId, destination, days, itineraryData: itinerary } })"],
        ["Error Handling",  "Throws on auth failure; Prisma errors propagate to caller"],
      ]),
      pageBreak(),

      // ═══════════════════════════════════════════════════════════════════════
      // SECTION 9 — THIRD-PARTY INTEGRATIONS
      // ═══════════════════════════════════════════════════════════════════════
      h1("9. Third-Party Integrations"),

      h2("9.1 Anthropic (Claude)"),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [2400, 6960],
        rows: [
          headerRow(["Attribute", "Detail"], [2400, 6960]),
          dataRow(["Purpose",         "Generate structured JSON itineraries with editorial copy and accurate GPS coordinates"], [2400, 6960]),
          dataRow(["SDK",             "@anthropic-ai/sdk"], [2400, 6960], true),
          dataRow(["Model",           "claude-sonnet-4-6"], [2400, 6960]),
          dataRow(["Max Tokens",      "8192"], [2400, 6960], true),
          dataRow(["Auth",            "ANTHROPIC_API_KEY (server-side only)"], [2400, 6960]),
          dataRow(["Output Contract", "Pure JSON only — no markdown, no preamble. Prompt instructs 'Return ONLY valid JSON.'"], [2400, 6960], true),
          dataRow(["Cost",            "~$0.05 per itinerary generation"], [2400, 6960]),
          dataRow(["Failure Mode",    "SyntaxError on JSON.parse() returns 500 with 'AI returned malformed JSON — please try again'"], [2400, 6960], true),
        ],
      }),
      gap(),

      h2("9.2 Google Places API"),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [2400, 6960],
        rows: [
          headerRow(["Attribute", "Detail"], [2400, 6960]),
          dataRow(["Purpose",         "Enrich timeline items with photos, ratings, hours, and price level"], [2400, 6960]),
          dataRow(["Endpoints Used",  "textsearch/json (enrichment); details/json?fields=opening_hours (hours); findplacefromtext (dashboard photos); photo (URL construction)"], [2400, 6960], true),
          dataRow(["Auth",            "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY — must have NO HTTP referrer restrictions for server-side use"], [2400, 6960]),
          dataRow(["Critical Note",   "Photo URL parameter is 'photoreference' (no underscore). Using 'photo_reference' silently returns a broken redirect."], [2400, 6960], true),
          dataRow(["Timeouts",        "Text Search: 5000ms; Place Details: 4000ms; Dashboard photo: 4000ms — all via AbortSignal.timeout()"], [2400, 6960]),
          dataRow(["Cost",            "~$0.64 per itinerary (38 items x $0.017 per Text Search call) — primary cost driver"], [2400, 6960], true),
          dataRow(["Failure Mode",    "Returns null; enrichment fields are optional — cards render without photos/ratings"], [2400, 6960]),
        ],
      }),
      gap(),

      h2("9.3 Google Maps JavaScript API"),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [2400, 6960],
        rows: [
          headerRow(["Attribute", "Detail"], [2400, 6960]),
          dataRow(["Purpose",         "Interactive map with custom day-centric markers, polyline, legend, and InfoWindows"], [2400, 6960]),
          dataRow(["Library",         "@react-google-maps/api (GoogleMap, Marker, InfoWindow, Polyline, useJsApiLoader)"], [2400, 6960], true),
          dataRow(["Auth",            "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (client-side)"], [2400, 6960]),
          dataRow(["Markers",         "Custom inline SVG dots coloured by day number (5-colour palette); built via buildSvgMarker()"], [2400, 6960], true),
          dataRow(["Distance Matrix", "mode=walking + mode=driving via Promise.allSettled; Haversine used as guaranteed fallback"], [2400, 6960]),
        ],
      }),
      gap(),

      h2("9.4 Clerk (Authentication)"),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [2400, 6960],
        rows: [
          headerRow(["Attribute", "Detail"], [2400, 6960]),
          dataRow(["Purpose",         "User identity, sign-in/sign-up modal, session management"], [2400, 6960]),
          dataRow(["Version",         "@clerk/nextjs@6 — LOCKED. v7 requires Next.js 15 and is incompatible."], [2400, 6960], true),
          dataRow(["Auth Method",     "Modal only — no /sign-in or /sign-up pages. SignInButton mode='modal'."], [2400, 6960]),
          dataRow(["API Used",        "SignedIn, SignedOut, SignInButton, UserButton, auth() (server), clerkMiddleware()"], [2400, 6960], true),
          dataRow(["Critical Note",   "auth() returns a Promise in v6.39+. Must be awaited. Without await, userId = undefined always."], [2400, 6960]),
          dataRow(["Keyless Mode",    "ClerkProvider is conditional on NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY presence. App builds and runs without it."], [2400, 6960], true),
        ],
      }),
      gap(),

      h2("9.5 Supabase (PostgreSQL)"),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [2400, 6960],
        rows: [
          headerRow(["Attribute", "Detail"], [2400, 6960]),
          dataRow(["Purpose",         "Persistent storage for saved itineraries"], [2400, 6960]),
          dataRow(["DATABASE_URL",    "Supabase PgBouncer, port 6543 — used at runtime for all queries"], [2400, 6960], true),
          dataRow(["DIRECT_URL",      "Supabase direct, port 5432 — required by Prisma for schema introspection and db push"], [2400, 6960]),
          dataRow(["ORM",             "Prisma 7 — singleton pattern (globalForPrisma) to prevent connection exhaustion in dev hot-reload"], [2400, 6960], true),
          dataRow(["Deployment Note", "No explicit binaryTargets in schema.prisma — Prisma auto-detects the correct binary. postinstall: prisma generate handles Vercel Linux binary."], [2400, 6960]),
        ],
      }),
      gap(),

      h2("9.6 Stripe (Phase 8B — Not Yet Implemented)"),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [2400, 6960],
        rows: [
          headerRow(["Attribute", "Detail"], [2400, 6960]),
          dataRow(["Purpose",         "One-time payment ($4.99) to unlock unlimited itinerary generation"], [2400, 6960]),
          dataRow(["Integration",     "Stripe Checkout (hosted page) — no custom payment form needed"], [2400, 6960], true),
          dataRow(["Webhook",         "stripe.webhooks.constructEvent() to verify Stripe-Signature; update isPaid = true in DB"], [2400, 6960]),
          dataRow(["Auth",            "STRIPE_SECRET_KEY (server-side), STRIPE_WEBHOOK_SECRET (server-side), NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (client-side)"], [2400, 6960], true),
          dataRow(["Failure Mode",    "Payment failure handled by Stripe Checkout UI; webhook failure should be idempotent (retry-safe)"], [2400, 6960]),
        ],
      }),
      pageBreak(),

      // ═══════════════════════════════════════════════════════════════════════
      // SECTION 10 — PHASE 8 FEATURE SPECIFICATIONS
      // ═══════════════════════════════════════════════════════════════════════
      h1("10. Phase 8 Feature Specifications"),
      body("Two options are available for Phase 8. They are not mutually exclusive and can be implemented sequentially. A decision is required before engineering begins."),
      gap(80),

      infoBox([
        "Decision Required: Which option(s) to pursue first?",
        "",
        "  Option A (PlaceCache):  Reduces per-itinerary cost from ~$0.72 to ~$0.08 on repeat destinations.",
        "                          Pure cost-reduction play. No user-facing change.",
        "",
        "  Option B (Stripe):      Introduces revenue. Creates a monetisation gate. Requires UX design for paywall state.",
        "",
        "  Recommended sequence:   Option A first (lower risk, immediate cost savings), then Option B.",
      ]),
      gap(),

      h2("10.1 Option A — Supabase PlaceCache"),

      h3("Business Rationale"),
      body("Google Places Text Search accounts for ~89% of per-itinerary API cost ($0.64 of $0.72). Popular destinations (Paris, Tokyo, Kyoto) will have repeated place name lookups across users. Caching enrichment results by (placeName + city) with a 7-day TTL eliminates redundant API calls, reducing cost by ~$0.64 per cache-hit itinerary."),
      gap(),

      h3("Data Model — PlaceCache Table"),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [2200, 1600, 5560],
        rows: [
          headerRow(["Field", "Type", "Description"], [2200, 1600, 5560]),
          dataRow(["id",               "String (UUID)", "Primary key"], [2200, 1600, 5560]),
          dataRow(["placeName",        "String",        "Normalised place/restaurant name (lowercase, trimmed)"], [2200, 1600, 5560], true),
          dataRow(["city",             "String",        "Destination city (from ItineraryRequest.destination)"], [2200, 1600, 5560]),
          dataRow(["photoUrl",         "String?",       "Google Places photo URL"], [2200, 1600, 5560], true),
          dataRow(["rating",           "Float?",        "Google rating (0-5)"], [2200, 1600, 5560]),
          dataRow(["userRatingsTotal", "Int?",          "Total review count"], [2200, 1600, 5560], true),
          dataRow(["openNow",          "Boolean?",      "Current open status (note: time-sensitive — honour short TTL)"], [2200, 1600, 5560]),
          dataRow(["hoursOpen",        "String?",       "Today's opening hours string"], [2200, 1600, 5560], true),
          dataRow(["priceLevel",       "Int?",          "Google price_level 0-4"], [2200, 1600, 5560]),
          dataRow(["cachedAt",         "DateTime",      "Cache write timestamp — used for TTL check"], [2200, 1600, 5560], true),
        ],
      }),
      gap(),
      body("Composite unique index: (placeName, city) — enforces one cache entry per place per city."),
      gap(),

      h3("Implementation Specification"),
      bullet("Modify enrichPlace() in src/app/api/itinerary/route.ts to accept a Prisma client instance."),
      bullet("Before each Google API call: query PlaceCache WHERE placeName = normalise(name) AND city = destination AND cachedAt > NOW() - 7 days."),
      bullet("On cache hit: return cached enrichment object. Skip both Google API calls."),
      bullet("On cache miss: proceed with existing enrichPlace() logic. On successful return, upsert result into PlaceCache (write-through)."),
      bullet("openNow may be stale from cache — acceptable trade-off given 7-day TTL. Architects may choose to exclude openNow from cache and always fetch live, at the cost of a separate Details call."),
      gap(),

      h3("Acceptance Criteria"),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [800, 8560],
        rows: [
          headerRow(["AC", "Criterion"], [800, 8560]),
          dataRow(["AC-1", "A second generation for the same destination within 7 days results in zero Google Places Text Search API calls for cached places."], [800, 8560]),
          dataRow(["AC-2", "Cached items older than 7 days are treated as cache misses and re-fetched from Google."], [800, 8560], true),
          dataRow(["AC-3", "Cache misses do not degrade generation quality — fallback to live enrichPlace() is transparent."], [800, 8560]),
          dataRow(["AC-4", "The PlaceCache table is queryable in Supabase; engineers can inspect cache contents and TTL status."], [800, 8560], true),
          dataRow(["AC-5", "Unit tests cover: cache hit path, cache miss path, expired cache path, and write-through path."], [800, 8560]),
        ],
      }),
      gap(),

      h2("10.2 Option B — Stripe Checkout Paywall"),

      h3("Business Rationale"),
      body("The current product is entirely free to use. Every generation costs ~$0.72 in API fees with no revenue offset. A $4.99 one-time purchase for unlimited generations establishes a sustainable unit economics model: break-even at ~1 itinerary post-purchase per paying user."),
      gap(),

      h3("User Experience Flow"),
      numbered("User completes CurationForm and submits."),
      numbered("System checks: has the user generated >= 1 itinerary previously? (generationsUsed >= 1 AND isPaid = false)"),
      numbered("If paywall triggered: display upgrade modal ('You have used your free itinerary. Unlock unlimited journeys for $4.99.') with a Stripe Checkout CTA."),
      numbered("User clicks CTA -> redirected to Stripe Checkout hosted page."),
      numbered("On payment success: Stripe webhook fires -> server verifies Stripe-Signature -> sets isPaid = true in UserProfile."),
      numbered("User is redirected back to the app with full access."),
      gap(),

      h3("Data Model — UserProfile Table"),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [2400, 1600, 5360],
        rows: [
          headerRow(["Field", "Type", "Description"], [2400, 1600, 5360]),
          dataRow(["id",               "String (UUID)", "Primary key"], [2400, 1600, 5360]),
          dataRow(["userId",           "String",        "Clerk userId — unique, used as lookup key"], [2400, 1600, 5360], true),
          dataRow(["generationsUsed",  "Int",           "Incremented on each successful POST /api/itinerary call; default 0"], [2400, 1600, 5360]),
          dataRow(["isPaid",           "Boolean",       "Set to true by Stripe webhook on successful payment; default false"], [2400, 1600, 5360], true),
          dataRow(["stripeCustomerId", "String?",       "Stripe customer ID — stored for potential future subscription migration"], [2400, 1600, 5360]),
          dataRow(["createdAt",        "DateTime",      "Auto-set on create"], [2400, 1600, 5360], true),
        ],
      }),
      gap(),

      h3("Entitlement Check Logic"),
      body("In POST /api/itinerary, before calling Claude:"),
      numbered("If no userId (unauthenticated): proceed (free anonymous tier — 1 generation per session, not tracked in DB)."),
      numbered("Upsert UserProfile for userId. If isPaid = true: proceed."),
      numbered("If generationsUsed >= 1 AND isPaid = false: return 402 Payment Required with { error: 'upgrade_required', checkoutUrl: <Stripe Checkout URL> }."),
      numbered("If generationsUsed = 0 AND isPaid = false: proceed (free first generation). Increment generationsUsed after successful return."),
      gap(),

      h3("Acceptance Criteria"),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [800, 8560],
        rows: [
          headerRow(["AC", "Criterion"], [800, 8560]),
          dataRow(["AC-1", "First generation for any authenticated user completes without paywall."], [800, 8560]),
          dataRow(["AC-2", "Second generation for an unpaid authenticated user returns 402 with upgrade_required and a valid Stripe Checkout URL."], [800, 8560], true),
          dataRow(["AC-3", "Stripe webhook correctly sets isPaid = true. Subsequent generations proceed without paywall."], [800, 8560]),
          dataRow(["AC-4", "Stripe-Signature header is verified via stripe.webhooks.constructEvent(). Invalid signatures return 400."], [800, 8560], true),
          dataRow(["AC-5", "Webhook handler is idempotent — processing the same webhook event twice does not double-charge or corrupt state."], [800, 8560]),
          dataRow(["AC-6", "Unauthenticated users can generate one itinerary per browser session without being prompted to pay."], [800, 8560], true),
        ],
      }),
      pageBreak(),

      // ═══════════════════════════════════════════════════════════════════════
      // SECTION 11 — CONSTRAINTS & ASSUMPTIONS
      // ═══════════════════════════════════════════════════════════════════════
      h1("11. Constraints & Assumptions"),

      h2("11.1 Technical Constraints"),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [600, 8760],
        rows: [
          headerRow(["#", "Constraint"], [600, 8760]),
          dataRow(["1", "Next.js version is locked at 14. Clerk v6 requires Next.js 14; Clerk v7 requires Next.js 15 and must not be installed."], [600, 8760]),
          dataRow(["2", "Clerk version is locked at @clerk/nextjs@6. The v7 API (<Show> component) must not be used."], [600, 8760], true),
          dataRow(["3", "No explicit binaryTargets in Prisma schema. Pinning rhel-openssl-1.0.x breaks Vercel (Amazon Linux 2023, OpenSSL 3.x)."], [600, 8760]),
          dataRow(["4", "Google Maps API key must have no HTTP referrer restrictions. Referrer-restricted keys cannot be used for server-side enrichment calls."], [600, 8760], true),
          dataRow(["5", "The photoreference query parameter (no underscore) must be used for all Google Places photo URL construction. photo_reference silently breaks."], [600, 8760]),
          dataRow(["6", "Itinerary duration is clamped to 1-5 days. Claude is prompted for exactly N days. Exceeding 5 days risks context-window issues and cost overruns."], [600, 8760], true),
          dataRow(["7", "The word 'AI' must not appear in any user-facing copy, manifest names, OG metadata, or UI text."], [600, 8760]),
          dataRow(["8", "Tailwind CSS print: modifiers are the sole PDF export mechanism. No PDF library dependencies may be added."], [600, 8760], true),
        ],
      }),
      gap(),

      h2("11.2 Business Assumptions"),
      bullet("The target user is willing to provide 7 form fields before seeing results. Drop-off at any stage is an acceptable trade-off for itinerary quality."),
      bullet("Average itinerary length is 3-5 days, resulting in ~25-38 Google Places enrichment calls per generation."),
      bullet("Repeat popular destinations (Paris, Tokyo, Kyoto, New York) will benefit significantly from PlaceCache in Phase 8A."),
      bullet("A $4.99 one-time paywall is priced below the cost of a single concierge consultation; target conversion rate is > 15% of active users."),
      bullet("Shared itineraries (/shared/[id]) serve as a viral acquisition channel. The acquisition banner ('Curated by Seek Wander — Create Your Own') is the primary growth mechanic."),
      bullet("Vercel serverless cold starts are acceptable given the asynchronous nature of itinerary generation (users expect 5-15 second wait times)."),
      pageBreak(),

      // ═══════════════════════════════════════════════════════════════════════
      // SECTION 12 — OPEN QUESTIONS & DECISION LOG
      // ═══════════════════════════════════════════════════════════════════════
      h1("12. Open Questions & Decision Log"),

      h2("12.1 Open Questions"),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [600, 1200, 4560, 3000],
        rows: [
          headerRow(["#", "Area", "Question", "Owner"], [600, 1200, 4560, 3000]),
          dataRow(["Q-001", "Phase 8", "Should Phase 8A (PlaceCache) and Phase 8B (Stripe) be implemented sequentially or in parallel? What is the priority order?", "Product / Business"], [600, 1200, 4560, 3000]),
          dataRow(["Q-002", "PlaceCache", "Should openNow be excluded from PlaceCache and always fetched live? (openNow is time-sensitive; stale values may mislead users.)", "Architecture"], [600, 1200, 4560, 3000], true),
          dataRow(["Q-003", "PlaceCache", "What is the acceptable cache TTL? 7 days is proposed. Should ratings and photos have longer TTL (30 days) vs. hours/openNow (1 day)?", "Architecture"], [600, 1200, 4560, 3000]),
          dataRow(["Q-004", "Stripe", "Should the free tier be 1 generation per authenticated user, or 1 per anonymous session? Anonymous sessions are not currently tracked.", "Product"], [600, 1200, 4560, 3000], true),
          dataRow(["Q-005", "Stripe", "Is a one-time $4.99 purchase the right pricing model, or should a subscription ($9.99/month) be considered for recurring revenue?", "Business"], [600, 1200, 4560, 3000]),
          dataRow(["Q-006", "Scaling", "At what monthly active user count should connection pooling configuration be revisited? Current Supabase free tier limits apply.", "Infrastructure"], [600, 1200, 4560, 3000], true),
          dataRow(["Q-007", "Itinerary Days", "Should the 5-day maximum be increased? Doing so increases Claude token usage, Google API calls, and generation latency proportionally.", "Product / Cost"], [600, 1200, 4560, 3000]),
          dataRow(["Q-008", "OG Images", "Should /shared/[id] generate dynamic OG images (Next.js ImageResponse) with the destination name and Seek Wander branding for richer social sharing?", "Product / Engineering"], [600, 1200, 4560, 3000], true),
        ],
      }),
      gap(),

      h2("12.2 Decision Log"),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [800, 1200, 1200, 4360, 1800],
        rows: [
          headerRow(["ID", "Date", "Area", "Decision", "Rationale"], [800, 1200, 1200, 4360, 1800]),
          dataRow(["D-001", "Phase 1", "AI Branding", "Remove all 'AI' references from user-facing copy, manifests, and metadata.", "Product positioned on luxury outcome, not technology."], [800, 1200, 1200, 4360, 1800]),
          dataRow(["D-002", "Phase 4", "Auth", "Clerk v6 locked. v7 not supported until Next.js 15 upgrade.", "Prevents breaking changes to auth API."], [800, 1200, 1200, 4360, 1800], true),
          dataRow(["D-003", "Phase 5", "Security", "IDOR prevention via userId ownership check on all user-data queries.", "Prevents enumeration of other users' itineraries by UUID guessing."], [800, 1200, 1200, 4360, 1800]),
          dataRow(["D-004", "Phase 6", "PDF Export", "window.print() + Tailwind print: modifiers. No PDF library.", "Zero dependencies; no bundle size increase; works offline."], [800, 1200, 1200, 4360, 1800], true),
          dataRow(["D-005", "Phase 6", "Sharing", "/shared/[id] intentionally bypasses auth. Public viral loop.", "Acquisition channel requires zero-friction access for non-users."], [800, 1200, 1200, 4360, 1800]),
          dataRow(["D-006", "Phase 7", "Data Model", "timeline: TimelineItem[] replaces morning/afternoon/evening + dining.", "Unified chronological view improves UX; single data model for all item types."], [800, 1200, 1200, 4360, 1800], true),
          dataRow(["D-007", "Phase 7", "Backward Compat", "normalizeDayPlan() shim in itineraryUtils.ts. Zero DB migration.", "Existing saved trips continue to render correctly without schema changes."], [800, 1200, 1200, 4360, 1800]),
          dataRow(["D-008", "Phase 7", "Code Org", "Runtime functions (isMealType, computeMapPoints) live in lib/, not types/.", "Prevents Next.js bundler errors from importing runtime code from a types file."], [800, 1200, 1200, 4360, 1800], true),
        ],
      }),
      gap(200),

      // ─── Document footer ───────────────────────────────────────────────────
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: GOLD, space: 1 } },
        spacing: { before: 400, after: 120 },
        children: [new TextRun({ text: "SEEK WANDER  |  Product Requirements Specification  |  Confidential", size: 16, font: "Arial", color: "888888" })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 0 },
        children: [new TextRun({ text: "Version 1.0  |  " + TODAY, size: 16, font: "Arial", color: "AAAAAA" })],
      }),
    ],
  }],
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("D:/travel-plannner-v2/Seek-Wander-PRS.docx", buffer);
  console.log("SUCCESS: Seek-Wander-PRS.docx written");
}).catch(err => {
  console.error("ERROR:", err.message);
  process.exit(1);
});
