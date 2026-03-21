# Bidly 🔨

**Bidly** is a real-time task bidding platform where users can post tasks and receive competitive bids from service providers. Built with a microservices architecture, event-driven orchestration, and deployed on Google Cloud Platform.

---

## Prerequisites

- Docker Desktop
- Node Package Manager (npm)
- kubectl
- IDE (Any)

---

## Local Setup

> Ensure Docker Desktop is running

1. Start all backend services:
```bash
cd backend
docker-compose up -d --build
```

2. Start the frontend:
```bash
cd frontend
npm i
npm run dev
```

---

## System Architecture Diagram

![System Architecture](assets/system_architecture.png)

## Cloud Architecture Diagram

## Kubernetes Architecture Diagram

![Kubernetes Architecture](assets/kubernetes.png)

## CI/CD Pipeline

![CICD Pipeline](assets/cicd.png)

---

## Technical Implementations

### Backend
- **Microservice Architecture** with loosely coupled atomic services
- **Event-Driven Orchestration** via RabbitMQ for async workflows
- **Swagger UI** auto-generated API documentation via FastAPI
- **WebSocket** server consuming RabbitMQ events for real-time updates
- **Kong API Gateway** for routing, CORS, and rate limiting
- **Redis** for real-time auction state with atomic bid placement via Lua scripting
- **Supabase (PostgreSQL)** as primary database
- **Firestore** for chat log storage
- **OutSystems** as low code provider and external microservice
- **Prometheus & Grafana** for metrics collection and observability dashboards
- **CI/CD pipeline** with automated Docker builds and GCP Artifact Registry pushes
- **Security scanning** with Semgrep (SAST) and Trivy (container vulnerabilities)
- **Argo CD** GitOps sync for Kubernetes deployments
- **GKE deployment** via declarative Kubernetes YAML manifests

### Frontend
- React + TypeScript + Vite SPA
- React Router for client-side routing
- Zustand for state management
- Axios for HTTP with JWT interceptors and token refresh
- Socket.io for real-time bid and chat updates
- Stripe React SDK for payment UI
- GSAP animations
- Deployed on Vercel

---

## Frameworks and Technologies

<p align="center"><strong>UI Stack</strong></p>
<p align="center">
<a href="https://vitejs.dev/"><img src="https://upload.wikimedia.org/wikipedia/commons/f/f1/Vitejs-logo.svg" alt="Vite" width="40"/></a>&nbsp;&nbsp;
<a href="https://react.dev/"><img src="https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg" alt="React" width="40"/></a>&nbsp;&nbsp;
<a href="https://www.typescriptlang.org/"><img src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Typescript_logo_2020.svg/1200px-Typescript_logo_2020.svg.png" alt="TypeScript" width="40"/></a>&nbsp;&nbsp;
<a href="https://reactrouter.com/"><img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/reactrouter/reactrouter-original.svg" alt="React Router" width="40"/></a>&nbsp;&nbsp;
<a href="https://zustand-demo.pmnd.rs/"><img src="https://raw.githubusercontent.com/pmndrs/zustand/main/examples/demo/public/logo192.png" alt="Zustand" width="40"/></a>&nbsp;&nbsp;
<a href="https://axios-http.com/"><img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/axios/axios-plain-wordmark.svg" alt="Axios" width="40"/></a>&nbsp;&nbsp;
<a href="https://gsap.com/"><img src="https://cdn.worldvectorlogo.com/logos/gsap-greensock.svg" alt="GSAP" width="40"/></a>&nbsp;&nbsp;
<br>
<i>Vite · React · TypeScript · React Router · Zustand · Axios · GSAP</i>
</p>
<br>

<p align="center"><strong>Microservices Languages</strong></p>
<p align="center">
<a href="https://www.python.org/"><img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/python/python-original.svg" alt="Python" width="40"/></a>&nbsp;&nbsp;
<a href="https://nodejs.org/"><img src="https://upload.wikimedia.org/wikipedia/commons/d/d9/Node.js_logo.svg" alt="Node.js" width="70"/></a>&nbsp;&nbsp;
<a href="https://www.lua.org/"><img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/lua/lua-original.svg" alt="Lua" width="40"/></a>&nbsp;&nbsp;
<br>
<i>Python · Node.js · Lua</i>
</p>
<br>

<p align="center"><strong>Microservices Frameworks</strong></p>
<p align="center">
<a href="https://fastapi.tiangolo.com/"><img src="https://fastapi.tiangolo.com/img/logo-margin/logo-teal.png" alt="FastAPI" width="120"/></a>&nbsp;&nbsp;
<a href="https://expressjs.com/"><img src="https://upload.wikimedia.org/wikipedia/commons/6/64/Expressjs.png" alt="Express" width="100"/></a>&nbsp;&nbsp;
<br>
<i>FastAPI · Express</i>
</p>
<br>

<p align="center"><strong>API Gateway</strong></p>
<p align="center">
<a href="https://konghq.com/"><img src="https://www.vectorlogo.zone/logos/konghq/konghq-ar21.svg" alt="Kong" width="150"/></a>
<br>
<i>Kong API Gateway · CORS · Rate Limiting</i>
</p>
<br>

