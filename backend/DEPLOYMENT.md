# ChargeByte Backend — Deployment Guide

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **MySQL** 8.0+
- **npm** or **yarn**
- A Linux server (Ubuntu 22.04 recommended) or any cloud VM (AWS EC2, DigitalOcean, Hetzner, etc.)

---

## 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install MySQL
sudo apt install -y mysql-server
sudo mysql_secure_installation

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Nginx (reverse proxy)
sudo apt install -y nginx
```

## 2. MySQL Database Setup

```bash
sudo mysql -u root -p
```

```sql
CREATE DATABASE chargebyte_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'chargebyte_user'@'localhost' IDENTIFIED BY 'ChargeByteDB2026';
GRANT ALL PRIVILEGES ON chargebyte_db.* TO 'chargebyte_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## 3. Deploy Application

```bash
# Create app directory
sudo mkdir -p /var/www/chargebyte-api
sudo chown $USER:$USER /var/www/chargebyte-api

# Clone or upload backend files
cd /var/www/chargebyte-api
# Copy all files from the backend/ folder here

# Install dependencies
npm install --production

# Configure environment
cp .env.example .env
nano .env
# Fill in all values:
#   DB_HOST=localhost
#   DB_USER=chargebyte_user
#   DB_PASSWORD=YOUR_STRONG_PASSWORD
#   DB_NAME=chargebyte_db
#   JWT_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
#   JWT_REFRESH_SECRET=<generate another one>
#   CORS_ORIGIN=https://your-frontend.lovable.app
#   NODE_ENV=production

# Run migrations
npm run db:migrate

# Seed demo data (optional)
npm run db:seed

# Test
node src/server.js
# Should print: ChargeByte API running on port 5000
# Ctrl+C to stop
```

## 4. PM2 Process Manager

```bash
# Start with PM2
pm2 start src/server.js --name chargebyte-api

# Auto-restart on reboot
pm2 startup
pm2 save

# Useful commands
pm2 logs chargebyte-api
pm2 restart chargebyte-api
pm2 status
```

## 5. Nginx Reverse Proxy

