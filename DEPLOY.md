# Deployment Guide: DigitalOcean

This project is configured for **DigitalOcean App Platform** (Starter Tier - Free for Static Sites).

## 1. Quick Deploy (via App Spec)

Since we included a `.do/app.yaml` spec file, you can deploy in one command if you have the `doctl` CLI installed:

```bash
doctl apps create --spec .do/app.yaml
```

## 2. Manual Deploy (via Dashboard)

1.  Log in to [cloud.digitalocean.com](https://cloud.digitalocean.com).
2.  Go to **Apps** -> **Create App**.
3.  Select **GitHub** as the source.
4.  Choose the repository: `FaizFaizal1/quran-app`.
5.  **Source Directory**: `/` (root).
6.  **Auto-Deploy**: Enabled.
7.  Select **Static Site** (Free Tier).
8.  Click **Next** until finish.

## 3. Verification
Once deployed, DigitalOcean will provide a URL (e.g., `quran-app-xyz.ondigitalocean.app`).
Visit this URL on your phone to verify the mobile layout.
