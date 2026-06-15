import pypdf

try:
    reader = pypdf.PdfReader("test_ecg_report.pdf")
    print(f"Total pages: {len(reader.pages)}")
    for i, page in enumerate(reader.pages):
        print(f"\n--- PAGE {i+1} ---")
        print(page.extract_text()[:1000])
except Exception as e:
    print("Error reading PDF:", e)
