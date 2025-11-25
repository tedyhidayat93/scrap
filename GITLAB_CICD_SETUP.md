# GitLab CI/CD Setup Guide

This guide explains how to set up GitLab CI/CD for automated build and deployment of the Comment Scraper Frontend application.

## Overview

The CI/CD pipeline includes:
- **Build Stage**: Builds Docker image and pushes to GitLab Container Registry
- **Test Stage**: Runs automated tests (configure as needed)
- **Deploy Stage**: Deploys to staging or production servers

## Prerequisites

1. GitLab account with a repository
2. GitLab Runner installed on a server (or use GitLab.com shared runners)
3. Docker installed on deployment servers
4. SSH access to deployment servers

## 1. GitLab Runner Setup

### Option A: Use GitLab.com Shared Runners

GitLab.com provides free shared runners. Simply enable them in your project:

1. Go to **Settings** → **CI/CD** → **Runners**
2. Enable **Shared runners**

### Option B: Install Your Own GitLab Runner

For better control and performance, install a dedicated GitLab Runner:

#### On Ubuntu/Debian:

```bash
# Download GitLab Runner
curl -L "https://packages.gitlab.com/install/repositories/runner/gitlab-runner/script.deb.sh" | sudo bash

# Install GitLab Runner
sudo apt-get install gitlab-runner

# Register the runner
sudo gitlab-runner register
```

#### Registration Parameters:

When registering the runner, provide:
- **GitLab instance URL**: `https://gitlab.com/` (or your GitLab instance)
- **Registration token**: Found in **Settings** → **CI/CD** → **Runners**
- **Description**: `docker-runner` (or any name)
- **Tags**: `docker,production` (comma-separated)
- **Executor**: `docker`
- **Default Docker image**: `docker:24-cli`

#### Configure the Runner:

Edit `/etc/gitlab-runner/config.toml`:

```toml
concurrent = 4

[[runners]]
  name = "docker-runner"
  url = "https://gitlab.com/"
  token = "YOUR_RUNNER_TOKEN"
  executor = "docker"
  [runners.docker]
    tls_verify = false
    image = "docker:24-cli"
    privileged = true
    disable_cache = false
    volumes = ["/cache", "/certs/client"]
    shm_size = 0
```

Restart the runner:
```bash
sudo gitlab-runner restart
```

## 2. Configure GitLab CI/CD Variables

Set up required environment variables in GitLab:

1. Go to **Settings** → **CI/CD** → **Variables**
2. Add the following variables:

### Required Variables:

| Variable Name | Description | Protected | Masked |
|--------------|-------------|-----------|---------|
| `CI_REGISTRY_USER` | GitLab username or deploy token | ✓ | - |
| `CI_REGISTRY_PASSWORD` | GitLab password or deploy token | ✓ | ✓ |
| `SSH_PRIVATE_KEY` | SSH private key for server access | ✓ | ✓ |
| `PRODUCTION_SERVER_IP` | Production server IP address | ✓ | - |
| `PRODUCTION_SERVER_USER` | Production server SSH username | ✓ | - |
| `STAGING_SERVER_IP` | Staging server IP address | - | - |
| `STAGING_SERVER_USER` | Staging server SSH username | - | - |

### Optional Variables (for production environment):

| Variable Name | Description |
|--------------|-------------|
| `OPENAI_API_KEY` | OpenAI API key |
| `TIKTOK_API_KEY` | TikTok API key |
| `NEXT_PUBLIC_API_URL` | Production API URL |

### How to Add Variables:

1. Click **Add variable**
2. Enter **Key** (variable name)
3. Enter **Value**
4. Check **Protect variable** for production-only variables
5. Check **Mask variable** for sensitive data
6. Click **Add variable**

## 3. Generate SSH Key for Deployment

On your local machine:

```bash
# Generate SSH key pair
ssh-keygen -t ed25519 -C "gitlab-ci" -f ~/.ssh/gitlab-ci

# Copy public key to deployment servers
ssh-copy-id -i ~/.ssh/gitlab-ci.pub user@production-server-ip
ssh-copy-id -i ~/.ssh/gitlab-ci.pub user@staging-server-ip

# Copy private key content for GitLab variable
cat ~/.ssh/gitlab-ci
```

Add the private key content to GitLab as `SSH_PRIVATE_KEY` variable.

## 4. Prepare Deployment Servers

On each deployment server (production/staging):

### Install Docker and Docker Compose:

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
sudo usermod -aG docker $USER
```

### Create deployment directory:

```bash
# Create application directory
sudo mkdir -p /opt/comment-scraper-fe
sudo chown $USER:$USER /opt/comment-scraper-fe
cd /opt/comment-scraper-fe

