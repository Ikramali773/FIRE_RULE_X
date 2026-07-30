# backend/routes/report_pdf.py
# POST /api/reports/compliance.pdf
# Generates a safety-calc-india style compliance report PDF from analysis output.
#
# Uses reportlab (pure Python — no system deps). Streams PDF bytes back.

from __future__ import annotations

from io import BytesIO
from typing import Any

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
)

router = APIRouter()


class PdfReportRequest(BaseModel):
    """Wraps the full AnalyzeResponse — front-end passes what it received."""
    payload: dict[str, Any] = Field(..., description="Full AnalyzeResponse as returned by /api/analyze-mixed")


# ── Helpers ────────────────────────────────────────────────────────

_STATUS_COLORS = {
    "required":         colors.HexColor("#D50000"),
    "not_required":     colors.HexColor("#616161"),
    "conditional":      colors.HexColor("#F9A825"),
    "insufficient_data": colors.HexColor("#1565C0"),
}

_STATUS_BG = {
    "required":         colors.HexColor("#FFEBEE"),
    "not_required":     colors.HexColor("#F5F5F5"),
    "conditional":      colors.HexColor("#FFF8E1"),
    "insufficient_data": colors.HexColor("#E3F2FD"),
}


def _base_styles() -> dict:
    ss = getSampleStyleSheet()
    return {
        "title":    ParagraphStyle("t", parent=ss["Title"], fontName="Helvetica-Bold", fontSize=20, leading=24, textColor=colors.HexColor("#0A192F")),
        "h2":       ParagraphStyle("h2", parent=ss["Heading2"], fontName="Helvetica-Bold", fontSize=13, leading=16, textColor=colors.HexColor("#0A192F"), spaceAfter=6, spaceBefore=10),
        "h3":       ParagraphStyle("h3", parent=ss["Heading3"], fontName="Helvetica-Bold", fontSize=11, leading=14, textColor=colors.HexColor("#334155"), spaceAfter=3, spaceBefore=6),
        "body":     ParagraphStyle("b", parent=ss["Normal"], fontName="Helvetica", fontSize=9.5, leading=13, textColor=colors.HexColor("#0F172A")),
        "small":    ParagraphStyle("s", parent=ss["Normal"], fontName="Helvetica", fontSize=8, leading=11, textColor=colors.HexColor("#475569")),
        "mono":     ParagraphStyle("m", parent=ss["Normal"], fontName="Courier", fontSize=8, leading=11, textColor=colors.HexColor("#2962FF")),
        "meta":     ParagraphStyle("meta", parent=ss["Normal"], fontName="Helvetica", fontSize=9, leading=12, textColor=colors.HexColor("#475569")),
        "chip":     ParagraphStyle("chip", parent=ss["Normal"], fontName="Helvetica-Bold", fontSize=8, leading=10, textColor=colors.white),
    }


def _summary_table(extraction: dict, mixed: dict | None, S: dict) -> Table:
    building_name = extraction.get("buildingName", "Unnamed Building")
    city = extraction.get("city", "")
    state = extraction.get("state", "")
    height = extraction.get("buildingHeight", 0)
    floors = extraction.get("numberOfFloors", 0)
    total_area = extraction.get("totalFloorArea", 0)
    basement_area = extraction.get("basementArea", 0)

    occ_labels = []
    if mixed and mixed.get("occupancyLabels"):
        for code, label in mixed["occupancyLabels"].items():
            occ_labels.append(f"{code} — {label}")
    elif extraction.get("occupancySubdivision"):
        occ_labels.append(extraction["occupancySubdivision"])

    rows = [
        [Paragraph("<b>Building</b>", S["small"]), Paragraph(f"{building_name}", S["body"])],
        [Paragraph("<b>Location</b>", S["small"]), Paragraph(f"{city}, {state}" if city or state else "—", S["body"])],
        [Paragraph("<b>Height</b>", S["small"]), Paragraph(f"{height} m", S["body"])],
        [Paragraph("<b>Floors</b>", S["small"]), Paragraph(f"{floors}", S["body"])],
        [Paragraph("<b>Total Floor Area</b>", S["small"]), Paragraph(f"{total_area:,.0f} m²", S["body"])],
        [Paragraph("<b>Basement Area</b>", S["small"]), Paragraph(f"{basement_area:,.0f} m²" if basement_area else "—", S["body"])],
        [Paragraph("<b>Occupancies</b>", S["small"]), Paragraph(" · ".join(occ_labels) if occ_labels else "—", S["body"])],
    ]
    tbl = Table(rows, colWidths=[45 * mm, 130 * mm])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F1F3F5")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#E2E8F0")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return tbl


