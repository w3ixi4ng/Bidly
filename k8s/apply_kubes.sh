#!/bin/bash
set -e

K8S_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$K8S_DIR")"

# 1. Namespace
kubectl apply -f "$K8S_DIR/cluster/namespace.yaml"

# 2. Secrets
kubectl create secret generic supabase-secret --from-env-file="$ROOT_DIR/.env.supabase" -n bidly --dry-run=client -o yaml | kubectl apply -f -
kubectl create secret generic stripe-secret --from-env-file="$ROOT_DIR/.env.stripe" -n bidly --dry-run=client -o yaml | kubectl apply -f -
kubectl create secret generic firebase-secret --from-env-file="$ROOT_DIR/.env.firebase" -n bidly --dry-run=client -o yaml | kubectl apply -f -
kubectl create secret generic twilio-secret --from-env-file="$ROOT_DIR/.env.twilio" -n bidly --dry-run=client -o yaml | kubectl apply -f -

# 3. ConfigMaps
kubectl apply -f "$K8S_DIR/cluster/configmap.yaml"
kubectl apply -f "$K8S_DIR/infrastructure/rabbitmq/configmap.yaml"
kubectl apply -f "$K8S_DIR/infrastructure/kong/configmap.yaml"

# 4. PVCs
kubectl apply -f "$K8S_DIR/infrastructure/rabbitmq/pvc.yaml"
kubectl apply -f "$K8S_DIR/infrastructure/redis/pvc.yaml"

# 5. Services
kubectl apply -f "$K8S_DIR/infrastructure/rabbitmq/service.yaml"
kubectl apply -f "$K8S_DIR/infrastructure/redis/service.yaml"
kubectl apply -f "$K8S_DIR/infrastructure/kong/service.yaml"
kubectl apply -f "$K8S_DIR/infrastructure/kong/backendconfig.yaml"

# 6. Deployments
kubectl apply -f "$K8S_DIR/infrastructure/rabbitmq/deployment.yaml"
kubectl apply -f "$K8S_DIR/infrastructure/redis/deployment.yaml"
kubectl apply -f "$K8S_DIR/infrastructure/kong/deployment.yaml"

# 7. Jobs
kubectl apply -f "$K8S_DIR/infrastructure/rabbitmq/setup-job.yaml"

# 8. App Services + Orchestrators
kubectl apply -R -f "$K8S_DIR/services/"
kubectl apply -R -f "$K8S_DIR/orchestrators/"

# 9. Install ArgoCD
kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# 10. ArgoCD Apps
kubectl apply -f "$ROOT_DIR/apps/argocd-app.yaml"
kubectl apply -f "$ROOT_DIR/apps/monitoring.yaml"

# 11. Ingresses
kubectl apply -f "$K8S_DIR/infrastructure/ingress/managed-certificate.yaml"
kubectl apply -f "$K8S_DIR/infrastructure/ingress/ingress.yaml"
kubectl apply -f "$K8S_DIR/infrastructure/argocd/managed-certificate.yaml"
kubectl apply -f "$K8S_DIR/infrastructure/argocd/ingress.yaml"
kubectl apply -f "$K8S_DIR/infrastructure/monitoring/managed-certificate.yaml"
kubectl apply -f "$K8S_DIR/infrastructure/monitoring/ingress.yaml"

# Get ArgoCD password
kubectl get secret argocd-initial-admin-secret -n argocd -o jsonpath="{.data.password}" | base64 -d && echo

# Checking
kubectl get pods -n bidly
kubectl get svc -n bidly