```bash
sudo nano /etc/nginx/sites-available/chargebyte-api
```

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/chargebyte-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 6. SSL with Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
# Certbot auto-renews via systemd timer
```

## 7. Firewall

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 8. Connect Frontend

Update your frontend `.env` or API config to point to:

```
https://api.yourdomain.com/api
```

---

## API Endpoints Reference

### Auth

| Method | Endpoint            | Description      | Auth |
| ------ | ------------------- | ---------------- | ---- |
| POST   | `/api/auth/login`   | Login            | No   |
| POST   | `/api/auth/refresh` | Refresh token    | No   |
| POST   | `/api/auth/logout`  | Logout           | Yes  |
| GET    | `/api/auth/me`      | Get current user | Yes  |

### Users (super_admin only for write)

| Method | Endpoint         | Description    |
| ------ | ---------------- | -------------- |
| GET    | `/api/users`     | List all users |
| GET    | `/api/users/:id` | Get user by ID |
| POST   | `/api/users`     | Create user    |
| PUT    | `/api/users/:id` | Update user    |
| DELETE | `/api/users/:id` | Delete user    |

### Stations

| Method | Endpoint                   | Description    |
| ------ | -------------------------- | -------------- |
| GET    | `/api/stations`            | List stations  |
| GET    | `/api/stations/:id`        | Get station    |
| POST   | `/api/stations`            | Create station |
| PUT    | `/api/stations/:id`        | Update station |
| PATCH  | `/api/stations/:id/toggle` | Toggle active  |

### Machines

| Method | Endpoint                   | Description    |
| ------ | -------------------------- | -------------- |
| GET    | `/api/machines`            | List machines  |
| GET    | `/api/machines/:id`        | Get machine    |
| POST   | `/api/machines`            | Create machine |
| PUT    | `/api/machines/:id`        | Update machine |
| PATCH  | `/api/machines/:id/status` | Set status     |

### Rentals

| Method | Endpoint                  | Description   |
| ------ | ------------------------- | ------------- |
| GET    | `/api/rentals`            | List rentals  |
| GET    | `/api/rentals/:id`        | Get rental    |
| PATCH  | `/api/rentals/:id/cancel` | Cancel rental |

### Transactions (admin+)

| Method | Endpoint                      | Description       |
| ------ | ----------------------------- | ----------------- |
| GET    | `/api/transactions`           | List transactions |
| GET    | `/api/transactions/callbacks` | M-Pesa callbacks  |
| GET    | `/api/transactions/:id`       | Get transaction   |

### Revenue

| Method | Endpoint                  | Description        |
| ------ | ------------------------- | ------------------ |
| GET    | `/api/revenue/summary`    | Revenue summary    |
| GET    | `/api/revenue/by-station` | Revenue by station |
| GET    | `/api/revenue/by-machine` | Revenue by machine |
| GET    | `/api/revenue/over-time`  | Revenue over time  |

### Campaigns

| Method | Endpoint             | Description     |
| ------ | -------------------- | --------------- |
| GET    | `/api/campaigns`     | List campaigns  |
| GET    | `/api/campaigns/:id` | Get campaign    |
| POST   | `/api/campaigns`     | Create campaign |
| PUT    | `/api/campaigns/:id` | Update campaign |

### Operations (staff+)

| Method | Endpoint                                 | Description     |
| ------ | ---------------------------------------- | --------------- |
| GET    | `/api/operations/leads`                  | List leads      |
| POST   | `/api/operations/leads`                  | Create lead     |
| PUT    | `/api/operations/leads/:id`              | Update lead     |
| GET    | `/api/operations/reports`                | List reports    |
| POST   | `/api/operations/reports`                | Create report   |
| GET    | `/api/operations/daily-plans`            | My daily plans  |
| POST   | `/api/operations/daily-plans`            | Create plan     |
| PATCH  | `/api/operations/daily-plans/:id/toggle` | Toggle complete |

### Notifications

| Method | Endpoint                           | Description        |
| ------ | ---------------------------------- | ------------------ |
| GET    | `/api/notifications`               | List notifications |
| GET    | `/api/notifications/unread-count`  | Unread count       |
| PATCH  | `/api/notifications/:id/read`      | Mark read          |
| PATCH  | `/api/notifications/:id/dismiss`   | Dismiss            |
| POST   | `/api/notifications/mark-all-read` | Mark all read      |

### Audit Logs (super_admin only)

| Method | Endpoint     | Description     |
| ------ | ------------ | --------------- |
| GET    | `/api/audit` | List audit logs |

---

## Security Features

- **Helmet.js** — HTTP security headers
- **CORS** — Configurable origin whitelist
- **Rate limiting** — Global + stricter on auth endpoints
- **HPP** — HTTP parameter pollution protection
- **bcryptjs** — Password hashing (12 rounds)
- **JWT** — Access + refresh token rotation
- **Input validation** — express-validator on all routes
- **RBAC** — Role-based middleware on every route
- **Audit logging** — Automatic tracking of all mutations
- **SQL injection prevention** — Parameterized queries throughout
- **Body size limiting** — 10KB max request body

## Default Credentials (seed data)

| Email                     | Password        | Role               |
| ------------------------- | --------------- | ------------------ |
| superadmin@chargebyte.com | ChargeByte2024! | Super Admin        |
| admin@chargebyte.com      | ChargeByte2024! | Admin              |
| staff@chargebyte.com      | ChargeByte2024! | Staff              |
| partner@chargebyte.com    | ChargeByte2024! | Location Partner   |
| adclient@chargebyte.com   | ChargeByte2024! | Advertising Client |

**⚠️ Change all passwords immediately after first login in production!**
