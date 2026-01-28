# Campus Swap Backend - Production Deployment Checklist

This checklist ensures your Campus Swap backend is production-ready and deployed securely.

## Pre-Deployment (2-3 weeks before)

### Code Quality & Testing
- [ ] All tests pass: `npm test`
- [ ] Code coverage is >80%: `npm test -- --coverage`
- [ ] ESLint passes: `npm run lint`
- [ ] TypeScript compilation succeeds: `npm run type-check`
- [ ] Build succeeds: `npm run build`
- [ ] No security vulnerabilities: `npm audit`
- [ ] Load testing completed for expected traffic
- [ ] Stress testing completed for peak load scenarios

### Documentation
- [ ] README.md is current and accurate
- [ ] API documentation (Swagger) is complete
- [ ] DEPLOYMENT.md is updated with your specific setup
- [ ] Environment variables are documented in .env.example
- [ ] Database schema is documented
- [ ] Setup instructions tested with fresh environment

### Database Preparation
- [ ] Database migrations are tested on staging
- [ ] Backup strategy is defined and tested
- [ ] Data migration scripts are tested (if needed)
- [ ] Performance indexes are added
- [ ] Query performance is acceptable (<100ms p95)
- [ ] Connection pool settings are optimized

### Security Review
- [ ] All secrets are externalized (no hardcoded credentials)
- [ ] JWT secret is strong and unique (min 32 characters)
- [ ] CORS is properly configured for your domain
- [ ] Rate limiting is configured
- [ ] SQL injection protection verified
- [ ] XSS protection enabled
- [ ] CSRF tokens implemented where needed
- [ ] API authentication is enforced
- [ ] Sensitive endpoints require proper authorization
- [ ] Password hashing is implemented (bcrypt verified)
- [ ] Input validation is in place for all endpoints
- [ ] Error messages don't leak sensitive information

### Performance Optimization
- [ ] Database queries are optimized
- [ ] N+1 queries are eliminated
- [ ] Caching strategy is implemented (Redis)
- [ ] Static assets are minified
- [ ] Assets use compression (gzip)
- [ ] API response times are < 200ms
- [ ] Database query times are < 50ms
- [ ] Memory leaks are tested and eliminated
- [ ] Connection pooling is configured
- [ ] Load balancing strategy is defined (if needed)

## Deployment Week

### Infrastructure Setup
- [ ] Database server is ready (PostgreSQL 12+)
- [ ] Application server is provisioned
- [ ] Redis server is provisioned (if using)
- [ ] CDN is configured (if using)
- [ ] Backup storage is configured
- [ ] Monitoring infrastructure is ready
- [ ] Logging infrastructure is ready
- [ ] SSL/TLS certificates are installed

### Environment Configuration
- [ ] `.env` is created with production values
- [ ] `JWT_SECRET` is set to strong, unique value
- [ ] `FRONTEND_URL` is set correctly
- [ ] `SERVER_URL` is set correctly
- [ ] Database connection string is correct
- [ ] Redis URL is correct (if applicable)
- [ ] Paystack keys are production keys
- [ ] AWS S3 credentials are set (if applicable)
- [ ] Email configuration is correct
- [ ] All sensitive variables are in `.env`, not in code

### Docker & Container Setup (if using Docker)
- [ ] Dockerfile is production-optimized
- [ ] Docker image builds successfully
- [ ] Image size is reasonable (< 500MB)
- [ ] All necessary files are included in image
- [ ] Sensitive files are excluded (.dockerignore)
- [ ] Health checks are working
- [ ] docker-compose.yml is production-ready
- [ ] Volume mounts are properly configured
- [ ] Environment variables are injected correctly

### Application Deployment
- [ ] Dependencies are installed: `npm ci --only=production`
- [ ] Application builds successfully: `npm run build`
- [ ] Database migrations are applied: `npx prisma migrate deploy`
- [ ] Database is seeded (if needed)
- [ ] Prisma client is generated
- [ ] Start command is correct
- [ ] Process manager is configured (PM2, systemd, etc.)
- [ ] Application starts without errors
- [ ] Application responds to health checks

### Web Server Configuration (if using Nginx/Apache)
- [ ] Nginx/Apache is installed and configured
- [ ] Reverse proxy is configured correctly
- [ ] SSL/TLS certificate is installed
- [ ] SSL/TLS is properly configured
- [ ] HTTP redirects to HTTPS
- [ ] HSTS header is set
- [ ] Gzip compression is enabled
- [ ] Rate limiting is configured
- [ ] Security headers are set (X-Frame-Options, X-Content-Type-Options, etc.)
- [ ] CORS headers are correct
- [ ] Static files are cached appropriately

### Monitoring & Logging Setup
- [ ] Application logging is configured
- [ ] Log rotation is configured
- [ ] Error tracking (Sentry) is configured
- [ ] Performance monitoring (APM) is configured
- [ ] Health check endpoint is tested
- [ ] Uptime monitoring is configured
- [ ] Email alerts are configured
- [ ] Slack integration is configured (if desired)
- [ ] Monitoring dashboards are created
- [ ] Disk space monitoring is active
- [ ] Memory usage monitoring is active
- [ ] CPU usage monitoring is active
- [ ] Database connection pool monitoring is active

