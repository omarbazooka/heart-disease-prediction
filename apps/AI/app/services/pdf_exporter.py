"""
report/pdf_exporter.py
──────────────────────────────────────────────────────────────────────────
PDF Conversion Layer — converts rendered HTML string to PDF bytes.

Strategy (in order):
<<<<<<< HEAD
  1. Playwright + Chromium — prebuilt wheels on Windows (no MSVC). After
     `pip install playwright`, run once: `playwright install chromium`
  2. WeasyPrint  — best quality (needs GTK3 on Windows)
  3. xhtml2pdf   — often fails to install on Python 3.13+Windows (python-bidi
     builds from Rust and needs Visual Studio Build Tools / link.exe)
  4. pdfkit      — needs wkhtmltopdf binary installed
=======
  1. WeasyPrint  — best quality (needs GTK3 on Windows)
  2. xhtml2pdf   — pure Python, no binaries, works on Windows
  3. pdfkit      — needs wkhtmltopdf binary installed
>>>>>>> 3a5e7c62be61d9bf6bde782a67674acea097339c

Single responsibility: HTML string → PDF bytes.
"""

import io
<<<<<<< HEAD
import os
=======
>>>>>>> 3a5e7c62be61d9bf6bde782a67674acea097339c


def html_to_pdf(html: str) -> bytes:
    """
    Convert a rendered HTML string to a PDF byte stream.

    Tries backends in order:
<<<<<<< HEAD
      1. Playwright (Chromium headless)
      2. WeasyPrint
      3. xhtml2pdf (pisa)
      4. pdfkit
=======
      1. WeasyPrint  (preferred — best CSS support)
      2. xhtml2pdf   (pure Python fallback — works everywhere)
      3. pdfkit      (last resort — needs wkhtmltopdf binary)
>>>>>>> 3a5e7c62be61d9bf6bde782a67674acea097339c

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

<<<<<<< HEAD
    # ── 1. Playwright (recommended on Windows — avoids python-bidi / Rust build) ─
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

    # ── 2. WeasyPrint ─────────────────────────────────────────────────
=======
    # ── 1. WeasyPrint ─────────────────────────────────────────────────
>>>>>>> 3a5e7c62be61d9bf6bde782a67674acea097339c
    try:
        from weasyprint import HTML
        return HTML(string=html).write_pdf()
    except Exception as e:
        errors["weasyprint"] = str(e)
        print(f"[pdf_exporter] WeasyPrint unavailable: {e}")

<<<<<<< HEAD
    # ── 3. xhtml2pdf (may not install on Py3.13 + Windows without MSVC) ─
=======
    # ── 2. xhtml2pdf (pure Python — works on Windows without binaries) ─
>>>>>>> 3a5e7c62be61d9bf6bde782a67674acea097339c
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

<<<<<<< HEAD
    # ── 4. pdfkit (needs wkhtmltopdf binary) ──────────────────────────
=======

    # ── 3. pdfkit (needs wkhtmltopdf binary) ──────────────────────────
>>>>>>> 3a5e7c62be61d9bf6bde782a67674acea097339c
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
<<<<<<< HEAD
        "\n\nRecommended on Windows (especially Python 3.13):\n"
        "  pip install playwright\n"
        "  playwright install chromium\n"
        "\nAlternatives:\n"
        "  - xhtml2pdf : often needs Visual Studio C++ Build Tools on Py 3.13\n"
        "  - WeasyPrint: pip install weasyprint + GTK runtime (Windows)\n"
        "  - pdfkit    : pip install pdfkit + wkhtmltopdf binary"
=======
        "\n\nInstall one of:\n"
        "  - xhtml2pdf  : pip install xhtml2pdf          (pure Python)\n"
        "  - WeasyPrint : pip install weasyprint + GTK3  (Windows: needs runtime)\n"
        "  - pdfkit     : pip install pdfkit + wkhtmltopdf binary"
>>>>>>> 3a5e7c62be61d9bf6bde782a67674acea097339c
    )
