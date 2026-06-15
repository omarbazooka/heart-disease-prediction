"""
report/pdf_exporter.py
──────────────────────────────────────────────────────────────────────────
PDF Conversion Layer — converts rendered HTML string to PDF bytes.

Strategy (in order):
  1. WeasyPrint  — best on Linux (needs libcairo2 at runtime; installed via apt)
  2. Playwright  — Chromium headless (playwright install chromium in build step)
  3. pdfkit      — needs wkhtmltopdf binary installed

Single responsibility: HTML string → PDF bytes.
"""

import io
import os


def html_to_pdf(html: str) -> bytes:
    """
    Convert a rendered HTML string to a PDF byte stream.

    Tries backends in order:
      1. WeasyPrint (Linux: libcairo2 via apt in nixpacks.toml)
      2. Playwright (Chromium headless — playwright install chromium)
      3. pdfkit (last resort — needs wkhtmltopdf binary)

    Parameters
    ----------
    html : str
        Fully rendered HTML string.

    Returns
    -------
    bytes : Raw PDF content.

    Raises
    ------
    RuntimeError : If all backends fail.
    """
    errors = {}

    # ── 1. WeasyPrint (best on Linux — libcairo2 provided via apt) ────
    try:
        from weasyprint import HTML
        return HTML(string=html).write_pdf()
    except Exception as e:
        errors["weasyprint"] = str(e)
        print(f"[pdf_exporter] WeasyPrint unavailable: {e}")

    # ── 2. Playwright (Chromium headless) ─────────────────────────────
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

    # ── 3. pdfkit (needs wkhtmltopdf binary) ──────────────────────────
    try:
        import pdfkit
        options = {
            "page-size":     "A4",
            "encoding":      "UTF-8",
            "margin-top":    "15mm",
            "margin-right":  "15mm",
            "margin-bottom": "15mm",
            "margin-left":   "15mm",
        }
        return pdfkit.from_string(html, False, options=options)
    except Exception as e:
        errors["pdfkit"] = str(e)
        print(f"[pdf_exporter] pdfkit failed: {e}")

    raise RuntimeError(
        "All PDF backends failed.\n" +
        "\n".join(f"  {k}: {v}" for k, v in errors.items()) +
        "\n\nInstall one of:\n"
        "  WeasyPrint : pip install weasyprint  (Linux: needs libcairo2 via apt)\n"
        "  Playwright : pip install playwright && playwright install chromium\n"
        "  pdfkit     : pip install pdfkit + wkhtmltopdf binary"
    )
