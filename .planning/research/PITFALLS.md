# Domain Pitfalls

**Domain:** Dockerization of 'second-brain' application
**Researched:** 2024-06-19

## Critical Pitfalls

Mistakes that can lead to major security vulnerabilities, production outages, or costly rewrites.

### Pitfall 1: Hardcoding Secrets
**What goes wrong:** API keys, database credentials, or other sensitive information are embedded directly in Dockerfiles, `.env` files committed to source control, or image layers.
**Why it happens:** Convenience during development, lack of awareness of security implications.
**Consequences:** Major security breaches if the image or repository is compromised. Secrets can be easily extracted from image layers.
**Prevention:** Never hardcode secrets. Use environment variables (from `.env` files for local dev, but not committed), Docker secrets, or dedicated secret management services (e.g., HashiCorp Vault, AWS Secrets Manager, GCP Secret Manager) for production.
**Detection:** Static analysis tools for Dockerfiles, vulnerability scanners, code reviews.

### Pitfall 2: Running Containers as Root
**What goes wrong:** The application inside the container runs with `root` privileges by default or explicitly.
**Why it happens:** Default behavior of many base images, easier for debugging permissions issues.
**Consequences:** If the container is compromised, the attacker gains root access within the container, which can potentially be escalated to the host machine, leading to severe security breaches.
**Prevention:** Always create a dedicated non-root user in the Dockerfile using `USER` instruction and ensure the application runs under this user.
**Detection:** Review Dockerfiles for `USER root` or missing `USER` instruction; security scanning tools.

### Pitfall 3: Using Development Servers in Production
**What goes wrong:** Deploying the Next.js app with `next dev` or the Python app with Flask's `app.run()` (or equivalent in other frameworks) as the entrypoint in a production environment.
**Why it happens:** Simplicity, unawareness of production-grade requirements.
**Consequences:** Poor performance, instability (crashing under load), lack of security features (e.g., proper request handling, security headers), high resource consumption, and potential memory leaks.
**Prevention:** For Next.js, build with `next build` and start with `node server.js` (with standalone output). For Python, use a production-ready WSGI server like Gunicorn (for Flask) or Uvicorn (for FastAPI).
**Detection:** Review `CMD` or `ENTRYPOINT` instructions in Dockerfiles; observe application behavior under load.

### Pitfall 4: Ignoring Docker Build Cache
**What goes wrong:** Dockerfiles are structured inefficiently, leading to Docker rebuilding layers unnecessarily on every change.
**Why it happens:** Instructions are ordered without considering layer caching, e.g., copying all code before installing dependencies.
**Consequences:** Significantly slower build times, especially in CI/CD pipelines, impacting developer productivity and deployment frequency.
**Prevention:** Order Dockerfile instructions from least to most frequently changing. Copy `package.json`/`requirements.txt` and install dependencies *before* copying application code.
**Detection:** Monitor build times; `docker build --no-cache` to force a full rebuild and compare.

### Pitfall 5: Bloated Container Images
**What goes wrong:** Docker images are excessively large, containing unnecessary files, build tools, or debug symbols.
**Why it happens:** Not using multi-stage builds, not having a `.dockerignore` file, using large base images, or including development dependencies.
**Consequences:** Increased attack surface (more software, more potential CVEs), longer image pull times, higher storage costs, slower deployments, and higher memory consumption.
**Prevention:** Use multi-stage builds, leverage `.dockerignore`, choose minimal base images (e.g., `alpine`, `slim`), use Next.js standalone output, `pip install --no-cache-dir`.
**Detection:** `docker images` to check size, `dive` tool for layer inspection, vulnerability scanners.

## Moderate Pitfalls

Mistakes that can cause significant operational headaches, performance degradation, or moderate security risks.

### Pitfall 1: Ineffective `.dockerignore` Configuration
**What goes wrong:** The `.dockerignore` file is missing or improperly configured, leading to unnecessary files being copied into the build context.
**Why it happens:** Oversight, not understanding its importance.
**Consequences:** Larger build contexts (slower `docker build`), larger image sizes, potential leakage of sensitive local files into the image.
**Prevention:** Always create a comprehensive `.dockerignore` file, excluding `.git`, `node_modules`, `__pycache__`, `.env`, build artifacts, IDE files, etc.
**Detection:** Inspect build context size, analyze image layers.

