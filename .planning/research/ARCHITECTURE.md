# Architecture Patterns

**Domain:** Dockerization of 'second-brain' application
**Researched:** 2024-06-19

## Recommended Architecture

The 'second-brain' application will be structured as a multi-container application orchestrated using Docker Compose for local development and single-host deployments. This provides clear separation of concerns, portability, and maintainability.

```
+-------------------+       +-------------------+       +-------------------+
|     USER/AGENT    |       |     USER/AGENT    |       |     EXTERNAL      |
|    (Browser/CLI)  |       |    (CI/CD, Dev)   |       |      SERVICES     |
+---------+---------+       +---------+---------+       +-------------------+
          |                           |                             |
          v                           v                             v
+-------------------------------------------------------------------------+
|                    DOCKER HOST / LOCAL DEVELOPMENT MACHINE              |
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  |                          DOCKER NETWORK                           |  |
|  |                                                                 |  |
|  |  +----------------+      +-----------------+      +-----------+  |  +----------------+
|  |  |  Frontend App  | <--> |  Backend App    | <--> |  Database |  |  | Cloud Functions|
|  |  |  (Next.js)     |      |  (Python)       |      |  (Postgres)|  |  | / External APIs|
|  |  | (Service: web) |      | (Service: api)  |      | (Service: db) |  |  +----------------+
|  |  +-------^--------+      +---------^-------+      +-----------+  |          ^
|  |          |                           |                             |          |
|  |          |                           v                             |          |
|  |          |        +-----------------------------------------+      |          |
|  |          |        |                 Volumes                 |      |          |
|  |          +------->| (Code, Persistent Data, Logs, Configs)  |<-----+----------+
|  |                   +-----------------------------------------+      |
|  +-------------------------------------------------------------------+  |
|                                                                         |
+-------------------------------------------------------------------------+
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **Frontend Service (`web`)** | Serve the Next.js application, handle user interface logic, make API calls to the backend. | Backend Service (`api`) |
| **Backend Service (`api`)** | Implement core business logic, expose RESTful APIs, interact with the database and external services. | Frontend Service (`web`), Database Service (`db`), External Services (Cloud Functions, 3rd party APIs) |
| **Database Service (`db`)** | Store and manage application data (e.g., PostgreSQL, MongoDB). | Backend Service (`api`) |
| **Volumes** | Provide persistent storage for database data, application logs, and potentially development-time code synchronization. | Frontend/Backend Services (for code/logs), Database Service (for data) |

### Data Flow

1.  **User/Agent to Frontend:** User's browser or an agent (e.g., a testing script) accesses the Next.js frontend via a port exposed on the Docker host (e.g., `localhost:3000`).
2.  **Frontend to Backend:** The Next.js frontend makes API requests to the Python backend. Within the Docker network, this is typically done using the backend service's name (e.g., `http://api:8000`).
3.  **Backend to Database:** The Python backend connects to the database using the database service's name (e.g., `postgres://user:password@db:5432/dbname`).
4.  **Backend to External Services:** The Python backend can interact with external cloud functions or third-party APIs as needed.
5.  **Persistent Data:** Database data is stored in a named Docker volume, ensuring persistence across container restarts or recreation.

## Patterns to Follow

### Pattern 1: Container-per-Service
**What:** Each logical component (frontend, backend, database) runs in its own dedicated Docker container.
**When:** Always, for modularity, isolation, independent scaling, and easier maintenance.
**Example:** Separate `Dockerfile` for Next.js app, separate `Dockerfile` for Python app, and use an official image for the database.

### Pattern 2: Stateless Application Containers
**What:** Frontend and backend containers should not store any persistent state internally. All persistent data is delegated to a database or external storage.
**When:** Always, for horizontal scalability, resilience, and easier upgrades.
**Example:** Sessions managed in the database or via JWTs, file uploads stored in cloud storage (e.g., GCS, S3), not on the container filesystem.

### Pattern 3: Configuration via Environment Variables
**What:** All application configuration (database URLs, API keys, feature flags) should be passed into containers as environment variables at runtime.
**When:** Always, for flexibility, security (when combined with proper secrets management), and environment-specific settings.
**Example:** Using a `.env` file with Docker Compose for local development, and a proper secrets management system (e.g., Kubernetes Secrets, AWS Secrets Manager) in production.

### Pattern 4: Named Volumes for Data Persistence
**What:** Use Docker named volumes for any data that needs to persist beyond the lifecycle of a container (e.g., database files).
**When:** For databases, file storage that needs to persist, and potentially for logs.
**Example:** In `docker-compose.yml`:
```yaml
services:
  db:
    image: postgres:15-alpine
    volumes:
      - db_data:/var/lib/postgresql/data
volumes:
  db_data:
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Monolithic Container
**What:** Attempting to run multiple distinct services (e.g., Next.js, Python, database) within a single Docker container.
**Why bad:** Violates the principle of "one process per container," leads to large, complex, and difficult-to-manage images. Prevents independent scaling and updates.
**Instead:** Use Docker Compose to orchestrate multiple single-purpose containers.

### Anti-Pattern 2: Hardcoded IP Addresses for Inter-Service Communication
**What:** Configuring services to connect to each other using hardcoded IP addresses (e.g., `http://172.17.0.2:8000`).
**Why bad:** Docker assigns dynamic IPs. Containers might restart with new IPs, breaking communication. Not portable.
**Instead:** Leverage Docker's built-in DNS resolution and use service names (e.g., `http://api:8000`) for inter-container communication.

### Anti-Pattern 3: Baking Secrets into Images
**What:** Including sensitive information (API keys, passwords) directly in Dockerfiles or committing them into image layers.
**Why bad:** Exposes secrets to anyone with access to the image, even if only transiently during build. High security risk.
**Instead:** Use environment variables (from `.env` or external secret managers) or Docker secrets to inject sensitive data at runtime.

## Scalability Considerations

| Concern | At 100 users (Local/Dev/Small Prod) | At 10K users (Growing Prod) | At 1M users (Large Scale Prod) |
|---------|------------------------------------|-----------------------------|-------------------------------|
| **Application Scaling** | Docker Compose with `replicas` (if using Docker Swarm or standalone); vertical scaling on a single host. | Container orchestration (Kubernetes, Cloud Run, AWS ECS/Fargate) for horizontal scaling. | Advanced orchestration with auto-scaling, global distribution, microservice patterns. |
| **Database Scaling** | Single database container/instance. | Managed database services (e.g., Cloud SQL, RDS), read replicas. | Sharding, multi-master replication, specialized NoSQL solutions. |
| **Networking/Load Balancing** | Docker Compose handles basic internal networking. | Cloud Load Balancers, API Gateways, Service Meshes. | Global Load Balancers, edge caching (CDN), advanced DDoS protection. |
| **Deployment Complexity** | `docker compose up`/`down` | CI/CD pipelines deploying to orchestrator. | Advanced GitOps, blue/green deployments, canary releases. |

## Sources

- Research on Docker, Docker Compose, and general cloud-native architecture patterns.
- Official Docker documentation for best practices.
