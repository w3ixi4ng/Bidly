#!/bin/bash
set -e

K8S_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "==> Applying namespace..."
kubectl apply -f "$K8S_DIR/namespace.yaml"

echo "==> Applying managed certificate..."
kubectl apply -f "$K8S_DIR/managed-certificate.yaml"

echo "==> Applying secrets..."
kubectl apply -f "$K8S_DIR/secrets/"

echo "==> Applying infrastructure..."
kubectl apply -R -f "$K8S_DIR/infrastructure/"

echo "==> Applying services..."
kubectl apply -R -f "$K8S_DIR/services/"

echo "==> Applying orchestrators..."
kubectl apply -R -f "$K8S_DIR/orchestrators/"

echo "==> Applying ingress..."
kubectl apply -f "$K8S_DIR/ingress.yaml"

echo "Done."
