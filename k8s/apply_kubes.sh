#!/bin/bash
set -e

K8S_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "==> Applying namespace..."
kubectl apply -f "$K8S_DIR/namespace.yaml"

echo "==> Applying managed certificate..."
kubectl apply -f "$K8S_DIR/managed-certificate.yaml"

echo "==> Applying secrets from .env files..."

ROOT_DIR="$(dirname "$K8S_DIR")"

kubectl create secret generic supabase-secret --from-env-file="$ROOT_DIR/.env.supabase" -n bidly --dry-run=client -o yaml | kubectl apply -f -
kubectl create secret generic stripe-secret --from-env-file="$ROOT_DIR/.env.stripe" -n bidly --dry-run=client -o yaml | kubectl apply -f -
kubectl create secret generic firebase-secret --from-env-file="$ROOT_DIR/.env.firebase" -n bidly --dry-run=client -o yaml | kubectl apply -f -
kubectl create secret generic twilio-secret --from-env-file="$ROOT_DIR/.env.twilio" -n bidly --dry-run=client -o yaml | kubectl apply -f -

echo "==> Applying infrastructure..."
kubectl apply -R -f "$K8S_DIR/infrastructure/"

echo "==> Applying services..."
kubectl apply -R -f "$K8S_DIR/services/"

echo "==> Applying orchestrators..."
kubectl apply -R -f "$K8S_DIR/orchestrators/"

echo "==> Applying ingress..."
kubectl apply -f "$K8S_DIR/ingress.yaml"

echo "Done."
