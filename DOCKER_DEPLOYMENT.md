# Docker Deployment Guide

This guide explains how to deploy the Comment Scraper Frontend application using Docker for production.

## Prerequisites

- Docker (version 20.10 or higher)
- Docker Compose (version 2.0 or higher)

## Quick Start

### 1. Configure Environment Variables

Copy the production environment template and update with your actual values:

```bash
cp .env.production .env.production.local
```

Edit `.env.production.local` and set your actual API keys and configuration:
- `OPENAI_API_KEY`: Your OpenAI API key
- `NEXT_PUBLIC_API_URL`: Your production domain (e.g., https://your-domain.com)
- `TIKTOK_API_KEY`: Your TikTok API key

### 2. Build and Run with Docker Compose

```bash
# Build and start the container
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

### 3. Access the Application

The application will be available at:
- http://localhost:3000 (or your configured domain)

## Manual Docker Commands

If you prefer to use Docker directly without Docker Compose:

```bash
# Build the image
docker build -t comment-scraper-fe:latest .

# Run the container
docker run -d \
  --name comment-scraper-fe-prod \
  -p 3000:3000 \
  --env-file .env.production.local \
  --restart unless-stopped \
  comment-scraper-fe:latest

# View logs
docker logs -f comment-scraper-fe-prod

# Stop and remove the container
docker stop comment-scraper-fe-prod
docker rm comment-scraper-fe-prod
```

## Production Deployment

### Custom Port Configuration

To run on a different port, modify the `docker-compose.yml`:

```yaml
ports:
  - "8080:3000"  # Change 8080 to your desired port
```

### Using with Reverse Proxy (nginx/traefik)

If you're using a reverse proxy, you can remove the port mapping and use Docker networks:

```yaml
services:
  comment-scraper-fe:
    # ... other config
    expose:
      - "3000"
    networks:
      - proxy-network

networks:
  proxy-network:
    external: true
```

### Health Checks

The `docker-compose.yml` includes health checks. Check the status with:

```bash
docker-compose ps
```

## Monitoring and Maintenance

### View Real-time Logs

```bash
docker-compose logs -f comment-scraper-fe
```

### Restart the Application

```bash
docker-compose restart
```

### Update the Application

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose up -d --build
```

### Clean Up Old Images

```bash
# Remove unused images
docker image prune -a
```

## Troubleshooting

### Container Won't Start

1. Check logs: `docker-compose logs comment-scraper-fe`
2. Verify environment variables in `.env.production.local`
3. Ensure port 3000 is not already in use

### Build Failures

1. Clear Docker cache: `docker system prune -a`
2. Rebuild: `docker-compose build --no-cache`

### Performance Issues

- Increase container resources in Docker Desktop settings
- Monitor with: `docker stats comment-scraper-fe-prod`

## Security Notes

- Never commit `.env.production.local` to version control
- Use secrets management for production (e.g., Docker Secrets, HashiCorp Vault)
- Keep your Docker images updated regularly

## Additional Resources

- [Next.js Docker Documentation](https://nextjs.org/docs/deployment#docker-image)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
