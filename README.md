# Bidly

## CI/CD Pipeline

### Overview

```
PR opened → CI (validate) → merge to main → CD (build + deploy)
```

Two workflows handle the full pipeline:
- [validate-pr.yaml](.github/workflows/validate-pr.yaml) — runs on pull requests to `main` or `dev`
- [deploy.yaml](.github/workflows/deploy.yaml) — runs on push to `main`

---

### CI (Continuous Integration)

**Triggered by:** Pull requests to `main` or `dev`

**Jobs:**

**1. detect-changes**
Uses [dorny/paths-filter](https://github.com/dorny/paths-filter) to check which files changed in the PR. Each service maps to a folder glob:
```
users → backend/services/users/**
```
Outputs `true/false` per service. Other jobs read these outputs to decide whether to run.

**2. sast**
Runs [Semgrep](https://semgrep.dev) static analysis on Python and JavaScript code. Checks for common security vulnerabilities in source code before merge.

**3. build-and-scan**
Uses a matrix strategy to run the same steps for all 14 services in parallel. For each service:
- If unchanged → skips
- If changed → builds Docker image, then runs [Trivy](https://github.com/aquasecurity/trivy) to scan for CRITICAL vulnerabilities

Trivy is configured with `exit-code: 1` — if a CRITICAL CVE is found in the image (OS packages, Python/Node deps), the step fails and blocks the PR from merging.

CI does **not** push images anywhere. It only validates.

---

### CD (Continuous Deployment)

**Triggered by:**
- Push to `main`
- Manual trigger (Actions → CD → Run workflow)

**Prerequisites before first run:**
- GCP Workload Identity Federation configured
- GitHub repo variables set: `GCP_PROJECT_ID`, `GCP_PROJECT_NUMBER`
- GKE cluster named `bidly` in region `asia-southeast1`
- ArgoCD installed and configured (see ArgoCD Setup below)

**Jobs:**

**deploy**

Has a guard `if: github.actor != 'github-actions[bot]'` to prevent an infinite loop — when CD commits updated manifests back to main, it would re-trigger itself without this check.

Steps:

1. **detect-changes** — same as CI, detects which services changed
2. **Authenticate to GCP** — uses Workload Identity Federation (keyless auth, no long-lived credentials)
3. **Configure Docker** — authenticates Docker to push to `asia-southeast1-docker.pkg.dev`
4. **Configure kubectl** — connects to the GKE cluster `bidly`
5. **Apply k8s secrets** *(manual trigger only)* — applies all Kubernetes secrets from GitHub repo secrets to the cluster. Only runs on `workflow_dispatch` to avoid running on every push.
6. **Build, push, and update manifests** — for each changed service:
   - Builds Docker image tagged with the commit SHA
   - Pushes to GCP Artifact Registry
   - Updates the image tag in the corresponding `k8s/.../deployment.yaml` using `sed`
7. **Commit updated manifests** — commits the updated `k8s/` files back to `main` with message `chore: update images to <sha>`

ArgoCD detects the new commit and syncs the updated manifests to the cluster automatically.

---

### Kubernetes Secrets

Secrets are **not** managed by ArgoCD or committed to git with real values. The `k8s/secrets/*.yaml` files contain placeholder values only.

**First-time setup** — apply secrets manually to the cluster once:
```bash
kubectl apply -f k8s/secrets/supabase-secret.yaml   # fill real values first
kubectl apply -f k8s/secrets/stripe-secret.yaml
kubectl apply -f k8s/secrets/firebase-secret.yaml
kubectl apply -f k8s/secrets/sendgrid-secret.yaml
```

**Or use the manual CD trigger** (Actions → CD → Run workflow) which reads from GitHub repo secrets and applies them via kubectl. Use this when rotating secrets.

GitHub repo secrets required for the pipeline:
| Secret | Used by |
|--------|---------|
| `GCP_PROJECT_ID` | CD - GCP auth |
| `GCP_PROJECT_NUMBER` | CD - Workload Identity |
| `SUPABASE_URL` | k8s supabase-secret |
| `SUPABASE_KEY` | k8s supabase-secret |
| `STRIPE_API_KEY` | k8s stripe-secret |
| `STRIPE_WEBHOOK_SECRET` | k8s stripe-secret |
| `FIREBASE_SERVICE_ACCOUNT` | k8s firebase-secret |
| `SENDGRID_API_KEY` | k8s sendgrid-secret |

---

### ArgoCD Setup

ArgoCD watches the `k8s/` folder in `main` and syncs changes to the cluster automatically.

**Install ArgoCD:**
```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

**Create Application** pointing to this repo:
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: bidly
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/w3ixi4ng/Bidly
    targetRevision: main
    path: k8s/
  destination:
    server: https://kubernetes.default.svc
    namespace: bidly
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

`automated` makes ArgoCD sync on every new commit to `main` without manual intervention. `prune: true` removes resources deleted from manifests. `selfHeal: true` reverts manual kubectl changes.

---

### Branching Strategy

```
feature → dev → main
```

- PRs to `dev` or `main` trigger CI
- Only merges to `main` trigger CD and deploy to production
- Use `dev` for staging/testing before promoting to `main`

---

### Testing the Pipeline

**Test CD end-to-end:**
1. Make a small change to any service (e.g. add a comment in `backend/services/users/`)
2. Push to `main`
3. Watch Actions → CD workflow
4. Confirm a new commit `chore: update images to <sha>` appears on `main`
5. Check ArgoCD synced and pods restarted: `kubectl get pods -n bidly`

**Test secret apply:**
1. Actions → CD → Run workflow → Run workflow (on main)
2. After completion: `kubectl get secrets -n bidly`

**Verify running image:**
```bash
kubectl describe pod <pod-name> -n bidly | grep Image
```
Should show the commit SHA as the image tag.