# Create production environment file
nano .env.production
```

Add your environment variables to `.env.production`:

```bash
OPENAI_API_KEY=your_actual_key
NEXT_PUBLIC_API_URL=https://your-domain.com
TIKTOK_API_KEY=your_actual_key
OLLAMA_MODEL_LLM=gpt-oss:20b
NODE_ENV=production
```

### Create docker-compose.yml on server:

```bash
nano docker-compose.yml
```

Add the following content:

```yaml
version: '3.8'

services:
  comment-scraper-fe:
    image: registry.gitlab.com/your-username/comment-scraper-fe:latest
    container_name: comment-scraper-fe-prod
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

networks:
  app-network:
    driver: bridge
```

**Important**: Update `registry.gitlab.com/your-username/comment-scraper-fe:latest` with your actual GitLab registry path.

## 5. Pipeline Workflow

### Automatic Triggers:

- **Build Stage**: Runs on push to `main`, `develop`, or tags
- **Test Stage**: Runs on push to `main`, `develop`, or merge requests
- **Deploy Stage**: Manual trigger only (for safety)

### Manual Deployment:

1. Go to **CI/CD** → **Pipelines**
2. Click on the pipeline for your commit
3. Click the **play** button (▶) next to `deploy_production` or `deploy_staging`
4. Confirm the deployment

### Branch Strategy:

- `main` branch → Production deployment
- `develop` branch → Staging deployment
- Feature branches → Build and test only

## 6. Customizing the Pipeline

### Modify docker-compose.yml location:

If your `docker-compose.yml` is in a different location, update the deployment script in `.gitlab-ci.yml`:

```yaml
- |
  ssh $PRODUCTION_SERVER_USER@$PRODUCTION_SERVER_IP << 'EOF'
    cd /your/custom/path  # Change this
    docker-compose pull
    docker-compose up -d --force-recreate
  EOF
```

### Add environment-specific variables:

Modify the deployment script to pass variables:

```yaml
- |
  ssh $PRODUCTION_SERVER_USER@$PRODUCTION_SERVER_IP << 'EOF'
    cd /opt/comment-scraper-fe
    export CI_REGISTRY_USER=$CI_REGISTRY_USER
    export CI_REGISTRY_PASSWORD=$CI_REGISTRY_PASSWORD
    echo $CI_REGISTRY_PASSWORD | docker login -u $CI_REGISTRY_USER --password-stdin $CI_REGISTRY
    docker-compose pull
    docker-compose up -d --force-recreate
  EOF
```

### Enable automatic tests:

Uncomment the test command in `.gitlab-ci.yml`:

```yaml
script:
  - pnpm run test  # Uncomment this
```

## 7. Monitoring Deployments

### View Pipeline Status:

- Go to **CI/CD** → **Pipelines**
- Click on a pipeline to see job details
- Click on a job to view logs

### View Deployment Logs:

On the deployment server:

```bash
# View real-time logs
docker-compose logs -f comment-scraper-fe

# Check container status
docker-compose ps

# Restart if needed
docker-compose restart
```

## 8. Troubleshooting

### Pipeline Fails at Build Stage:

1. Check Docker is available in GitLab Runner
2. Verify runner has `privileged = true` in config
3. Check GitLab Container Registry is enabled

### Pipeline Fails at Deploy Stage:

1. Verify SSH connection: `ssh user@server-ip`
2. Check `SSH_PRIVATE_KEY` variable is correct
3. Ensure server IP is in known_hosts
4. Verify Docker is installed on deployment server

### Image Not Found on Deployment:

1. Check GitLab Container Registry path in docker-compose.yml
2. Verify login credentials on deployment server
3. Manually test: `docker pull registry.gitlab.com/your-username/comment-scraper-fe:latest`

### Permission Denied Errors:

1. Ensure user is in docker group: `sudo usermod -aG docker $USER`
2. Log out and back in
3. Test: `docker ps`

## 9. Security Best Practices

- ✅ Use protected variables for production secrets
- ✅ Mask sensitive values (API keys, passwords)
- ✅ Use SSH keys instead of passwords
- ✅ Limit SSH access to specific IP addresses
- ✅ Keep deployment servers updated
- ✅ Enable firewall on deployment servers
- ✅ Use manual deployment triggers for production
- ✅ Review deployment logs regularly

## 10. Next Steps

1. ✅ Set up GitLab Runner
2. ✅ Configure CI/CD variables
3. ✅ Prepare deployment servers
4. ✅ Test the pipeline with a commit
5. ✅ Monitor the first deployment
6. Set up monitoring and alerting
7. Configure automatic backups
8. Set up SSL certificates (Let's Encrypt)

## Additional Resources

- [GitLab CI/CD Documentation](https://docs.gitlab.com/ee/ci/)
- [GitLab Runner Installation](https://docs.gitlab.com/runner/install/)
- [GitLab Container Registry](https://docs.gitlab.com/ee/user/packages/container_registry/)
- [Docker Deployment Best Practices](https://docs.docker.com/develop/dev-best-practices/)
