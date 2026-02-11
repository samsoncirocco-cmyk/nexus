# Docker Setup for Local Development

This document provides instructions for setting up and running the `second-brain` application using Docker Compose for local development.

## Prerequisites

Before you begin, ensure you have the following installed:

*   **Git:** For cloning the repository.
*   **Docker Desktop:** Includes Docker Engine and Docker Compose. Download from [Docker's official website](https://www.docker.com/products/docker-desktop).

## Getting Started

1.  **Clone the Repository:**
    If you haven't already, clone the `second-brain` repository to your local machine:
    ```bash
    git clone https://github.com/your-repo/second-brain.git
    cd second-brain
    ```

2.  **Set up Environment Variables:**
    Create a `.env` file in the root of the project directory. This file will be used by Docker Compose to set environment variables for your services. You can start by copying the provided example:
    ```bash
    cp .env.development .env
    ```
    Edit the `.env` file and replace placeholder values (e.g., `your_openai_api_key_here`) with your actual credentials. For `OPENAI_API_KEY`, ensure it's set either in this `.env` file or directly in your shell environment where you run `docker compose up`.

3.  **Build and Run the Application:**
    Navigate to the root of your project directory in your terminal and run the following command to build the Docker images and start the services defined in `docker-compose.yml`:
    ```bash
    docker compose up --build
    ```
    *   `--build`: This flag forces Docker Compose to rebuild the images even if they exist. It's recommended to use this the first time or after making changes to `Dockerfile`s or `package.json`/`requirements.txt`.
    *   This command will download necessary base images, build your frontend and backend application images, and start all services (frontend, backend, database).

4.  **Access the Application:**
    Once all services are up and running:
    *   **Frontend:** Open your web browser and navigate to `http://localhost:3000`.
    *   **Backend:** The backend API will be accessible at `http://localhost:8000`.

5.  **Hot-Reloading for Development:**
    The `docker-compose.yml` is configured with bind mounts for both the frontend (`./src`, `./public`, `next.config.ts`, `package.json`, `package-lock.json`) and backend (`./backend`). This means:
    *   Any changes you make to the source code files on your host machine will be automatically reflected inside the running containers.
    *   For the Next.js frontend, this should trigger a hot-reload in your browser.
    *   For the Python backend, changes will typically restart the server process within the container, reflecting your updates.

6.  **Stopping and Cleaning Up:**
    To stop the running services and remove their containers and networks:
    ```bash
    docker compose down
    ```
    To also remove the `db_data` volume (which stores your database data) and all images:
    ```bash
    docker compose down --volumes --rmi all
    ```
    **Caution:** `--volumes` will delete your local development database data. Only use if you want a fresh start.

## Troubleshooting

*   **Port Conflicts:** If you encounter errors about ports being already in use, ensure no other applications are running on `3000`, `8000`, or `5432`.
*   **Build Failures:** Check the logs in your terminal for specific error messages during the `docker compose up --build` command. Often, these relate to missing dependencies or syntax errors in `Dockerfile`s.
*   **Database Connection:** Ensure your `DATABASE_URL` in `.env` matches the `db` service configuration in `docker-compose.yml`.

For further assistance, refer to the project's main `README.md` or contact the development team.
