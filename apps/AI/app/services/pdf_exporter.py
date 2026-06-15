"""
report/pdf_exporter.py
──────────────────────────────────────────────────────────────────────────
PDF Conversion Layer — converts rendered HTML string to PDF bytes.

Strategy (in order):
  1. WeasyPrint  — best quality (needs libcairo2 + libgobject via apt)
  2. Playwright  — Chromium headless (playwright install chromium in build)
  3. fpdf2       — Pure Python fallback, ZERO system dependencies ✅
  4. pdfkit      — needs wkhtmltopdf binary installed

Single responsibility: HTML string → PDF bytes.
"""

import io
import os
import re


def _strip_html(html: str) -> str:
    """Remove HTML tags to get plain text for fpdf2 fallback."""
    text = re.sub(r'<style[^>]*>.*?</style>', '', html, flags=re.DOTALL)
    text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.DOTALL)
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'&lt;', '<', text)
    text = re.sub(r'&gt;', '>', text)
    text = re.sub(r'&amp;', '&', text)
    text = re.sub(r'&nbsp;', ' ', text)
    text = re.sub(r'&copy;', '©', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def _fpdf2_pdf(html: str) -> bytes:
    """
    Pure-Python PDF using fpdf2 — works on ANY platform with zero system deps.
    Produces a clean text-based PDF from the HTML content.
    """
    from fpdf import FPDF

    class MedicalPDF(FPDF):
        def header(self):
            self.set_font('Helvetica', 'B', 14)
            self.set_text_color(0, 131, 143)  # teal
            self.cell(0, 10, 'HeartCare - Medical Analysis Report', align='C', new_x='LMARGIN', new_y='NEXT')
            self.set_draw_color(0, 172, 193)
            self.line(10, self.get_y(), 200, self.get_y())
            self.ln(4)

        def footer(self):
            self.set_y(-15)
            self.set_font('Helvetica', 'I', 8)
            self.set_text_color(128)
            self.cell(0, 10, f'Page {self.page_no()} | Disclaimer: AI-assisted report. Consult a qualified cardiologist.', align='C')

    # Extract sections from HTML using Jinja-rendered content
    # Parse key data fields from the HTML
    def extract(pattern, default='N/A'):
        m = re.search(pattern, html, re.DOTALL)
        return m.group(1).strip() if m else default

    # Extract values from rendered HTML
    patient_name = extract(r'Patient Name:</div>\s*<div[^>]*>(.*?)</div>')
    patient_sex  = extract(r'Sex:</div>\s*<div[^>]*>(.*?)</div>')
    national_id  = extract(r'National ID:</div>\s*<div[^>]*>(.*?)</div>')
    lab_name     = extract(r'Lab Name:</div>\s*<div[^>]*>(.*?)</div>')
    lab_test_id  = extract(r'<strong>Lab Test ID:</strong>\s*(.*?)</p>')
    date_val     = extract(r'<strong>Date:</strong>\s*(.*?)</p>')
    risk_score   = extract(r'Calculated Cardiac Risk Score:\s*([\d.]+)%')

    # Extract clinical table rows
    clinical_rows = re.findall(
        r'<td>(.*?)</td>\s*<td>(.*?)</td>\s*<td>(.*?)</td>',
        html, re.DOTALL
    )
    clinical_rows = [(a.strip(), b.strip(), c.strip()) for a, b, c in clinical_rows
                     if a.strip() not in ('Medical Factor',)]

    # Extract LLM summary and recommendations
    summary = extract(r'class="interpretation">\s*(.*?)\s*</div>', 'Report not available.')
    summary = re.sub(r'<[^>]+>', '', summary).strip()

    recs_html = extract(r'class="recommendations">(.*?)</div>', '')
    recs = re.findall(r'<li>(.*?)</li>', recs_html, re.DOTALL)
    recs = [re.sub(r'<[^>]+>', '', r).strip() for r in recs]

    pdf = MedicalPDF()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()

    # ── Patient Info ──────────────────────────────────────────────────
    pdf.set_font('Helvetica', 'B', 12)
    pdf.set_text_color(0, 100, 100)
    pdf.cell(0, 8, 'Patient Demographics', new_x='LMARGIN', new_y='NEXT')
    pdf.set_draw_color(220, 220, 220)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(2)

    info_pairs = [
        ('Patient Name', patient_name), ('Sex', patient_sex),
        ('National ID', national_id),   ('Lab Name', lab_name),
        ('Lab Test ID', lab_test_id),   ('Report Date', date_val),
    ]
    pdf.set_font('Helvetica', '', 10)
    for label, value in info_pairs:
        pdf.set_text_color(84, 110, 122)
        pdf.cell(50, 7, f'{label}:')
        pdf.set_text_color(44, 62, 80)
        pdf.set_font('Helvetica', 'B', 10)
        pdf.cell(0, 7, value, new_x='LMARGIN', new_y='NEXT')
        pdf.set_font('Helvetica', '', 10)

    pdf.ln(5)

    # ── Risk Score ────────────────────────────────────────────────────
    pdf.set_font('Helvetica', 'B', 13)
    try:
        score_f = float(risk_score)
        if score_f >= 70:
            pdf.set_text_color(211, 47, 47)   # red
        elif score_f >= 40:
            pdf.set_text_color(251, 192, 45)  # amber
        else:
            pdf.set_text_color(56, 142, 60)   # green
    except ValueError:
        pdf.set_text_color(0, 131, 143)
    pdf.cell(0, 10, f'AI Cardiac Risk Score: {risk_score}%', new_x='LMARGIN', new_y='NEXT')
    pdf.ln(2)

    # ── Clinical Factors Table ────────────────────────────────────────
    if clinical_rows:
        pdf.set_font('Helvetica', 'B', 12)
        pdf.set_text_color(0, 100, 100)
        pdf.cell(0, 8, 'Clinical Factors & Lab Results', new_x='LMARGIN', new_y='NEXT')
        pdf.line(10, pdf.get_y(), 200, pdf.get_y())
        pdf.ln(2)

        # Header
        pdf.set_fill_color(248, 249, 250)
        pdf.set_text_color(0, 131, 143)
        pdf.set_font('Helvetica', 'B', 9)
        pdf.cell(65, 7, 'Medical Factor', border=1, fill=True)
        pdf.cell(50, 7, 'Patient Value',  border=1, fill=True)
        pdf.cell(0,  7, 'Reference',      border=1, fill=True, new_x='LMARGIN', new_y='NEXT')

        pdf.set_font('Helvetica', '', 9)
        pdf.set_text_color(44, 62, 80)
        for i, (factor, value, ref) in enumerate(clinical_rows[:15]):
            fill = i % 2 == 0
            pdf.set_fill_color(255, 255, 255) if not fill else pdf.set_fill_color(248, 249, 250)
            pdf.cell(65, 6, factor[:40], border=1, fill=fill)
            pdf.cell(50, 6, value[:30],  border=1, fill=fill)
            pdf.cell(0,  6, ref[:40],    border=1, fill=fill, new_x='LMARGIN', new_y='NEXT')

    pdf.ln(5)

    # ── Clinical Interpretation ───────────────────────────────────────
    if summary and summary != 'N/A':
        pdf.set_font('Helvetica', 'B', 12)
        pdf.set_text_color(0, 100, 100)
        pdf.cell(0, 8, 'Clinical Interpretation', new_x='LMARGIN', new_y='NEXT')
        pdf.line(10, pdf.get_y(), 200, pdf.get_y())
        pdf.ln(2)
        pdf.set_fill_color(253, 250, 230)
        pdf.set_font('Helvetica', '', 10)
        pdf.set_text_color(74, 74, 74)
        pdf.multi_cell(0, 6, summary[:1500], fill=True)
        pdf.ln(4)

    # ── Recommendations ───────────────────────────────────────────────
    if recs:
        pdf.set_font('Helvetica', 'B', 12)
        pdf.set_text_color(0, 100, 100)
        pdf.cell(0, 8, 'Medical Recommendations', new_x='LMARGIN', new_y='NEXT')
        pdf.line(10, pdf.get_y(), 200, pdf.get_y())
        pdf.ln(2)
        pdf.set_font('Helvetica', '', 10)
        pdf.set_text_color(44, 62, 80)
        for i, rec in enumerate(recs[:10], 1):
            pdf.multi_cell(0, 6, f'{i}. {rec[:300]}')
            pdf.ln(1)

    return bytes(pdf.output())


def html_to_pdf(html: str) -> bytes:
    """
    Convert a rendered HTML string to a PDF byte stream.

    Tries backends in order:
      1. WeasyPrint (Linux: libcairo2 + libgobject via apt)
      2. Playwright (Chromium headless — playwright install chromium)
      3. fpdf2     (Pure Python — ZERO system dependencies ✅)
      4. pdfkit    (last resort — needs wkhtmltopdf binary)

    Parameters
    ----------
    html : str  Fully rendered HTML string.
    Returns     bytes : Raw PDF content.
    Raises      RuntimeError : If all backends fail.
    """
    errors = {}

    # ── 1. WeasyPrint ─────────────────────────────────────────────────
    try:
        from weasyprint import HTML
        return HTML(string=html).write_pdf()
    except Exception as e:
        errors["weasyprint"] = str(e)
        print(f"[pdf_exporter] WeasyPrint unavailable: {e}")

    # ── 2. Playwright ─────────────────────────────────────────────────
    try:
        from playwright.sync_api import sync_playwright
        timeout_ms = int(os.getenv("PDF_PLAYWRIGHT_TIMEOUT_MS", "120000"))
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.set_content(html, wait_until="domcontentloaded", timeout=timeout_ms)
            pdf_bytes = page.pdf(
                format="A4",
                margin={"top": "20px", "right": "20px", "bottom": "20px", "left": "20px"},
            )
            browser.close()
        return pdf_bytes
    except Exception as e:
        errors["playwright"] = str(e)
        print(f"[pdf_exporter] Playwright unavailable: {e}")

    # ── 3. fpdf2 (Pure Python — ZERO system dependencies) ────────────
    try:
        return _fpdf2_pdf(html)
    except Exception as e:
        errors["fpdf2"] = str(e)
        print(f"[pdf_exporter] fpdf2 failed: {e}")

    # ── 4. pdfkit ─────────────────────────────────────────────────────
    try:
        import pdfkit
        return pdfkit.from_string(html, False, options={
            "page-size": "A4", "encoding": "UTF-8",
            "margin-top": "15mm", "margin-right": "15mm",
            "margin-bottom": "15mm", "margin-left": "15mm",
        })
    except Exception as e:
        errors["pdfkit"] = str(e)
        print(f"[pdf_exporter] pdfkit failed: {e}")

    raise RuntimeError(
        "All PDF backends failed.\n" +
        "\n".join(f"  {k}: {v}" for k, v in errors.items()) +
        "\n\nInstall fpdf2 (zero deps): pip install fpdf2"
    )
