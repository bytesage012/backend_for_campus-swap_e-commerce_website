# Production Deployment Guide

Complete guide for deploying Campus Swap backend to production.

## Pre-Deployment Checklist

- [ ] All tests passing: `npm test`
- [ ] Code linted: `npm run lint`
- [ ] No console.logs in production code
- [ ] Environment variables reviewed and updated
- [ ] Database backups configured
- [ ] SSL certificates ready
- [ ] Domain configured
- [ ] Error monitoring setup (Sentry, etc.)
- [ ] Logging configured
- [ ] Rate limiting configured

## Deployment Options

### Option 1: Docker (Recommended)

#### Create Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production && npm run postinstall

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3001

# Start application
CMD ["npm", "start"]
```

#### Create docker-compose.yml

```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: campus_swap
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build: .
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/campus_swap
      JWT_SECRET: ${JWT_SECRET}
      PAYSTACK_SECRET_KEY: ${PAYSTACK_SECRET_KEY}
      PAYSTACK_PUBLIC_KEY: ${PAYSTACK_PUBLIC_KEY}
      FRONTEND_URL: ${FRONTEND_URL}
      SERVER_URL: ${SERVER_URL}
    ports:
      - "3001:3001"
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - ./uploads:/app/uploads
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

#### Deploy with Docker

```bash
# Clone repository
git clone <repository-url>
cd backend

# Copy and configure environment
cp .env.example .env
# Edit .env with production values

# Build and run
docker-compose up -d

# Run migrations
docker-compose exec app npx prisma migrate deploy

# View logs
docker-compose logs -f app
```

### Option 2: Traditional Server (Ubuntu/Debian)

#### 1. Connect to Server

```bash
ssh user@your-server-ip
```

#### 2. Install Dependencies

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Install Nginx (reverse proxy)
sudo apt-get install -y nginx

# Install PM2 (process manager)
sudo npm install -g pm2
```

#### 3. Setup Database

```bash
sudo -u postgres psql
CREATE DATABASE campus_swap;
CREATE USER campus_user WITH PASSWORD 'strong_password';
GRANT ALL PRIVILEGES ON DATABASE campus_swap TO campus_user;
\q
```

#### 4. Clone and Setup Application

```bash
cd /var/www
git clone <repository-url> campus-swap-backend
cd campus-swap-backend

# Install dependencies
npm ci --production

# Setup environment
cp .env.example .env
# Edit .env with production values
nano .env
```

#### 5. Run Database Migrations

```bash
npx prisma migrate deploy
```

#### 6. Build Application

```bash
npm run build
```

#### 7. Start with PM2

```bash
pm2 start dist/index.js --name "campus-swap-api"

# Save PM2 process list
pm2 save

# Create startup script
pm2 startup
# Follow the output and run the command it suggests
```

#### 8. Configure Nginx

Create `/etc/nginx/sites-available/campus-swap`:

```nginx
upstream campus_swap_api {
    server 127.0.0.1:3001;
}

server {
    listen 80;
    listen [::]:80;
    server_name api.campusswap.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.campusswap.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/api.campusswap.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.campusswap.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Gzip compression
    gzip on;
    gzip_types text/plain application/json;
    gzip_min_length 1000;

    # Proxy headers
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # WebSocket support
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";

    location / {
        proxy_pass http://campus_swap_api;
        proxy_buffering off;
        proxy_request_buffering off;
    }

    # Health check endpoint (no logging)
    location /api/health {
        proxy_pass http://campus_swap_api;
        access_log off;
    }
}
```

#### 9. Enable Nginx Site

```bash
sudo ln -s /etc/nginx/sites-available/campus-swap /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 10. Setup SSL with Let's Encrypt

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot certonly --nginx -d api.campusswap.com
```

### Option 3: Cloud Platforms

#### Heroku

```bash
# Login
heroku login

# Create app
heroku create campus-swap-api

# Add PostgreSQL addon
heroku addons:create heroku-postgresql:standard-0 --app campus-swap-api

# Set environment variables
heroku config:set NODE_ENV=production --app campus-swap-api
heroku config:set JWT_SECRET=<generate-new-secret> --app campus-swap-api
heroku config:set PAYSTACK_SECRET_KEY=<production-key> --app campus-swap-api

# Deploy
git push heroku main

# Run migrations
heroku run npx prisma migrate deploy --app campus-swap-api

# View logs
heroku logs --tail --app campus-swap-api
```

#### AWS EC2

See AWS documentation for EC2 setup, then follow "Traditional Server" guide above.

#### DigitalOcean App Platform

1. Connect GitHub repository
2. Create app from `docker-compose.yml`
3. Set environment variables in App Platform dashboard
4. Deploy

## Production Environment Variables

**Critical Variables (Update for Production):**

```dotenv
NODE_ENV=production
PORT=3001

