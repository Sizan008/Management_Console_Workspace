#!/bin/sh
# =============================================================================
# docker-entrypoint.sh
# -----------------------------------------------------------------------------
# 1. Sets defaults for all config variables (overridden by env_file / environment)
# 2. Renders nginx.conf.template → /etc/nginx/nginx.conf
# 3. Renders config.json.template → /usr/share/nginx/html/asset/config.json
# 4. Starts Nginx
# =============================================================================

set -e

# --- Defaults (same pattern as Spring Boot's ${VAR:default}) ---
export APP_ID="${APP_ID:-1}"
export APP_NAME="${APP_NAME:-SENTINEL - DEV}"

export KC_URL="${KC_URL:-http://192.168.10.56:9080}"
export KC_REALM="${KC_REALM:-MicroCube_dev}"
export KC_CLIENT_ID="${KC_CLIENT_ID:-Sentinel_FE}"
export KC_SERVICE="${KC_SERVICE:-http://192.168.10.56:8090/resource-manager}"

export LOGIN_URL="${LOGIN_URL:-https://192.168.10.56:4001}"
export REDIRECT_URI="${REDIRECT_URI:-https://192.168.10.56:4001/landing/home}"

export API_BASE="${API_BASE:-http://192.168.10.56:8090}"
export MY_BASE="${MY_BASE:-http://192.168.10.56:8090/sentinel/api}"
export CENTRINO_URL="${CENTRINO_URL:-http://192.168.10.56:8090/centrino/api}"
export SENTINEL_URL="${SENTINEL_URL:-http://192.168.10.56:8090/sentinel/api}"
export WORKSPACE_SESSION_APP="${WORKSPACE_SESSION_APP:-true}"

export REPORT_MGMT_URL="${REPORT_MGMT_URL:-http://192.168.10.56:8090/centrino/api}"
export REPORT_GEN_URL="${REPORT_GEN_URL:-http://192.168.10.56:8090}"

export NOVU_IDENTIFIER="${NOVU_IDENTIFIER:-1uXpKIJUa3Rg}"
export NOVU_SOCKET="${NOVU_SOCKET:-http://192.168.10.56:3002}"
export NOVU_API="${NOVU_API:-http://192.168.10.56:3000/novu/api}"

# --- Render nginx.conf (restricted vars to protect Nginx's own $uri, $host, etc.) ---
NGINX_VARS='${NGINX_SERVER_NAME},${NGINX_HTTPS_PORT},${NGINX_SSL_CERT},${NGINX_SSL_KEY}'

echo "[entrypoint] Rendering nginx.conf from template..."
envsubst "$NGINX_VARS" \
  < /etc/nginx/nginx.conf.template \
  > /etc/nginx/nginx.conf

# --- Render config.json (all vars) ---
echo "[entrypoint] Rendering config.json from template..."
envsubst < /etc/nginx/config.json.template \
  > /usr/share/nginx/html/asset/config.json

echo "[entrypoint] Active configuration:"
echo "  NGINX_SERVER_NAME : ${NGINX_SERVER_NAME}"
echo "  NGINX_HTTPS_PORT  : ${NGINX_HTTPS_PORT}"
echo "  KC_URL            : ${KC_URL}"
echo "  API_BASE          : ${API_BASE}"

echo "[entrypoint] Starting Nginx..."
exec nginx -g "daemon off;"
