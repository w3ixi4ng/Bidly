# Bidly Kubernetes

All Kubernetes manifests for the Bidly platform, deployed on GKE. After the one-time bootstrap, ArgoCD manages this directory via GitOps — every push to `main` is automatically synced to the cluster.

---

## Directory Structure

```
k8s/
├── apply_kubes.sh          # Bootstrap script (Linux/macOS)
├── apply_kubes.bat         # Bootstrap script (Windows)
├── cluster/
│   ├── namespace.yaml      # bidly namespace
│   └── configmap.yaml      # Shared env vars (e.g. FRONTEND_URL)
├── infrastructure/
│   ├── rabbitmq/           # Deployment, Service, PVC, ConfigMap, setup Job
│   ├── redis/              # Deployment, Service, PVC
│   ├── kong/               # Deployment, Service, ConfigMap, BackendConfig
│   ├── ingress/            # GCE Ingress + GCP managed certificate (bidly-backend.com)
│   ├── argocd/             # GCE Ingress + managed certificate (argocd.bidly-backend.com)
│   └── monitoring/         # GCE Ingress + managed certificate (grafana.bidly-backend.com)
├── services/
│   ├── users/              # Port 8004
│   ├── bids/               # Port 8003
│   ├── tasks/              # Port 8001
│   ├── chats/              # Port 8005
│   ├── chat-logs/          # Port 8006
│   ├── notifications/      # Port 8008
│   ├── payment/            # Port 8002
│   └── websocket/          # Port 8007
└── orchestrators/
    ├── create-task/        # Port 8009
    ├── connect-chat/
    ├── handle-payment/
    ├── process-winner/
    ├── send-notifications/
    └── start-auction/
```

Each service and orchestrator folder contains:
- `deployment.yaml` — pod spec, image, resource requests
- `service.yaml` — ClusterIP service
- `hpa.yaml` — HorizontalPodAutoscaler (min: 1, max: 3, CPU target: 70%)

---

## Bootstrap (First-Time Setup)

Run once to provision a fresh cluster. Requires:
- GKE cluster created with Metrics Server enabled (default on GKE)
- `kubectl` context pointing to the cluster
- Secret env files at the repo root: `.env.supabase`, `.env.stripe`, `.env.firebase`, `.env.twilio`

```bash
# Linux/macOS
chmod +x apply_kubes.sh
./apply_kubes.sh

# Windows
apply_kubes.bat
```

### Deployment Order

| Step | Resources |
|------|-----------|
| 1 | `cluster/namespace.yaml` |
| 2 | Secrets — `supabase-secret`, `stripe-secret`, `firebase-secret`, `twilio-secret` |
| 3 | ConfigMaps — `cluster/configmap.yaml`, RabbitMQ, Kong |
| 4 | PVCs — RabbitMQ, Redis |
| 5 | Infrastructure Services — RabbitMQ, Redis, Kong + BackendConfig |
| 6 | Infrastructure Deployments — RabbitMQ, Redis, Kong |
| 7 | RabbitMQ setup Job |
| 8 | All app services + orchestrators (`-R`) |
| 9 | Install ArgoCD (`argocd` namespace) |
| 10 | ArgoCD apps — `apps/argocd-app.yaml`, `apps/monitoring.yaml` |
| 11 | All ingresses + managed certs (bidly, argocd, monitoring) |

After step 11, ArgoCD takes over — all future changes deploy automatically on push to `main`.

---

## Secrets

Secrets are created from `.env` files at the repo root (not committed to git):

| Secret name | Source file | Used by |
|---|---|---|
| `supabase-secret` | `.env.supabase` | All services with a database |
| `stripe-secret` | `.env.stripe` | payment service |
| `firebase-secret` | `.env.firebase` | chat-logs service |
| `twilio-secret` | `.env.twilio` | notifications service |

To update a secret after initial deploy:
```bash
kubectl create secret generic <name> --from-env-file=<file> -n bidly --dry-run=client -o yaml | kubectl apply -f -
```

---

## Autoscaling

All services (except websocket) and all orchestrators have an HPA.

```bash
kubectl get hpa -n bidly
```

---

## Ingresses

| Domain | Namespace | Backend |
|---|---|---|
| `bidly-backend.com` | `bidly` | Kong (port 8000) |
| `argocd.bidly-backend.com` | `argocd` | argocd-server (port 80) |
| `grafana.bidly-backend.com` | `monitoring` | monitoring-grafana (port 80) |

All ingresses use GCE class with GCP-managed TLS certificates. Certificates provision automatically but can take up to 30 minutes after DNS is pointed at the static IPs.

Static IPs required in GCP:
- `bidly-ingress-ip`
- `argocd-ingress-ip`
- `grafana-ingress-ip`

---

## Useful Commands

```bash
# Check pod status
kubectl get pods -n bidly

# Check autoscalers
kubectl get hpa -n bidly

# Check ingresses
kubectl get ingress -n bidly
kubectl get managedcertificate -n bidly

# ArgoCD admin password
kubectl get secret argocd-initial-admin-secret -n argocd \
  -o jsonpath="{.data.password}" | base64 -d && echo

# View logs
kubectl logs -f deployment/<name> -n bidly
```
