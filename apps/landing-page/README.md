# PersonalApp.id Landing Page

Landing page sederhana untuk domain personalapp.id yang di-deploy menggunakan Dokploy.

> Part of Central Kitchen monorepo - located in `apps/landing-page`

## Teknologi

- HTML5, CSS3, JavaScript
- Nginx (Alpine Linux)
- Docker
- Dokploy untuk deployment

## Fitur

- ✨ Desain modern dan responsive
- 🚀 Lightweight dan cepat
- 📱 Mobile-friendly
- 🔒 Security headers configured
- ⚡ Gzip compression enabled
- 💾 Static asset caching

## Local Development

Buka file `index.html` langsung di browser atau:

```bash
# Dari root project
cd apps/landing-page
open index.html  # macOS
start index.html # Windows
```

## Deployment ke Dokploy

1. Push code ke Git repository
2. Buat aplikasi baru di Dokploy
3. Hubungkan dengan repository: `ariefan/central-kitchen`
4. **Set root directory**: `apps/landing-page`
5. Set Dockerfile path: `apps/landing-page/Dockerfile`
6. Set domain ke personalapp.id
7. Deploy!

## Build Docker Image Locally

Dari root project:

```bash
# Build dari root
docker build -f apps/landing-page/Dockerfile -t personalapp-landing apps/landing-page

# Atau dari dalam folder landing-page
cd apps/landing-page
docker build -t personalapp-landing .

# Run container
docker run -p 8080:80 personalapp-landing
```

Akses di http://localhost:8080

## Struktur File

```
apps/landing-page/
├── index.html      # Landing page HTML
├── nginx.conf      # Nginx configuration
├── Dockerfile      # Docker build instructions
├── .dockerignore   # Docker ignore patterns
└── README.md       # This file
```
