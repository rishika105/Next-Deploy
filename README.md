# 🚀 Next Deploy - Deploy Platform

A full-stack scalable deployment platform inspired by Vercel, allowing users to deploy static websites with one click directly from GitHub repositories.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![Node.js](https://img.shields.io/badge/Node.js-22-green)
![AWS](https://img.shields.io/badge/AWS-ECS%20%7C%20S3-orange)

## ✨ Features

- 🔐 **Authentication** - Secure login with Clerk
- 🔗 **GitHub Integration** - OAuth app for repository access
- 🚀 **One-Click Deployment** - Deploy React, Vue, Angular, and more
- 📊 **Real-time Build Logs** - Live streaming with Kafka
- 📈 **Analytics Dashboard** - Track visitors, page views, and traffic
- 🌐 **Custom Domains** - Use custom subdomains for projects
- 🔄 **CI/CD Webhooks** - Auto-deploy on GitHub push
- ⚡ **Fast Delivery** - S3-backed static hosting

## 🏗️ Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Next.js   │─────▶│  API Server  │─────▶│   AWS ECS   │
│  Frontend   │      │  (Express)   │      │  Container  │
└─────────────┘      └──────────────┘      └─────────────┘
                            │                      │
                            ▼                      ▼
                     ┌──────────────┐       ┌──────────┐
                     │  PostgreSQL  │       │  Kafka   │
                     │   (Prisma)   │       │  Broker  │
                     └──────────────┘       └──────────┘
                            │                      │
                            ▼                      ▼
                     ┌──────────────┐       ┌──────────┐
                     │ ClickHouse   │       │  AWS S3  │
                     │  (Logs)      │       │ (Static) │
                     └──────────────┘       └──────────┘
```

## 🛠️ Tech Stack

### Frontend
- **Next.js** - React framework
- **Tailwind CSS** - Styling
- **Clerk** - Authentication
- **Axios** - HTTP client

### Backend
- **Node.js** - Runtime
- **Express.js** - API server
- **Prisma ORM** - Database ORM
- **Kafka** - Message streaming

### Databases
- **PostgreSQL** - Main database (projects, deployments, analytics)
- **ClickHouse** - logs storage

### Infrastructure
- **AWS ECS** - Container orchestration
- **AWS ECR** - Docker image registry
- **AWS S3** - Static file hosting
- **Docker** - Containerization

### DevOps
- **GitHub OAuth** - Repository access
- **Webhooks** - CI/CD automation

## 📋 Supported Frameworks

| Framework | Status | Build Command | Output Dir |
|-----------|--------|---------------|------------|
| React (CRA) | ✅ | `npm run build` | `build/` |
| Vite | ✅ | `npm run build` | `dist/` |
| Vue.js | ✅ | `npm run build` | `dist/` |
| Angular | ✅ | `ng build` | `dist/` |
| Gatsby | ✅ | `gatsby build` | `public/` |
| Svelte | ✅ | `npm run build` | `build/` |
| HTML/CSS/JS | ✅ | None | `./` |


## Prerequisites

- Node.js 22+
- Docker & Docker Compose
- AWS Account (ECS, S3, ECR)
- PostgreSQL database
- Kafka broker
- ClickHouse instance
- Clerk account
- GitHub OAuth App

## 🔄 Deployment Flow

1. User connects GitHub account via OAuth
2. User selects repository and custom subdomain
3. API server creates project in PostgreSQL
4. ECS task spins up build container
5. Container clones repo, runs `npm install && npm run build`
6. Build logs streamed via Kafka → ClickHouse
7. Static files uploaded to S3
8. Deployment status updated to `READY`
9. Reverse proxy routes `subdomain.localhost:8000` → S3

## 📈 Analytics Features

- **Traffic Monitoring** - Page views, unique visitors
- **Geographic Data** - Visitor countries and cities
- **Performance Metrics** - Average response times
- **Popular Pages** - Most visited URLs
- **Real-time Stats** - Active users in last 5 minutes
- **Recording 404s and Attack Attempts** - Detecting hack attempts, broken links & seo issues.

## 🔐 Security

- ✅ Clerk authentication for all routes
- ✅ Unique subdomain validation
- ✅ AWS IAM roles for ECS tasks
- ✅ S3 bucket policies for public read
- ✅ GitHub OAuth scopes limited to read-only

## Video Demo

https://github.com/user-attachments/assets/b44c5594-d48d-4c3f-a45b-7d49dcb295f8


## 🐛 Known Limitations

- Only supports **static sites** (no SSR/backend)
- Subdomains must be unique across all users
- Build timeout: 10 minutes
- Max file size: 50MB per file


## 🙏 Acknowledgments

- Inspired by [Vercel](https://vercel.com)
- Built with [Next.js](https://nextjs.org)
- Powered by [AWS](https://aws.amazon.com)


