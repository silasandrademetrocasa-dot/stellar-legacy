package com.stellarlegacy.mobile;

/** Shared by page and Service Worker requests; only explicit game data uses the network. */
final class AssetRoutePolicy {
    enum Route { DATA, LOCAL, BLOCKED }
    static Route classify(String originHost, String scheme, String requestHost, int port, String path) {
        if (!"https".equalsIgnoreCase(scheme) || requestHost == null ||
                !originHost.equalsIgnoreCase(requestHost) || (port != -1 && port != 443) || path == null) {
            return Route.BLOCKED;
        }
        if (path.equals("/api") || path.startsWith("/api/") || path.equals("/ws") || path.equals("/health")) {
            return Route.DATA;
        }
        return Route.LOCAL;
    }
    private AssetRoutePolicy() { }
}