<p align="center"><strong>Storage Solutions</strong></p>
<p align="center">
<a href="https://supabase.com/"><img src="https://www.vectorlogo.zone/logos/supabase/supabase-icon.svg" alt="Supabase" width="40"/></a>&nbsp;&nbsp;
<a href="https://firebase.google.com/products/firestore/"><img src="https://www.vectorlogo.zone/logos/firebase/firebase-icon.svg" alt="Firestore" width="40"/></a>&nbsp;&nbsp;
<a href="https://redis.io/"><img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/redis/redis-original.svg" alt="Redis" width="40"/></a>&nbsp;&nbsp;
<br>
<i>Supabase (PostgreSQL) · Firestore · Redis</i>
</p>
<br>

<p align="center"><strong>Message Broker</strong></p>
<p align="center">
<a href="https://www.rabbitmq.com/"><img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/rabbitmq/rabbitmq-original-wordmark.svg" alt="RabbitMQ" width="80"/></a>
<br>
<i>RabbitMQ</i>
</p>
<br>

<p align="center"><strong>Low Code Platform</strong></p>
<p align="center">
<a href="https://www.outsystems.com/"><img src="https://upload.wikimedia.org/wikipedia/commons/8/82/OS-logo-color_500x108.png" alt="OutSystems" width="130"/></a>
<br>
<i>OutSystems</i>
</p>
<br>

<p align="center"><strong>API Documentation</strong></p>
<p align="center">
<a href="https://swagger.io/"><img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/swagger/swagger-original.svg" alt="Swagger" width="40"/></a>&nbsp;&nbsp;
<br>
<i>Swagger UI (via FastAPI)</i>
</p>
<br>

<p align="center"><strong>Inter-service Communications</strong></p>
<p align="center">
<a href="https://socket.io/"><img src="https://upload.wikimedia.org/wikipedia/commons/9/96/Socket-io.svg" alt="Socket.io" width="40"/></a>&nbsp;&nbsp;
<img src="https://keenethics.com/wp-content/uploads/2022/01/rest-api-1.svg" alt="REST API" width="100"/>&nbsp;&nbsp;
<br>
<i>WebSocket (Socket.io) · REST API</i>
</p>
<br>

<p align="center"><strong>Cloud Services</strong></p>
<p align="center">
<a href="https://cloud.google.com/"><img src="https://upload.wikimedia.org/wikipedia/commons/5/51/Google_Cloud_logo.svg" alt="GCP" width="180"/></a>&nbsp;&nbsp;
<a href="https://vercel.com/"><img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Vercel_logo_black.svg" alt="Vercel" width="120"/></a>&nbsp;&nbsp;
<br>
<i>GCP (GKE) · Vercel</i>
</p>
<br>

<p align="center"><strong>Containerisation & Orchestration</strong></p>
<p align="center">
<a href="https://kubernetes.io/"><img src="https://upload.wikimedia.org/wikipedia/commons/6/67/Kubernetes_logo.svg" alt="Kubernetes" width="130"/></a>&nbsp;&nbsp;
<a href="https://www.docker.com/"><img src="https://upload.wikimedia.org/wikipedia/commons/4/4e/Docker_%28container_engine%29_logo.svg" alt="Docker" width="130"/></a>&nbsp;&nbsp;
<br>
<i>Kubernetes · Docker</i>
</p>
<br>

<p align="center"><strong>Monitoring & Observability</strong></p>
<p align="center">
<a href="https://prometheus.io/"><img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/prometheus/prometheus-original.svg" alt="Prometheus" width="40"/></a>&nbsp;&nbsp;
<a href="https://grafana.com/"><img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/grafana/grafana-original.svg" alt="Grafana" width="40"/></a>&nbsp;&nbsp;
<br>
<i>Prometheus · Grafana</i>
</p>
<br>

<p align="center"><strong>DevSecOps</strong></p>
<p align="center">
<a href="https://github.com/features/actions"><img src="https://github.com/user-attachments/assets/84046b86-7745-4ddd-8c36-b39b6a9ead91" alt="GitHub Actions" width="40"/></a>&nbsp;&nbsp;
<a href="https://argoproj.github.io/cd/"><img src="https://user-images.githubusercontent.com/25306803/43103633-a5d61dc4-8e83-11e8-9f0e-7ccdbee01eb6.png" alt="ArgoCD" width="80"/></a>&nbsp;&nbsp;
<a href="https://semgrep.dev/"><img src="https://raw.githubusercontent.com/semgrep/semgrep/develop/images/semgrep-logo-light.svg" alt="Semgrep" width="120"/></a>&nbsp;&nbsp;
<a href="https://aquasecurity.github.io/trivy/"><img src="https://raw.githubusercontent.com/aquasecurity/trivy/main/docs/imgs/logo.png" alt="Trivy" width="80"/></a>&nbsp;&nbsp;
<br>
<i>GitHub Actions · Argo CD · Semgrep · Trivy</i>
</p>
<br>

<p align="center"><strong>External Services</strong></p>
<p align="center">
<a href="https://stripe.com/"><img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Stripe_Logo%2C_revised_2016.svg/1280px-Stripe_Logo%2C_revised_2016.svg.png" alt="Stripe" width="130"/></a>&nbsp;&nbsp;
<a href="https://sendgrid.com/"><img src="https://www.vectorlogo.zone/logos/sendgrid/sendgrid-ar21.svg" alt="SendGrid" width="130"/></a>&nbsp;&nbsp;
<br>
<i>Stripe · SendGrid</i>
</p>
<br>

---

## Contributors

<div align="center">
    <table>
        <tr>
            <th>Weixiang</th>
            <th>Jeryl Khoo</th>
            <th>Matthew Chan</th>
            <th>Joshua Lim</th>
            <th>Delroy Singh</th>
            <th>Akash</th>
        </tr>
    </table>
</div>
