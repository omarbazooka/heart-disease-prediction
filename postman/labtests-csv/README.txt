

Lab portal CSV upload (Postman / lab operations — no patient JWT):
POST {{base_url}}/api/lab-portal/upload-csvs
Header: x-lab-key: <LAB_API_KEY from Backend .env>

Body -> form-data:
- key: files (type: File) -> select each CSV (1 to 5 times)

Single patient upload:
POST {{base_url}}/api/lab-portal/upload-csv
Header: x-lab-key: <LAB_API_KEY>
Body -> form-data: key file (type: File)

Rules:
- 1 to 5 CSV files on bulk upload
- 1 CSV per user (unique national_id) per bulk request
- lab_code must be only AL Borg Labs or Al Mokhtabar labs and MUST match lab_id's lab_code in DB
- national_id in each CSV is the patient; it does not need to match any logged-in user

Patient self-upload (frontend):
POST {{base_url}}/api/labtests/upload-csv
Header: Authorization: Bearer <patient token>
CSV national_id must match the logged-in patient.

Put these 5 CSV files in Postman request:
POST {{base_url}}/api/labtests/upload-csvs
Lab portal CSV upload (Postman / lab operations — no patient JWT):
POST {{base_url}}/api/lab-portal/upload-csvs
Header: x-lab-key: <LAB_API_KEY from Backend .env>

Body -> form-data:
- key: files (type: File) -> select each CSV (1 to 5 times)

Single patient upload:
POST {{base_url}}/api/lab-portal/upload-csv
Header: x-lab-key: <LAB_API_KEY>
Body -> form-data: key file (type: File)

Rules:
- 1 to 5 CSV files on bulk upload
- 1 CSV per user (unique national_id) per bulk request
- lab_code must be only AL Borg Labs or Al Mokhtabar labs and MUST match lab_id's lab_code in DB
- national_id in each CSV is the patient; it does not need to match any logged-in user

Patient self-upload (frontend):
POST {{base_url}}/api/labtests/upload-csv
Header: Authorization: Bearer <patient token>
CSV national_id must match the logged-in patient.
