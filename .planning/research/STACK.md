# Technology Stack

**Project:** second-brain
**Researched:** 2024-06-19

## Recommended Stack

### Core Frameworks
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Docker | Latest | Containerization platform | Standard for modern application deployment, provides isolation, portability, and simplifies dependency management. Essential for multi-service applications and CI/CD. |
| Docker Compose | Latest | Multi-container orchestration | Ideal for local development and single-host deployments of multi-service applications (frontend, backend, databases). Simplifies networking, volume management, and service dependencies. |

### Frontend (Next.js) Dockerization
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Node.js (Alpine) | Latest LTS (e.g., 20) | Base Image | `node:LTS-alpine` provides a minimal, secure, and small base image, reducing attack surface and image size. |
| Next.js Standalone Output | Next.js 12+ | Optimized build output | `output: "standalone"` traces and includes only necessary files (`node_modules`) for production, drastically reducing image size. |

### Backend (Python) Dockerization
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Python (Slim/Alpine) | Latest LTS (e.g., 3.11) | Base Image | `python:LTS-slim` or `python:LTS-alpine` offers minimal Python runtime, reducing image size and vulnerabilities. |
| Gunicorn / Uvicorn | Latest | Production WSGI/ASGI Server | Flask's dev server is not for production. Gunicorn (for WSGI) or Uvicorn (for ASGI, e.g., FastAPI) provides robustness, concurrency, and management features. |

### Supporting Tools
| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| .dockerignore | N/A | Exclude files from build context | Prevents unnecessary files (e.g., `.git`, `node_modules`, `__pycache__`) from being copied into the image, speeding up builds and reducing size. |
| .env files | N/A | Local environment variable management | Facilitates setting environment variables for local development, especially with Docker Compose, without hardcoding secrets. |
| Docker Registry | N/A | Image storage and distribution | Necessary for CI/CD pipelines to store and retrieve built images; can be public (Docker Hub) or private (GCP Container Registry, AWS ECR). |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Container Orchestration (Production) | Docker Compose (Local Dev) | Kubernetes / Docker Swarm | While powerful for large-scale production, Kubernetes introduces significant operational overhead. Docker Compose is sufficient for local development and initial single-host deployments. Swarm is simpler but less mature than K8s. Recommend starting with Compose for local and evaluating K8s/Cloud Run for production scaling later. |
| Python Base Image | python:*-slim/alpine | python:latest / ubuntu:latest | Larger image size, increased attack surface due to more pre-installed packages and dependencies. |
| Python Web Server | Gunicorn/Uvicorn | Flask/Django built-in server | Built-in servers are for development only; lack robustness, performance, and security features required for production. |

## Installation

```bash
# Docker Desktop (includes Docker Engine, Docker Compose, Kubernetes optional)
# Download from official Docker website for your OS.

# Verify installation
docker --version
docker compose version
```

## Sources

- Next.js Dockerfile Best Practices (Web Search)
- Python Flask Dockerfile Best Practices (Web Search)
- Docker Compose Best Practices Multi-Service Application (Web Search)
- Official Docker Documentation (Implied through best practices)
