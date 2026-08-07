#!/usr/bin/env bash
set -euo pipefail

: "${PROJECT_ID:?Set PROJECT_ID to your Google Cloud project id}"
: "${DATABASE_URL:?Set DATABASE_URL}"
: "${JWT_SECRET:?Set JWT_SECRET}"
: "${INTERNAL_API_KEY:?Set INTERNAL_API_KEY}"
: "${ADMIN_API_KEY:?Set ADMIN_API_KEY}"
: "${GROQ_API_KEY:?Set GROQ_API_KEY}"

REGION="${REGION:-europe-west1}"
CORS_ORIGIN="${CORS_ORIGIN:-https://heart-disease-prediction-kohl.vercel.app}"
LAB_API_KEY="${LAB_API_KEY:-$ADMIN_API_KEY}"

AI_SERVICE="${AI_SERVICE:-nabdak-ai}"
API_SERVICE="${API_SERVICE:-nabdak-api}"

echo "Using project: ${PROJECT_ID}"
echo "Using region:  ${REGION}"

gcloud config set project "${PROJECT_ID}" >/dev/null

gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com

echo "Deploying AI service..."
gcloud run deploy "${AI_SERVICE}" \
  --source apps/AI \
  --region "${REGION}" \
  --allow-unauthenticated \
  --execution-environment gen2 \
  --cpu 2 \
  --memory 4Gi \
  --timeout 300 \
  --min 0 \
  --max 1 \
  --set-env-vars "INTERNAL_API_KEY=${INTERNAL_API_KEY}" \
  --set-env-vars "DATABASE_URL=${DATABASE_URL}" \
  --set-env-vars "GROQ_API_KEY=${GROQ_API_KEY}"

AI_URL="$(gcloud run services describe "${AI_SERVICE}" --region "${REGION}" --format='value(status.url)')"
echo "AI service: ${AI_URL}"

echo "Deploying Node API..."
gcloud run deploy "${API_SERVICE}" \
  --source apps/Backend \
  --region "${REGION}" \
  --allow-unauthenticated \
  --execution-environment gen2 \
  --cpu 1 \
  --memory 512Mi \
  --timeout 300 \
  --min 0 \
  --max 1 \
  --set-env-vars "NODE_ENV=production" \
  --set-env-vars "DATABASE_URL=${DATABASE_URL}" \
  --set-env-vars "JWT_SECRET=${JWT_SECRET}" \
  --set-env-vars "JWT_EXPIRE=30d" \
  --set-env-vars "INTERNAL_API_KEY=${INTERNAL_API_KEY}" \
  --set-env-vars "AI_SERVICE_URL=${AI_URL}" \
  --set-env-vars "AI_REQUEST_TIMEOUT_MS=300000" \
  --set-env-vars "ADMIN_API_KEY=${ADMIN_API_KEY}" \
  --set-env-vars "LAB_API_KEY=${LAB_API_KEY}" \
  --set-env-vars "CORS_ORIGIN=${CORS_ORIGIN}"

API_URL="$(gcloud run services describe "${API_SERVICE}" --region "${REGION}" --format='value(status.url)')"

echo
echo "Cloud Run deployment complete."
echo "Nabdak API: ${API_URL}"
echo "Nabdak AI:  ${AI_URL}"
echo "Frontend allowed origin: ${CORS_ORIGIN}"
echo
echo "Set the Heart frontend API base URL to: ${API_URL}"