# Database - Use managed service
DATABASE_URL="postgresql://user:password@rds.amazonaws.com/campus_swap"

# JWT - Generate new secret
JWT_SECRET="<generate-with-: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))">"

# Payment Gateway - Use production keys
PAYSTACK_SECRET_KEY="sk_live_xxxxxxxxxxxxx"
PAYSTACK_PUBLIC_KEY="pk_live_xxxxxxxxxxxxx"

# URLs
FRONTEND_URL="https://campusswap.com"
SERVER_URL="https://api.campusswap.com"

# Logging
LOG_LEVEL="warn"

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=1000

# File Uploads
UPLOAD_DIR="/var/uploads"
MAX_FILE_SIZE=5242880
```

## Monitoring and Maintenance

### Health Checks

```bash
# Check API health
curl https://api.campusswap.com/api/health

# Monitor with PM2
pm2 monit

# Docker logs
docker-compose logs -f app
```

### Database Backups

#### Automated Backups (PostgreSQL)

```bash
# Create backup script
mkdir -p /backups
cat > /backups/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/postgresql"
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U campus_user campus_swap | gzip > $BACKUP_DIR/campus_swap_$DATE.sql.gz
# Keep only last 7 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
EOF

chmod +x /backups/backup-db.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /backups/backup-db.sh
```

### Log Management

```bash
# View application logs
pm2 logs campus-swap-api

# View Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Rotate logs
sudo logrotate /etc/logrotate.d/campus-swap
```

### Monitoring Tools

**Recommended:**
- **PM2 Plus** - Process monitoring and management
- **Sentry** - Error tracking
- **New Relic** - APM and monitoring
- **DataDog** - Infrastructure monitoring
- **CloudFlare** - DDoS protection and CDN

### Performance Optimization

```javascript
// Enable compression in production
import compression from 'compression';
app.use(compression());

// Use Redis for caching
import redis from 'redis';
const redisClient = redis.createClient({
  host: 'redis-server',
  port: 6379
});

// Connection pooling
import { Pool } from 'pg';
const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30000,
});
```

## Troubleshooting

### Application won't start

```bash
# Check logs
pm2 logs campus-swap-api

# Check port availability
sudo lsof -i :3001

# Check database connection
psql -U campus_user -d campus_swap -c "SELECT 1;"
```

### High CPU usage

```bash
# Monitor processes
top
pm2 monit

# Check for memory leaks in code
# Look for unresolved promises
```

### Database connection issues

```bash
# Check connection
psql $DATABASE_URL

# Reset connections
psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='campus_swap';"

# Increase connection limit
# In postgresql.conf: max_connections = 200
```

### Nginx errors

```bash
# Check config syntax
sudo nginx -t

# View error log
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx
```

## Security Hardening

### 1. Firewall Rules

```bash
sudo ufw enable
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw deny 5432/tcp     # PostgreSQL (internal only)
```

### 2. SSH Key Authentication

```bash
# Generate key pair locally
ssh-keygen -t ed25519

# Copy public key to server
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@server-ip

# Disable password authentication
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart ssh
```

### 3. Environment Variables Protection

```bash
# Set proper file permissions
chmod 600 .env

# Use environment management tools
# Option 1: AWS Secrets Manager
# Option 2: HashiCorp Vault
# Option 3: 1Password
```

### 4. Rate Limiting

Already configured in application. Adjust in .env:
```
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
```

### 5. API Key Management

For third-party integrations:
- Store in `.env` or secrets manager
- Rotate periodically
- Never commit to repository
- Use least privilege principle

## Rollback Procedure

```bash
# If deployment goes wrong, rollback to previous version

# With PM2
pm2 delete campus-swap-api
git checkout previous-commit
npm run build
pm2 start dist/index.js --name "campus-swap-api"

# With Docker
docker-compose down
git checkout previous-commit
docker-compose up -d
```

## Monitoring Checklist

- [ ] Application health endpoint responding
- [ ] Database connections stable
- [ ] Error rate < 0.1%
- [ ] API response time < 200ms
- [ ] CPU usage < 50%
- [ ] Memory usage < 60%
- [ ] Disk space > 10% free
- [ ] SSL certificate valid
- [ ] Backups completed successfully
- [ ] Logs being collected

## Performance Baselines

**Target Metrics:**
- API Response Time: < 200ms (p95)
- Database Query Time: < 50ms (p95)
- Throughput: > 1000 requests/second
- Error Rate: < 0.1%
- Uptime: > 99.9%

## Support and Escalation

**On-call Procedures:**
1. Check application health
2. Review error logs
3. Check database status
4. Rollback if necessary
5. Escalate to team lead

---

**Last Updated:** 7 January 2026

**Need Help?**
- Check error logs first
- Review AWS/DigitalOcean documentation
- Contact DevOps team
