# FoodLab LIMS Deployment Guide

## 1. One-Time Manual Setup

- [ ] **TODO - not done yet: Create dedicated CI SSH key pair**
  Run on your local computer to generate an ed25519 key without passphrase:
  ```bash
  ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/foodlab_deploy_key -N ""
  ```

- [ ] **TODO - not done yet: Add public key to VPS deploy user**
  Append the contents of `~/.ssh/foodlab_deploy_key.pub` into `/home/deploy/.ssh/authorized_keys` on your Ubuntu VPS:
  ```bash
  mkdir -p /home/deploy/.ssh
  chmod 700 /home/deploy/.ssh
  cat foodlab_deploy_key.pub >> /home/deploy/.ssh/authorized_keys
  chmod 600 /home/deploy/.ssh/authorized_keys
  chown -R deploy:deploy /home/deploy/.ssh
  ```

- [ ] **TODO - not done yet: Add the 3 GitHub Repository Secrets**
  Navigate to GitHub Repository -> Settings -> Secrets and variables -> Actions, and add:
  - `VPS_HOST`: Public IP address or hostname of your VPS
  - `VPS_USER`: `deploy`
  - `VPS_SSH_KEY`: Full private key text from `~/.ssh/foodlab_deploy_key` (including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`)

- [ ] **TODO - not done yet: Allow VPS IP in MongoDB Atlas Network Access**
  In the MongoDB Atlas web dashboard:
  - Go to Network Access -> IP Access List
  - Add your VPS public IP address so the backend container can connect to Atlas

- [ ] **TODO - not done yet: Copy Caddy stack files to ~/stacks/caddy and start Caddy**
  On your VPS, copy `deploy/caddy/docker-compose.yml` and `deploy/caddy/Caddyfile` into `/home/deploy/stacks/caddy/`:
  ```bash
  cd /home/deploy/stacks/caddy
  docker compose up -d
  ```
  Verify that Caddy starts and connects to the existing `web` network.

- [ ] **TODO - not done yet: Create ~/stacks/foodlab_lims/.env by hand**
  On your VPS, create `/home/deploy/stacks/foodlab_lims/.env` with your production values:
  ```bash
  cat << 'EOF' > /home/deploy/stacks/foodlab_lims/.env
  PORT=5000
  NODE_ENV=production
  TZ=Asia/Kolkata
  MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
  JWT_SECRET=<your-strong-random-secret>
  SAMPLE_ID_START=1100
  FRONTEND_URL=https://ftl.acrocsit.in
  LOG_LEVEL=info
  LOG_DB_ENABLED=true
  BREVO_API_KEY=<optional_key>
  BREVO_SENDER_EMAIL=<optional_sender_email>
  EOF
  chmod 600 /home/deploy/stacks/foodlab_lims/.env
  ```

- [ ] **TODO - not done yet: Run the first deploy**
  Trigger the deployment by pushing a commit to the `main` branch, or run the workflow manually from the GitHub Actions tab.

---

## 2. How to Roll Back

If an issue occurs with a release, roll back to any previous commit SHA directly on the VPS:

1. SSH into the VPS as the deploy user:
   ```bash
   ssh deploy@<VPS_HOST>
   ```

2. Change to the stack folder and restart with the specific commit SHA:
   ```bash
   cd ~/stacks/foodlab_lims
   TAG=<commit-sha> docker compose pull
   TAG=<commit-sha> docker compose up -d
   ```

---

## 3. Logs and Service Management

All commands are executed from the stack directory (`~/stacks/foodlab_lims` or `~/stacks/caddy`).

### View Real-Time Logs
```bash
# Follow live logs for both backend and frontend
cd ~/stacks/foodlab_lims
docker compose logs -f

# Follow backend logs only (last 100 lines)
docker compose logs -f --tail=100 backend

# Follow frontend logs only
docker compose logs -f --tail=100 frontend

# Follow Caddy reverse proxy logs
cd ~/stacks/caddy
docker compose logs -f
```

### Check Container Status and Health
```bash
cd ~/stacks/foodlab_lims
docker compose ps
```

### Restart Services
```bash
# Restart backend only
cd ~/stacks/foodlab_lims
docker compose restart backend

# Restart frontend only
docker compose restart frontend

# Restart the entire application stack
docker compose restart

# Restart Caddy reverse proxy
cd ~/stacks/caddy
docker compose restart
```