### Database Verification
- [ ] Database is accessible from application
- [ ] Connection pool is working
- [ ] All migrations have been applied: `npx prisma migrate status`
- [ ] Database schema is correct
- [ ] Indexes are created
- [ ] Backups are working
- [ ] Backup restoration is tested
- [ ] Database user has minimal required permissions
- [ ] Database password is strong and unique
- [ ] Query performance is acceptable

### API Endpoint Testing
- [ ] All critical endpoints are tested
- [ ] Authentication endpoints work
- [ ] User creation works
- [ ] Listing creation works
- [ ] Payment processing works
- [ ] Wallet operations work
- [ ] Escrow transactions work
- [ ] Dispute resolution works
- [ ] Error responses are correct
- [ ] Validation errors are returned properly
- [ ] Rate limiting works correctly

## Deployment Day

### Pre-Deployment Confirmation
- [ ] Database backup is current
- [ ] Rollback plan is documented and tested
- [ ] Team is on standby
- [ ] Communication channels are open
- [ ] Deployment window is known to team/users
- [ ] Incident response plan is ready

### Deployment Steps
- [ ] Pull latest code: `git pull origin main`
- [ ] Install dependencies: `npm ci --only=production`
- [ ] Build application: `npm run build`
- [ ] Apply migrations: `npx prisma migrate deploy`
- [ ] Run seed if needed: `npx prisma db seed`
- [ ] Start application: `npm start` or via PM2/systemd
- [ ] Verify application is running
- [ ] Check application logs for errors
- [ ] Monitor error tracking (Sentry)
- [ ] Monitor performance metrics

### Post-Deployment Verification
- [ ] Health check endpoint responds: `curl https://api.yourdomain.com/health`
- [ ] Frontend can communicate with API
- [ ] Authentication works end-to-end
- [ ] Database operations are working
- [ ] File uploads work (if applicable)
- [ ] Payment processing works
- [ ] Wallet operations work
- [ ] Real-time features work (WebSocket)
- [ ] Email notifications are sent
- [ ] SMS notifications are sent (if applicable)
- [ ] No error spikes in logs
- [ ] CPU usage is normal
- [ ] Memory usage is normal
- [ ] Database query times are acceptable
- [ ] API response times are acceptable

### Smoke Tests
- [ ] User registration flow works
- [ ] User login flow works
- [ ] Create listing works
- [ ] View listing works
- [ ] Purchase listing works
- [ ] Confirm receipt works
- [ ] Leave review works
- [ ] Withdraw funds works
- [ ] Admin dashboard works (if applicable)
- [ ] Analytics work

## Post-Deployment (First 24 hours)

### Monitoring
- [ ] Error rates are normal (< 0.1%)
- [ ] Response times are acceptable (p95 < 500ms)
- [ ] No memory leaks detected
- [ ] No database connection issues
- [ ] Uptime is 100%
- [ ] No unexpected error logs
- [ ] Performance metrics are healthy

### Communication
- [ ] Team is notified of successful deployment
- [ ] Users are notified (if applicable)
- [ ] Status page is updated
- [ ] Documentation is updated
- [ ] Release notes are published

### Rollback Readiness
- [ ] Rollback plan is tested and ready
- [ ] Previous version is available
- [ ] Database can be rolled back
- [ ] Team knows rollback procedure
- [ ] Rollback time estimate is < 15 minutes

## Post-Deployment (Week 1)

### Performance Review
- [ ] Performance baseline is established
- [ ] No performance regressions detected
- [ ] Database indexes are effective
- [ ] Caching is working properly
- [ ] Query performance is good
- [ ] API throughput meets expectations

### Security Review
- [ ] No security alerts
- [ ] SSL/TLS certificate is valid
- [ ] Security headers are correct
- [ ] No CORS issues
- [ ] Rate limiting is working
- [ ] Authentication is secure

### User Feedback
- [ ] No critical issues reported
- [ ] No major bugs reported
- [ ] User experience is positive
- [ ] Load times are acceptable
- [ ] Features work as expected

## Ongoing (Weekly/Monthly)

### Maintenance
- [ ] Database backups are current
- [ ] Log files are rotated
- [ ] Unused files are cleaned up
- [ ] Dependencies are updated (monthly)
- [ ] Security patches are applied
- [ ] Performance is monitored

### Optimization
- [ ] Slow queries are identified and optimized
- [ ] Unused indexes are removed
- [ ] Database is vacuumed (PostgreSQL)
- [ ] Cache hit rates are monitored
- [ ] Error rates are tracked

### Documentation
- [ ] Deployment notes are updated
- [ ] Known issues are documented
- [ ] Performance baselines are updated
- [ ] Runbooks are kept current

## Rollback Procedure

If critical issues occur:

1. **Alert Team**: Notify team immediately
2. **Assess**: Determine if rollback is needed
3. **Notify Users**: Update status page if needed
4. **Backup Database**: Backup current database state
5. **Rollback Code**: `git checkout [previous-version]`
6. **Rollback Database**: Run `npx prisma migrate resolve --rolled-back-to [migration-name]` (if needed)
7. **Restart Application**: `npm start` or restart via PM2/systemd
8. **Verify**: Test critical functionality
9. **Communicate**: Notify team and users of rollback
10. **Post-Mortem**: Schedule review of what went wrong

---

**Note**: This checklist is comprehensive but should be adapted to your specific needs and infrastructure. Keep it updated as your system evolves.

For more information, see [DEPLOYMENT.md](../docs/DEPLOYMENT.md) and [README.md](../README.md).
