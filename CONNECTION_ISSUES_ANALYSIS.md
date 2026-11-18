# Análise de Falhas de Conexão - Stellar Legacy

## Resumo Executivo

Após análise completa do código (servidor Node.js/Express + WebSocket, cliente Web, APK Android), identifiquei **3 causas principais** para as falhas de conexão:

---

## 🔴 Causa Principal: Render Free Plan Cold Start

### O Problema
- O servidor está no **plano gratuito do Render** (`render.yaml: plan: free`)
- Render **desliga o serviço após 15 min de inatividade**
- **Cold start leva 30-60 segundos** para o servidor acordar
- Durante esse tempo:
  - HTTP `/api/config` → timeout/503
  - WebSocket `/ws` → conexão recusada ou auth timeout (8s)

### Evidências no Código
```yaml
# render.yaml
plan: free  # ← Congela após 15min inativo
healthCheckPath: /health
```

```javascript
// server/world.js:1399 - Timeout de auth MUITO CURTO para cold start
ws.authTimer = setTimeout(() => {
  ws.close(4401, 'auth timeout');
}, 8000);  // 8 segundos apenas!
```

```javascript
// public/world.js:14 - URL do WebSocket usa location.host
url() { 
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${location.host}/ws`;
}
```

---

## 🟡 Causa Secundária: Timeout de Auth WebSocket Muito Agressivo

### O Problema
- **8 segundos** para autenticar no WebSocket
- Redes móveis (3G/4G instável) podem levar 10-20s para handshake TLS + WebSocket
- APK carrega assets localmente, mas **WebSocket SEMPRE vai para o Render**

### Fluxo Atual (Problemático)
```
1. Usuário abre APK
2. WebView carrega index.html do Render (cold start inicia)
3. JS inicia → SharedUniverseClient.connect()
4. new WebSocket('wss://darkorbit-legacy.onrender.com/ws')
5. Servidor AINDA ACORDANDO → conexão aceita mas não responde
6. 8s depois → Servidor fecha: "auth timeout"
7. Cliente reconecta (backoff exponencial máx 12s)
8. Loop até servidor acordar (30-60s total)
```

---

## 🟢 Causa Terciária: Falta de Health Check Prévio

### O Problema
- Cliente **não verifica se servidor está acordado** antes de abrir WebSocket
- Deveria fazer `GET /health` primeiro, só conectar WebSocket se `ok: true`

---

## 🛠️ Soluções Recomendadas (Por Prioridade)

### 1. CORREÇÃO IMEDIATA - Aumentar Timeout de Auth (Server)

**Arquivo:** `server/world.js:1399`

```javascript
// ANTES (8s - muito curto)
ws.authTimer = setTimeout(() => {
  try { ws.close(4401, 'auth timeout'); } catch {}
}, 8000);

// DEPOIS (30s - acomoda cold start + rede móvel)
ws.authTimer = setTimeout(() => {
  try { ws.close(4401, 'auth timeout'); } catch {}
}, 30000);
```

---

### 2. CORREÇÃO IMEDIATA - Health Check Antes do WebSocket (Client)

**Arquivo:** `public/world.js` - método `connect()`

```javascript
connect() {
  if (this.manual) return;
  if (this.ws && [WebSocket.OPEN, WebSocket.CONNECTING].includes(this.ws.readyState)) return;
  
  const c = this.getCredentials?.() || {};
  if (!c.accessToken || !c.gameSessionId) { this.status('auth_error'); return; }
  if (this.failedAuthToken === c.accessToken) { this.status('auth_error'); return; }

  // ✅ NOVO: Verificar se servidor está acordado ANTES de conectar WebSocket
  this.status('checking_server');
  this.checkServerHealth().then(healthy => {
    if (!healthy) {
      this.status('server_waking');
      this.scheduleReconnect(5000); // Tenta novamente em 5s
      return;
    }
    this.doConnect(c);
  }).catch(() => {
    this.status('reconnecting');
    this.scheduleReconnect(5000);
  });
}

// ✅ NOVO: Método para checar health do servidor
async checkServerHealth() {
  try {
    const res = await fetch(`${location.protocol}//${location.host}/health`, { 
      cache: 'no-store',
      signal: AbortSignal.timeout(10000) // 10s timeout
    });
    const data = await res.json();
    return data.ok === true;
  } catch {
    return false;
  }
}

