"""
report/pdf_exporter.py
──────────────────────────────────────────────────────────────────────────
PDF Conversion Layer — converts rendered HTML string to PDF bytes.

Strategy (in order):
  1. WeasyPrint  — best quality on Linux (no binaries needed on Linux)
  2. xhtml2pdf   — pure Python, works everywhere (pip install xhtml2pdf)
  3. Playwright  — Chromium headless (run: playwright install chromium)
  4. pdfkit      — needs wkhtmltopdf binary installed

Single responsibility: HTML string → PDF bytes.
"""

import io
import os


def html_to_pdf(html: str) -> bytes:
    """
    Convert a rendered HTML string to a PDF byte stream.

    Tries backends in order:
      1. WeasyPrint (best on Linux)
      2. xhtml2pdf (pure Python fallback)
      3. Playwright (Chromium headless)
      4. pdfkit (last resort)

    Parameters
    ----------
    html : str
        Fully rendered HTML string from renderer.render_report().

    Returns
    -------
    bytes : Raw PDF content.

    Raises
    ------
    RuntimeError : If all backends fail.
    """
    errors = {}

    # ── 1. WeasyPrint (best on Linux — no binary downloads needed) ────
    try:
        from weasyprint import HTML
        return HTML(string=html).write_pdf()
    except Exception as e:
        errors["weasyprint"] = str(e)
        print(f"[pdf_exporter] WeasyPrint unavailable: {e}")

    # ── 2. xhtml2pdf (pure Python — works on Linux without binaries) ──
    try:
        from xhtml2pdf import pisa
        from pathlib import Path as _Path
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont

        # Register Amiri Arabic font if available
        _font_dir = _Path(__file__).resolve().parent.parent.parent / "assets" / "fonts"
        _regular = _font_dir / "Amiri-Regular.ttf"
        _bold    = _font_dir / "Amiri-Bold.ttf"
        if _regular.exists():
            pdfmetrics.registerFont(TTFont("Amiri", str(_regular)))
        if _bold.exists():
            pdfmetrics.registerFont(TTFont("Amiri-Bold", str(_bold)))

        buf = io.BytesIO()
        result = pisa.CreatePDF(
            src=html.encode("utf-8"),
            dest=buf,
            encoding="utf-8",
        )
        if not result.err:
            buf.seek(0)
            return buf.read()
        else:
            errors["xhtml2pdf"] = f"pisa reported errors: {result.err}"
            print(f"[pdf_exporter] xhtml2pdf errors: {result.err}")
    except Exception as e:
        errors["xhtml2pdf"] = str(e)
        print(f"[pdf_exporter] xhtml2pdf failed: {e}")

    # ── 3. Playwright (Chromium headless — run: playwright install chromium) ─
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

    # ── 4. pdfkit (needs wkhtmltopdf binary) ──────────────────────────
    try:
        import pdfkit
        options = {
            "page-size":    "A4",
            "encoding":     "UTF-8",
            "margin-top":   "15mm",
            "margin-right": "15mm",
            "margin-bottom":"15mm",
            "margin-left":  "15mm",
        }
        return pdfkit.from_string(html, False, options=options)
    except Exception as e:
        errors["pdfkit"] = str(e)
        print(f"[pdf_exporter] pdfkit failed: {e}")

    raise RuntimeError(
        "All PDF backends failed.\n" +
        "\n".join(f"  {k}: {v}" for k, v in errors.items()) +
        "\n\nInstall one of:\n"
        "  WeasyPrint : pip install weasyprint  (Linux: works natively)\n"
        "  xhtml2pdf  : pip install xhtml2pdf reportlab  (pure Python)\n"
        "  Playwright : pip install playwright && playwright install chromium\n"
        "  pdfkit     : pip install pdfkit + wkhtmltopdf binary"
    )
