package com.stellarlegacy.mobile;

import java.net.URI;
import java.util.Locale;

/** Shared by page and Service Worker requests. Presentation is local; data uses explicit origins. */
final class AssetRoutePolicy {
    enum Route { DATA, LOCAL, BLOCKED }
    private volatile String dataHost;

    // Called synchronously after the HTTPS /api/config response, before any Supabase request.
    // Pin one exact host for this Activity; no wildcard and no tokens cross this bridge.
    synchronized boolean allowDataOrigin(String value) {
        try {
            URI uri = new URI(value);
            String candidate = uri.getHost();
            String path = uri.getRawPath();
            if (!"https".equalsIgnoreCase(uri.getScheme()) || candidate == null || candidate.isEmpty()
                    || (uri.getPort() != -1 && uri.getPort() != 443) || uri.getRawUserInfo() != null
                    || uri.getRawQuery() != null || uri.getRawFragment() != null
                    || (path != null && !path.isEmpty() && !"/".equals(path))) return false;
            candidate = candidate.toLowerCase(Locale.ROOT);
            if (dataHost != null && !dataHost.equals(candidate)) return false;
            dataHost = candidate;
            return true;
        } catch (Exception ignored) { return false; }
    }

    Route classify(String originHost, String scheme, String requestHost, int port, String path) {
        if (!"https".equalsIgnoreCase(scheme) || requestHost == null
                || (port != -1 && port != 443) || path == null
                || path.contains("\\") || path.matches(".*(?:^|/)\\.{1,2}(?:/|$).*")) {
            return Route.BLOCKED;
        }
        // REST includes tables and SQL RPCs; Auth covers profile, settings and recovery.
        if (dataHost != null && dataHost.equalsIgnoreCase(requestHost)
                && (path.equals("/rest/v1") || path.startsWith("/rest/v1/")
                    || path.equals("/auth/v1") || path.startsWith("/auth/v1/"))) {
            return Route.DATA;
        }
        if (!originHost.equalsIgnoreCase(requestHost)) return Route.BLOCKED;
        if (path.equals("/api") || path.startsWith("/api/") || path.equals("/ws") || path.equals("/health")) {
            return Route.DATA;
        }
        return Route.LOCAL;
    }
}
