import io
import os
from datetime import datetime
from jinja2 import Environment, FileSystemLoader

from services.pdf_exporter import html_to_pdf

def generate_medical_report_pdf(patient_data, risk_score, llm_report, images_base64, lab_data=None, lab_test_data=None):
    """
    Generates a PDF medical report from a Jinja2 template.

    Args:
        patient_data (dict): Dictionary containing patient demographic and clinical data.
        risk_score (int/float): The AI-calculated risk percentage.
        llm_report (dict): Contains 'summary' (str) and 'recommendations' (list of str).
        images_base64 (dict): Contains base64 strings for 'university_logo', 'risk_gauge', and 'shap_plot'.

    Returns:
        io.BytesIO: Byte stream containing the generated PDF.
    """
    # Get the directory where the templates are stored
    current_dir = os.path.dirname(os.path.abspath(__file__))
    templates_dir = os.path.join(os.path.dirname(current_dir), 'templates')

    # Setup Jinja2 environment
    env = Environment(loader=FileSystemLoader(templates_dir))
    template = env.get_template('report_template.html')

    # Render template with provided data
    current_date = datetime.now().strftime("%d %B %Y")
    
    html_out = template.render(
        patient=patient_data,
        risk_score=risk_score,
        llm_report=llm_report,
        images=images_base64,
        date=current_date,
        lab=lab_data or {},
        lab_test=lab_test_data or {}
    )


    # HTML → PDF via pdf_exporter (Playwright first, then WeasyPrint / xhtml2pdf / pdfkit).
    pdf_bytes = html_to_pdf(html_out)

    # Generate PDF using Playwright. Do not use wait_until="load": the template loads
    # Google Fonts over the network; slow/offline DNS causes load to hang until timeout.
    from playwright.sync_api import sync_playwright

    timeout_ms = int(os.getenv("PDF_PLAYWRIGHT_TIMEOUT_MS", "120000"))
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_content(
            html_out,
            wait_until="domcontentloaded",
            timeout=timeout_ms,
        )
        pdf_bytes = page.pdf(
            format="A4",
            margin={"top": "20px", "right": "20px", "bottom": "20px", "left": "20px"},
        )
        browser.close()


    pdf_file = io.BytesIO(pdf_bytes)
    return pdf_file
