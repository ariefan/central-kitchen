# PersonalApp.id Landing Page

Landing page sederhana untuk domain personalapp.id yang di-deploy menggunakan Dokploy.

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

Buka file `index.html` langsung di browser.

## Deployment ke Dokploy

1. Push code ke Git repository
2. Buat aplikasi baru di Dokploy
3. Hubungkan dengan repository
4. Set domain ke personalapp.id
5. Deploy!

## Build Docker Image Locally (Optional)

```bash
docker build -t personalapp-landing .
docker run -p 8080:80 personalapp-landing
```

Akses di http://localhost:8080
