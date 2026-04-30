# SaaS Deployment: Vercel Frontend + VPS Backend

This deployment shape is for a central SaaS app:

```text
app.yourdomain.com  -> Vercel React frontend
api.yourdomain.com  -> VPS Nginx -> FastAPI backend
PostgreSQL          -> production database
ESP32 devices       -> https://api.yourdomain.com/api/data
```

Each client/site is represented as a tenant. The backend creates a tenant when a user registers, stores devices under that tenant, and filters dashboard data by the authenticated user's tenant.

## Backend VPS

Install system packages:

```bash
sudo apt update
sudo apt install -y python3-venv python3-pip nginx postgresql postgresql-contrib certbot python3-certbot-nginx
```

Create the database:

```bash
sudo -u postgres psql
CREATE DATABASE mmwave_dashboard;
CREATE USER mmwave_app WITH PASSWORD 'replace-with-strong-db-password';
GRANT ALL PRIVILEGES ON DATABASE mmwave_dashboard TO mmwave_app;
\q
```

Install backend dependencies:

```bash
cd /opt/mmwave-Dashboard/backend
python3 -m venv venv
./venv/bin/pip install -r requirements_sqlite.txt
```

Create `/opt/mmwave-Dashboard/backend/.env`:

```env
APP_ENV=production
DATABASE_URL=postgresql://mmwave_app:replace-with-strong-db-password@localhost:5432/mmwave_dashboard
JWT_SECRET_KEY=replace-with-strong-32-plus-character-secret
ALLOWED_ORIGINS=https://app.yourdomain.com
TRUSTED_HOSTS=api.yourdomain.com
API_HOST=127.0.0.1
API_PORT=8000
```

Apply migrations:

```bash
cd /opt/mmwave-Dashboard
set -a
. ./backend/.env
set +a
./backend/venv/bin/alembic upgrade head
```

Start once to verify the backend boots:

```bash
cd /opt/mmwave-Dashboard/backend
set -a
. ./.env
set +a
./venv/bin/python main.py
```

## systemd Service

Create `/etc/systemd/system/mmwave-backend.service`:

```ini
[Unit]
Description=mmWave Dashboard FastAPI Backend
After=network.target postgresql.service

[Service]
WorkingDirectory=/opt/mmwave-Dashboard/backend
EnvironmentFile=/opt/mmwave-Dashboard/backend/.env
ExecStart=/opt/mmwave-Dashboard/backend/venv/bin/python main.py
Restart=always
RestartSec=5
User=www-data
Group=www-data

[Install]
WantedBy=multi-user.target
```

Enable it:

```bash
sudo chown -R www-data:www-data /opt/mmwave-Dashboard
sudo systemctl daemon-reload
sudo systemctl enable --now mmwave-backend
sudo systemctl status mmwave-backend
```

## Nginx + HTTPS

Create `/etc/nginx/sites-available/mmwave-api`:

```nginx
server {
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable HTTPS:

```bash
sudo ln -s /etc/nginx/sites-available/mmwave-api /etc/nginx/sites-enabled/mmwave-api
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d api.yourdomain.com
```

## Vercel Frontend

In Vercel, set the project root to `frontend` and add:

```env
REACT_APP_BACKEND_URL=https://api.yourdomain.com
DISABLE_ESLINT_PLUGIN=true
```

Attach your custom domain:

```text
app.yourdomain.com
```

The included `frontend/vercel.json` rewrites all browser routes to `index.html`, so React Router works after refresh.

## Backups

Daily PostgreSQL backup:

```bash
pg_dump "$DATABASE_URL" > /var/backups/mmwave-dashboard-$(date +%F).sql
```

Restore:

```bash
psql "$DATABASE_URL" < /var/backups/mmwave-dashboard-YYYY-MM-DD.sql
```

Also keep VPS snapshots or managed database backups enabled.

## Production Checks

```bash
curl https://api.yourdomain.com/api/health
curl https://api.yourdomain.com/api/config/public
```

Run the smoke test against production only with a disposable account/device:

```bash
cd /opt/mmwave-Dashboard/backend
./venv/bin/python smoke_test.py --base-url https://api.yourdomain.com --email smoke+prod@example.com
```

Run tenant-isolation tests before shipping backend changes:

```bash
cd /opt/mmwave-Dashboard
./backend/venv/bin/pytest backend/tests
```