// ✅ NOVO: Extrai lógica de conexão real
doConnect(credentials) {
  this.status('connecting');
  this.lastConnectAt = Date.now();
  this.lastRxAt = this.lastConnectAt;
  this.authed = false;
  
  let ws;
  try { ws = new WebSocket(this.url()); } 
  catch { this.status('reconnecting'); this.scheduleReconnect(); return; }
  
  this.ws = ws;
  this.clearPulse();
  // ... resto do código existente do connect()
}
```

---

### 3. CORREÇÃO IMEDIATA - Network Security Config (Android)

**Novo arquivo:** `android/app/src/main/res/xml/network_security_config.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="false">
        <domain includeSubdomains="true">darkorbit-legacy.onrender.com</domain>
        <domain includeSubsubdomains="true">*.supabase.co</domain>
    </domain-config>
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system"/>
        </trust-anchors>
    </base-config>
</network-security-config>
```

**Atualizar `AndroidManifest.xml`:**
```xml
<application
    android:networkSecurityConfig="@xml/network_security_config"
    ... >
```

---

### 4. MELHORIA - Backoff Inteligente para Cold Start (Client)

**Arquivo:** `public/world.js` - método `scheduleReconnect()`

```javascript
scheduleReconnect(delay = null) {
  if (this.manual || this.failedAuthToken === this.getCredentials?.()?.accessToken) return;
  clearTimeout(this.reconnectTimer);
  
  // ✅ NOVO: Backoff mais agressivo para cold start (até 60s)
  const wait = delay === null 
    ? Math.min(60000, 2000 * (2 ** Math.min(6, this.reconnectAttempts++)))
    : delay;
    
  this.reconnectTimer = setTimeout(() => {
    this.reconnectTimer = null;
    this.connect();
  }, wait);
}
```

---

### 5. SOLUÇÃO DEFINITIVA - Upgrade Render Plan

| Plano | Cold Start | Custo/Mês | Recomendado Para |
|-------|------------|-----------|------------------|
| Free | 30-60s após 15min idle | $0 | Dev/Teste apenas |
| Starter | **Sempre acordado** | $7 | **Produção** |
| Standard | Sempre acordado + mais recursos | $25 | Alta escala |

**Ação:** No Render Dashboard → Service → Settings → Plan → Upgrade to **Starter ($7/mês)**

---

## 📋 Checklist de Validação

Após aplicar as correções:

- [ ] **Server:** Timeout auth WebSocket = 30s
- [ ] **Client:** Health check antes de WebSocket
- [ ] **Client:** Backoff máximo 60s
- [ ] **Android:** network_security_config.xml criado
- [ ] **Android:** Manifest referencia networkSecurityConfig
- [ ] **Teste Web:** Abrir jogo após 20min inativo → deve conectar em <10s
- [ ] **Teste APK:** Instalar APK → abrir → conectar em <15s
- [ ] **Logs:** Verificar `[world] auth timeout` não aparece mais

---

## 🔍 Como Testar Localmente

```bash
# 1. Iniciar servidor com variáveis de teste
cd stellar-legacy-main
$env:SUPABASE_URL="https://seu-projeto.supabase.co"
$env:SUPABASE_ANON_KEY="sua-anon-key"
node server/index.js

# 2. Testar health endpoint
curl http://localhost:3000/health
# Deve retornar: {"ok":true,"game":"Stellar Legacy","version":"47.8.4","universe":"shared"}

# 3. Testar WebSocket (precisa token válido)
# Use o test-ws.mjs criado anteriormente
```

---

## 📱 Específico para APK

### Verificar no Build (build.gradle):
```gradle
def serverUrl = (System.getenv('STELLAR_SERVER_URL') ?: 'https://darkorbit-legacy.onrender.com')
buildConfigField 'String', 'SERVER_ORIGIN', '"' + serverUrl + '"'
```

### Verificar no AssetRoutePolicy.java:
```java
// Linha 42 - WebSocket DEVE passar para o Render
if (path.equals("/api") || path.startsWith("/api/") || path.equals("/ws") || path.equals("/health")) {
    return Route.DATA;  // ✅ Correto - vai para Render
}
```

### Logs Úteis no Android Studio (logcat):
```
# Filtrar por:
StellarAndroid
StellarSessionVault
WebView
WebSocket
```

---

## 🎯 Resumo de Ação Imediata

| Prioridade | Arquivo | Mudança | Tempo |
|------------|---------|---------|-------|
| 🔴 CRÍTICA | `server/world.js:1399` | Timeout 8s → 30s | 1 min |
| 🔴 CRÍTICA | `public/world.js` | Add health check antes connect | 10 min |
| 🟡 ALTA | `android/.../network_security_config.xml` | Criar arquivo | 5 min |
| 🟡 ALTA | `AndroidManifest.xml` | Add networkSecurityConfig | 1 min |
| 🟢 MÉDIA | `public/world.js` | Backoff max 60s | 2 min |
| 💰 DEFINITIVA | Render Dashboard | Upgrade para Starter ($7) | 5 min |

**Total estimado:** ~25 min de dev + $7/mês = conexões estáveis garantidas