def _installations_table(items: list[dict], S: dict) -> Table:
    header = ["System", "Status", "Reason", "Triggered By", "Clause / Table / Note"]
    data = [header]
    styles = [
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0A192F")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#E2E8F0")),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]
    for idx, item in enumerate(items, start=1):
        status = item.get("status", "not_required")
        status_upper = status.replace("_", " ").upper()
        triggered = ", ".join(item.get("triggeredBy", [])) or "—"
        clauses = " · ".join(item.get("clauseRefs", [])) or "—"
        data.append([
            Paragraph(f"<b>{item.get('title', item.get('id', ''))}</b>", S["body"]),
            Paragraph(status_upper, S["chip"]),
            Paragraph(item.get("reason", "—"), S["small"]),
            Paragraph(triggered, S["mono"]),
            Paragraph(clauses, S["mono"]),
        ])
        styles.append(("BACKGROUND", (1, idx), (1, idx), _STATUS_COLORS.get(status, colors.grey)))
        styles.append(("ALIGN", (1, idx), (1, idx), "CENTER"))
    tbl = Table(data, colWidths=[32 * mm, 22 * mm, 55 * mm, 30 * mm, 36 * mm], repeatRows=1)
    tbl.setStyle(TableStyle(styles))
    return tbl


def _quantities_table(qty: dict, S: dict) -> Table | None:
    if not qty:
        return None
    header = ["Quantity", "Value", "Triggered By"]
    data = [header]
    friendly = {
        "underground_tank_litres": "Underground Static Tank",
        "terrace_tank_litres": "Terrace Tank",
        "underground_pump_lpm": "Underground Fire Pump",
        "terrace_pump_lpm": "Terrace Fire Pump",
    }
    for field, entry in qty.items():
        data.append([
            Paragraph(friendly.get(field, field), S["body"]),
            Paragraph(f"{entry.get('value', 0):,} {entry.get('unit', '')}", S["body"]),
            Paragraph(", ".join(entry.get("triggeredBy", [])), S["mono"]),
        ])
    tbl = Table(data, colWidths=[70 * mm, 45 * mm, 60 * mm], repeatRows=1)
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0A192F")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#E2E8F0")),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return tbl


def _bullet_list(items: list[str], S: dict) -> list:
    flows = []
    if not items:
        flows.append(Paragraph("— None —", S["small"]))
        return flows
    for it in items:
        flows.append(Paragraph(f"• {it}", S["body"]))
    return flows


def _bis_grid(compliance_items: list[dict], S: dict) -> Table | None:
    seen: dict[str, list[str]] = {}
    for it in compliance_items:
        if it.get("status") != "required":
            continue
        for std in it.get("bisStandards", []):
            seen.setdefault(std, []).append(it.get("title", it.get("id", "")))
    if not seen:
        return None
    header = ["BIS Standard", "Triggered by"]
    data = [header]
    for std, triggers in sorted(seen.items()):
        data.append([
            Paragraph(f"<b>{std}</b>", S["body"]),
            Paragraph(", ".join(sorted(set(triggers))), S["small"]),
        ])
    tbl = Table(data, colWidths=[45 * mm, 130 * mm], repeatRows=1)
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2962FF")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#E2E8F0")),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return tbl


