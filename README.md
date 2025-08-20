# Marketing Events System

The system consists of several microservices that work together to process marketing events:

- **Gateway**: Receives webhook events and publishes them to NATS JetStream topics
- **Collectors**: Process events from NATS streams and store them in PostgreSQL
- **Reporter**: Provides API endpoints for generating various reports
- **Monitoring**: Prometheus and Grafana for metrics collection and visualization

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)

### Single Command Startup

#### Using Docker Compose (Recommended)
```bash
docker-compose up -d
```

### Service URLs

- **Gateway**: http://localhost:3000
- **Reporter API**: http://localhost:3003
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3004 (admin/admin)

## 📊 API Endpoints

### Event Statistics Report
```bash
GET /api/v1/reports/events?from=2024-01-01&to=2024-01-31&source=facebook&funnelStage=top
```

### Revenue Report
```bash
GET /api/v1/reports/revenue?from=2024-01-01&to=2024-01-31&source=facebook
```

### Demographics Report
```bash
GET /api/v1/reports/demographics?from=2024-01-01&to=2024-01-31&source=tiktok
```

## 🔧 Configuration

### Environment Variables

The system uses environment variables for configuration. Each service has its own environment file:

```bash
cp gateway/env.example gateway/.env
cp collectors/env.example collectors/.env
cp reporters/env.example reporters/.env



#### Required Environment Variables:

**Gateway Service:**
- `NODE_ENV`: Environment (development/production)
- `PORT`: Service port (default: 3000)
- `NATS_URL`: NATS server URL
- `NATS_NAME`: NATS client name
- `NATS_MAX_RECONNECT_ATTEMPTS`: Max reconnection attempts
- `NATS_RECONNECT_TIME_WAIT`: Reconnection wait time
- `DATABASE_URL`: PostgreSQL connection string
- `LOG_LEVEL`: Logging level (debug/info/warn/error)
- `CORRELATION_ID_HEADER`: Header name for correlation IDs
- `METRICS_PORT`: Metrics endpoint port

**Collectors Service:**
- `COLLECTOR_TYPE`: Type of collector (facebook/tiktok)
- `NATS_URL`: NATS server URL
- `NATS_NAME`: NATS client name
- `DATABASE_URL`: PostgreSQL connection string
- `LOG_LEVEL`: Logging level
- `CORRELATION_ID_HEADER`: Header name for correlation IDs

**Reporter Service:**
- `PORT`: Service port (default: 3003)
- `DATABASE_URL`: PostgreSQL connection string
- `LOG_LEVEL`: Logging level
- `CORRELATION_ID_HEADER`: Header name for correlation IDs

### Docker Compose Services

- **postgres**: PostgreSQL 15 with persistent storage
- **nats**: NATS server with JetStream enabled
- **publisher**: External event publisher service
- **gateway**: Event gateway service
- **fb-collector**: Facebook events collector
- **ttk-collector**: TikTok events collector
- **reporter**: Reporting API service
- **prometheus**: Metrics collection
- **grafana**: Metrics visualization

### Gateway Metrics
- Events accepted, processed, and failed
- Processing duration
- Active connections

### Collector Metrics
- Events accepted, processed, and failed (per collector type)
- Processing duration
- Active connections

### Reporter Metrics
- Report generation latency
- Request success/failure rates
- Active requests

### Grafana Dashboard
The system includes a pre-configured Grafana dashboard with:
- Real-time metrics visualization
- Service health monitoring
- Performance analytics

## 🔄 Event Flow

1. **Publisher** sends events to **Gateway** via webhook
2. **Gateway** validates events and publishes to NATS JetStream topics
3. **Collectors** subscribe to relevant topics and process events
4. **Collectors** store processed events in PostgreSQL
5. **Reporter** queries database to generate reports
6. **Monitoring** collects metrics from all services

## 🚀 Scaling

## 🛡️ Features

- **Structured Logging**: Correlation IDs for tracing events across services
- **Health Checks**: Liveness and readiness endpoints for all services
- **Graceful Shutdown**: Proper handling of in-flight events
- **Data Persistence**: PostgreSQL with Prisma ORM
- **Automatic Migrations**: Database schema updates on startup
- **Validation**: Zod schema validation for all inputs
- **Monitoring**: Comprehensive metrics collection and visualization

### Health Checks

```bash
# Check service health
curl http://localhost:3000/health/ready
curl http://localhost:3001/health/ready
curl http://localhost:3003/health/ready
```