### Pitfall 2: Mismanaging Environment Variables
**What goes wrong:** Environment variables are inconsistent between local development and deployment environments, or not clearly documented.
**Why it happens:** Lack of standard practices for environment variable declaration and usage.
**Consequences:** Application configuration bugs, difficult debugging, "it works on my machine" issues.
**Prevention:** Use `.env` files for local development (and add to `.dockerignore`), clearly document required environment variables, and use a consistent naming convention. For production, rely on orchestration-specific methods for injecting variables.
**Detection:** Thorough testing in all environments, environment variable validation at application startup.

### Pitfall 3: Lack of Container Health Checks
**What goes wrong:** Containers are reported as "running" by the Docker daemon but the application inside is actually unresponsive or crashed.
**Why it happens:** Reliance solely on process status; the entrypoint process might be running, but the application is not ready.
**Consequences:** Orchestrators might route traffic to unhealthy instances, leading to failed requests, downtime, and poor user experience.
**Prevention:** Implement `HEALTHCHECK` instructions in Dockerfiles (e.g., `CMD curl -f http://localhost:3000/health || exit 1`) or define health checks in Docker Compose.
**Detection:** Monitor application logs, HTTP status codes, and user feedback.

## Minor Pitfalls

Smaller issues that can cause minor inefficiencies or annoyances, but are easily fixed.

### Pitfall 1: Not Pinning Dependencies
**What goes wrong:** `requirements.txt` or `package.json` does not specify exact versions for dependencies (e.g., `flask` instead of `flask==2.3.2`).
**Why it happens:** Laziness, relying on "latest" implicitly.
**Consequences:** Inconsistent builds, unexpected behavior due to dependency updates, potential supply chain attacks if a dependency's latest version contains malicious code.
**Prevention:** Always pin exact versions for all dependencies. Use `pip freeze > requirements.txt` or `npm install --save-exact`.
**Detection:** Code reviews of `requirements.txt`/`package.json`.

### Pitfall 2: Over-reliance on `depends_on` in Docker Compose
**What goes wrong:** Assuming that `depends_on` guarantees a service is fully "ready" to accept connections, not just that its container has started.
**Why it happens:** Misunderstanding of `depends_on` functionality.
**Consequences:** Race conditions at startup where an application tries to connect to a database or API that is not yet ready, leading to errors and failed starts.
**Prevention:** Combine `depends_on` with application-level retry logic or Docker `HEALTHCHECK` with `service_healthy` in Docker Compose.
**Detection:** Intermittent startup failures during local development or CI.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| **Build Agent (CI/CD)** | **Image Registry Authentication Failures:** Build agent lacks proper credentials or permissions to push/pull from a private Docker registry. | Ensure CI/CD environment variables or secrets store valid credentials for the target registry. Test authentication steps in isolation. |
| **Build Agent (CI/CD)** | **Ineffective Build Caching for CI:** Each CI run starts from scratch, leading to long build times even for minor changes. | Configure CI system to leverage Docker layer caching (e.g., by mounting `/var/lib/docker` or specific build caches); ensure Dockerfiles are optimized for caching. |
| **Build Agent (CI/CD)** | **Lack of Automated Image Scanning:** Images are built and pushed without checking for known vulnerabilities. | Integrate tools like Trivy, Clair, Snyk, or native registry scanning (e.g., GCP Container Analysis) into the CI pipeline. |
| **Access Agent (Local Dev/Testing)** | **Volume Permission Issues:** When bind-mounting host directories into containers, the user inside the container might not have necessary read/write permissions. | Ensure the non-root user inside the container has appropriate UID/GID mapping with the host user, or adjust host directory permissions (e.g., `chmod -R 777` for dev, but NOT production). |
| **Access Agent (Local Dev/Testing)** | **Network Port Collisions:** A required port for a container is already in use on the host machine. | Use dynamic port mapping (e.g., `host_port:container_port` with `host_port` omitted or set to `0`) or ensure a clear convention for port usage. Tools like `lsof -i :<port>` can help identify conflicts. |
| **Access Agent (Local Dev/Testing)** | **Environment Variable Inconsistencies:** Discrepancies between `.env` files used locally by developers and the environment variables injected in test/staging environments. | Maintain `.env.example` to document all required variables. Use consistent mechanisms for setting variables across environments. |

## Sources

- Research on Dockerization best practices, Docker Compose, and general cloud-native security.
- Common issues reported in developer communities and official Docker documentation.