@router.post("/api/reports/compliance.pdf")
async def generate_pdf(body: PdfReportRequest):
    payload = body.payload
    extraction = payload.get("extraction", {})
    analysis = payload.get("analysis", {})
    meta = payload.get("meta", {})

    compliance_items: list[dict] = analysis.get("complianceItems", []) or []
    aggregated_qty: dict = analysis.get("aggregatedQuantities", {}) or {}
    mixed: dict = analysis.get("mixedOccupancySummary") or {}
    passed = analysis.get("passedChecks") or analysis.get("passedRules") or []
    missing = analysis.get("missingInputs") or []
    next_steps = analysis.get("nextSteps") or []

    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=15 * mm, rightMargin=15 * mm,
        topMargin=15 * mm, bottomMargin=15 * mm,
        title="FireRuleX — NBC Part 4 Compliance Report",
    )
    S = _base_styles()
    story: list = []

    # Header
    story.append(Paragraph("FireRuleX — NBC Part 4 Compliance Report", S["title"]))
    story.append(Paragraph(
        f"Generated {meta.get('analyzedAt', '')} · Analysis method: {analysis.get('analysisMethod', 'manual_override')}",
        S["meta"],
    ))
    story.append(Spacer(1, 6 * mm))

    # 1. Building Information
    story.append(Paragraph("1. Building Information", S["h2"]))
    story.append(_summary_table(extraction, mixed, S))
    story.append(Spacer(1, 4 * mm))

    # Mixed-occupancy chip strip
    if mixed and mixed.get("mode") == "mixed":
        codes = mixed.get("occupancyCodes") or []
        tier_labels = mixed.get("heightTierLabels") or {}
        occ_labels = mixed.get("occupancyLabels") or {}
        chip_rows = []
        for c in codes:
            chip_rows.append(Paragraph(
                f"<b>{c}</b> · {occ_labels.get(c, '')} · Tier: {tier_labels.get(c, '—')}",
                S["small"],
            ))
        if chip_rows:
            story.append(Paragraph("Mixed-occupancy composition:", S["h3"]))
            for cr in chip_rows:
                story.append(cr)
        story.append(Spacer(1, 4 * mm))

    # 2. Fire-Fighting Installations table (required core section)
    story.append(Paragraph("2. Fire-Fighting Installations (NBC Part 4, Table 7)", S["h2"]))
    if compliance_items:
        story.append(_installations_table(compliance_items, S))
    else:
        story.append(Paragraph("No compliance items were computed.", S["small"]))
    story.append(Spacer(1, 4 * mm))

    # 3. Aggregated Quantities
    qty_tbl = _quantities_table(aggregated_qty, S)
    if qty_tbl is not None:
        story.append(Paragraph("3. Water Storage & Pump Quantities (strictest aggregated)", S["h2"]))
        story.append(qty_tbl)
        story.append(Spacer(1, 4 * mm))

    # 4. Passed Checks
    story.append(Paragraph("4. Passed Checks", S["h2"]))
    for f in _bullet_list(passed, S):
        story.append(f)
    story.append(Spacer(1, 4 * mm))

    # 5. Missing Inputs
    story.append(Paragraph("5. Missing Inputs", S["h2"]))
    for f in _bullet_list(missing, S):
        story.append(f)
    story.append(Spacer(1, 4 * mm))

    # 6. Next Steps
    story.append(Paragraph("6. Next Steps", S["h2"]))
    for f in _bullet_list(next_steps, S):
        story.append(f)
    story.append(Spacer(1, 4 * mm))

    # 7. Triggered BIS Standards
    bis_tbl = _bis_grid(compliance_items, S)
    if bis_tbl is not None:
        story.append(Paragraph("7. Triggered BIS Standards", S["h2"]))
        story.append(bis_tbl)
        story.append(Spacer(1, 4 * mm))

    # 8. Disclaimer
    story.append(Paragraph("8. Disclaimer", S["h2"]))
    story.append(Paragraph(
        "This report is an advisory pre-check aligned with NBC 2016 Part 4 (Fire and Life Safety) and "
        "does not replace formal Fire NOC review by the local Chief Fire Officer / AHJ. Design decisions "
        "must be validated by a qualified fire-safety consultant and cross-checked against state fire-service "
        "rules, latest NBC amendments, and jurisdictional bye-laws before construction.",
        S["small"],
    ))

    doc.build(story)
    buf.seek(0)

    filename = (extraction.get("projectName") or extraction.get("buildingName") or "firerulex-report").strip().replace(" ", "_")
    return StreamingResponse(
        BytesIO(buf.read()),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}-compliance.pdf"'},
    )
