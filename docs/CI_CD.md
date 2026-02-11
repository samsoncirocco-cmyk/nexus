# CI/CD for Docker Images

This document provides an overview of the Continuous Integration/Continuous Deployment (CI/CD) pipeline for building and managing Docker images for the `second-brain` application.

## Overview

The CI/CD pipeline is implemented using GitHub Actions and is defined in the workflow file at `.github/workflows/docker-ci.yml`.

### Workflow Triggers

The workflow is automatically triggered on:

*   **Push to `main` branch:** Any push to the `main` branch will start the pipeline.
*   **Manual Dispatch:** You can also trigger the workflow manually from the "Actions" tab in the GitHub repository.

### Key Stages

The pipeline consists of two parallel jobs:

1.  **`build-and-push-backend`:** Builds the Docker image for the Python backend.
2.  **`build-and-push-frontend`:** Builds the Docker image for the Next.js frontend.

Each job performs the following steps:

1.  **Checkout Code:** Checks out the latest version of the repository.
2.  **Set up Docker Buildx:** Initializes Docker's extended build capabilities.
3.  **Log in to Docker Hub:** Authenticates with Docker Hub using credentials stored in GitHub repository secrets (`DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`).
4.  **Build and Push:**
    *   Builds the Docker image using the corresponding `Dockerfile` (`backend/Dockerfile` for the backend, `Dockerfile` for the frontend).
    *   Pushes the built image to Docker Hub with two tags:
        *   `latest`: The most recent successful build.
        *   `<git-sha>`: A unique tag corresponding to the commit SHA.
5.  **Scan for Vulnerabilities:**
    *   Uses `Trivy` to scan the newly pushed `latest` image for OS and library vulnerabilities.
    *   The scan results are displayed in the workflow logs. The build will not fail on detected vulnerabilities for now, but this can be configured for stricter security.

## Required Setup

For the CI/CD pipeline to run successfully, you need to configure the following secrets in your GitHub repository settings (`Settings > Secrets and variables > Actions`):

*   `DOCKERHUB_USERNAME`: Your Docker Hub username.
*   `DOCKERHUB_TOKEN`: An access token for your Docker Hub account. It's recommended to use an access token instead of your password.

## Usage

Once the secrets are configured, the pipeline will run automatically. You can monitor its progress and view logs in the "Actions" tab of the GitHub repository. The pushed images will be available in your Docker Hub repository.
