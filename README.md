<div align="center">

<h1 align="center"><b>🔨&nbsp; Bidly</b></h1>

**A real-time task bidding platform — post tasks, receive competitive bids, get things done.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-bidly--esd.vercel.app-black?style=for-the-badge&logo=vercel)](https://bidly-esd.vercel.app)
[![TypeScript](https://img.shields.io/badge/TypeScript-74.7%25-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-20.1%25-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![GKE](https://img.shields.io/badge/Deployed%20on-GKE-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white)](https://cloud.google.com/kubernetes-engine)

</div>

---

## 📖 Overview

**Bidly** is a full-stack, production-grade task bidding marketplace where clients post tasks and freelancers submit competitive bids. The platform is built on a **microservices architecture** with **event-driven orchestration**, enabling real-time bidding, in-app chat, and secure payments — all deployed to **Google Kubernetes Engine (GKE)**.

### Key Features

- 🧑‍💼 **Task Posting** — Clients create tasks with budgets and deadlines
- 💬 **Live Bidding** — Freelancers compete with real-time competitive bids powered by Redis atomic operations
- 📡 **Real-Time Updates** — WebSocket-driven notifications for bids and chat via Socket.io
- 💳 **Secure Payments** — Stripe-integrated payment flows with webhook handling
- 📧 **Email Notifications** — Transactional email via SendGrid
- 🔐 **Auth & Access Control** — Firebase Authentication with JWT interceptors
- 📊 **Observability** — Full Prometheus + Grafana monitoring stack
- 🛡️ **Security Scanning** — SAST (Semgrep) and container scanning (Trivy) in CI pipeline

---

## 🏗️ Architecture

### System Architecture
![System Architecture](https://github.com/w3ixi4ng/Bidly/raw/main/assets/system_architecture.png)

### Cloud Architecture
![Cloud Architecture](https://github.com/w3ixi4ng/Bidly/raw/main/assets/cloud_overview.png)

### Kubernetes Architecture
![Kubernetes Architecture](https://github.com/w3ixi4ng/Bidly/raw/main/assets/kubernetes.png)

### CI/CD Pipeline
![CI/CD Pipeline](https://github.com/w3ixi4ng/Bidly/raw/main/assets/cicd.png)

---

## 🛠️ Tech Stack

### Frontend
[![React](https://img.shields.io/badge/React-SPA-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-Typed-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-Build%20Tool-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![React Router](https://img.shields.io/badge/React%20Router-Routing-CA4245?style=flat-square&logo=reactrouter&logoColor=white)](https://reactrouter.com)
[![Zustand](https://img.shields.io/badge/Zustand-State%20Management-orange?style=flat-square)](https://zustand-demo.pmnd.rs)
[![Axios](https://img.shields.io/badge/Axios-HTTP%20Client-5A29E4?style=flat-square&logo=axios&logoColor=white)](https://axios-http.com)
[![Socket.io](https://img.shields.io/badge/Socket.io-Real--Time-010101?style=flat-square&logo=socket.io&logoColor=white)](https://socket.io)
[![Stripe](https://img.shields.io/badge/Stripe-Payments%20UI-635BFF?style=flat-square&logo=stripe&logoColor=white)](https://stripe.com)
[![GSAP](https://img.shields.io/badge/GSAP-Animations-88CE02?style=flat-square&logo=greensock&logoColor=black)](https://gsap.com)
[![Vercel](https://img.shields.io/badge/Vercel-Hosting-000000?style=flat-square&logo=vercel&logoColor=white)](https://vercel.com)

### Backend — Microservices
[![Python](https://img.shields.io/badge/Python-Microservices-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-REST%20Services-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Node.js](https://img.shields.io/badge/Node.js-Auxiliary%20Services-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-Web%20Framework-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com)
[![Kong](https://img.shields.io/badge/Kong-API%20Gateway-003459?style=flat-square&logo=kong&logoColor=white)](https://konghq.com)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-Event%20Broker-FF6600?style=flat-square&logo=rabbitmq&logoColor=white)](https://www.rabbitmq.com)
[![Redis](https://img.shields.io/badge/Redis-Auction%20State-FF4438?style=flat-square&logo=redis&logoColor=white)](https://redis.io)
[![Supabase](https://img.shields.io/badge/Supabase-Primary%20DB-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![Firestore](https://img.shields.io/badge/Firestore-Chat%20Logs-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com/products/firestore)
[![OutSystems](https://img.shields.io/badge/OutSystems-Low%20Code%20Service-E4003A?style=flat-square)](https://www.outsystems.com)
[![Swagger](https://img.shields.io/badge/Swagger-API%20Docs-85EA2D?style=flat-square&logo=swagger&logoColor=black)](https://swagger.io)

### Infrastructure & DevSecOps
[![GKE](https://img.shields.io/badge/GKE-Orchestration-4285F4?style=flat-square&logo=google-cloud&logoColor=white)](https://cloud.google.com/kubernetes-engine)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-Container%20Mgmt-326CE5?style=flat-square&logo=kubernetes&logoColor=white)](https://kubernetes.io)
[![Docker](https://img.shields.io/badge/Docker-Containerisation-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com)
[![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-CI%2FCD-2088FF?style=flat-square&logo=githubactions&logoColor=white)](https://github.com/features/actions)
[![Argo CD](https://img.shields.io/badge/Argo%20CD-GitOps-EF7B4D?style=flat-square&logo=argo&logoColor=white)](https://argoproj.github.io/cd)
[![Prometheus](https://img.shields.io/badge/Prometheus-Metrics-E6522C?style=flat-square&logo=prometheus&logoColor=white)](https://prometheus.io)
[![Grafana](https://img.shields.io/badge/Grafana-Dashboards-F46800?style=flat-square&logo=grafana&logoColor=white)](https://grafana.com)
[![Semgrep](https://img.shields.io/badge/Semgrep-SAST-1B2D55?style=flat-square)](https://semgrep.dev)
[![Trivy](https://img.shields.io/badge/Trivy-Container%20Scanning-1904DA?style=flat-square)](https://aquasecurity.github.io/trivy)

### External Services
[![Stripe](https://img.shields.io/badge/Stripe-Payments-635BFF?style=flat-square&logo=stripe&logoColor=white)](https://stripe.com)
[![SendGrid](https://img.shields.io/badge/SendGrid-Email-1A82E2?style=flat-square&logo=twilio&logoColor=white)](https://sendgrid.com)
[![Firebase](https://img.shields.io/badge/Firebase-Auth-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com)

---

## 🌐 Deployed Endpoints

| Domain | Purpose |
|---|---|
| [`bidly-esd.vercel.app`](https://bidly-esd.vercel.app) | Frontend (Vercel) |
| `bidly-backend.com` | Kong API Gateway — all backend traffic (GKE) |
| `argocd.bidly-backend.com` | Argo CD GitOps dashboard |
| `grafana.bidly-backend.com` | Grafana observability dashboard |

---

## 🚀 Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Node.js & npm](https://nodejs.org/)
- `kubectl` + `gcloud` CLI *(for GKE deployment only)*
- Any IDE

### Environment Variables

Create the following `.env` files **before** starting the services.

**Backend** — place at the **project root** (alongside `docker-compose.yaml`):

<details>
<summary><code>.env.supabase</code></summary>

```env
SUPABASE_URL=<your_supabase_url>
SUPABASE_KEY=<your_supabase_anon_key>
SUPABASE_SERVICE_KEY=<your_supabase_service_role_key>
```
</details>

<details>
<summary><code>.env.firebase</code></summary>

```env
FIREBASE_SERVICE_ACCOUNT=<your_firebase_service_account_json_as_single_line_string>
```
</details>

<details>
<summary><code>.env.stripe</code></summary>

```env
STRIPE_API_KEY=<your_stripe_secret_key>
STRIPE_WEBHOOK_SECRET=<your_stripe_webhook_secret>
```
</details>

<details>
<summary><code>.env.twilio</code></summary>

```env
SENDGRID_API_KEY=<your_sendgrid_api_key>
```
</details>

**Frontend** — place inside the `frontend/` directory:

<details>
<summary><code>frontend/.env</code></summary>

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_URL=http://localhost:8000
VITE_STRIPE_PUBLISHABLE_KEY=<your_stripe_publishable_key>
```
</details>

### Running Locally

> ⚠️ Make sure **Docker Desktop** is running before proceeding.

**1. Start all backend services:**

```bash
docker-compose up -d --build
```

**2. Start the frontend dev server:**

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173` by default.

---

## 📁 Project Structure

```
Bidly/
├── .github/
│   └── workflows/          # GitHub Actions CI/CD pipelines
├── argocd/                 # Argo CD GitOps configuration
├── assets/                 # Architecture diagrams & static assets
├── backend/                # Microservices (FastAPI + Express)
├── frontend/               # React + TypeScript SPA
├── k8s/                    # Kubernetes manifests (GKE)
├── docker-compose.yaml     # Local development orchestration
└── README.md
```

---

## 🔒 Security

The CI/CD pipeline enforces automated security checks on every push:

- **Semgrep** — static analysis (SAST) for code-level vulnerabilities
- **Trivy** — container image scanning for known CVEs
- All images are pushed to **GCP Artifact Registry** only after passing security gates

---

## 👥 Contributors

<div align="center">

| Wei Xiang | Jeryl | Matthew | Joshua | Delroy | Akash |
|:---:|:---:|:---:|:---:|:---:|:---:|

</div>

---

<div align="center">

Built with ❤️ for ESD · Deployed on GKE · Hosted on Vercel

</div>