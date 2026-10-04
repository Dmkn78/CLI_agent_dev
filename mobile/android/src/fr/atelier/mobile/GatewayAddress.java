package fr.atelier.mobile;

import java.net.InetAddress;
import java.net.URI;
import java.util.Locale;

/** Only local and tailnet addresses can be configured as a gateway. */
final class GatewayAddress {
    final URI origin;

    GatewayAddress(String input) throws Exception {
        String value = input.trim();
        if (!value.contains("://")) value = "http://" + value;
        URI uri = new URI(value);
        String scheme = uri.getScheme();
        String host = uri.getHost();
        if (host == null || !("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme))
                || uri.getRawUserInfo() != null || uri.getRawQuery() != null || uri.getRawFragment() != null
                || (uri.getPort() != -1 && (uri.getPort() < 1 || uri.getPort() > 65535)))
            throw new IllegalArgumentException("Adresse invalide. Utilisez l’URL privée de votre PC.");
        String path = uri.getPath();
        if (!(path.isEmpty() || path.equals("/") || path.equals("/mobile/")))
            throw new IllegalArgumentException("Saisissez seulement l’adresse du PC et le port, sans chemin.");
        host = host.toLowerCase(Locale.ROOT);
        String bareHost = host.replace("[", "").replace("]", "");
        boolean literal = bareHost.matches("[0-9.]+") || bareHost.contains(":");
        if (literal) {
            if (!privateAddress(InetAddress.getByName(bareHost)))
                throw new IllegalArgumentException("Adresse publique refusée. Utilisez Tailscale ou votre réseau local.");
            if (bareHost.matches("[0-9.]+")) {
                String[] parts = bareHost.split("\\.");
                if (parts.length != 4) throw new IllegalArgumentException("Adresse IPv4 invalide.");
                for (String part : parts) if (!part.equals(Integer.toString(Integer.parseInt(part))))
                    throw new IllegalArgumentException("Adresse IPv4 invalide.");
            }
        } else if (!(bareHost.endsWith(".ts.net") || bareHost.endsWith(".local"))) {
            throw new IllegalArgumentException("Utilisez une IP privée ou un nom Tailscale se terminant par .ts.net.");
        }
        origin = new URI(scheme.toLowerCase(Locale.ROOT), null, host, uri.getPort(), "", null, null);
    }

    void verifyPrivateDns() throws Exception {
        InetAddress[] addresses = InetAddress.getAllByName(origin.getHost());
        if (addresses.length == 0) throw new IllegalArgumentException("Ordinateur introuvable.");
        for (InetAddress address : addresses) if (!privateAddress(address))
            throw new IllegalArgumentException("Ce nom pointe vers une adresse publique : connexion refusée.");
    }

    boolean sameOrigin(String value) {
        try {
            URI candidate = new URI(value);
            return candidate.getRawUserInfo() == null && origin.getScheme().equalsIgnoreCase(candidate.getScheme())
                    && origin.getHost().equalsIgnoreCase(candidate.getHost())
                    && effectivePort(origin) == effectivePort(candidate);
        } catch (Exception ignored) { return false; }
    }

    String url(String path) { return origin.toString() + path; }
    private static int effectivePort(URI uri) {
        return uri.getPort() != -1 ? uri.getPort() : ("https".equalsIgnoreCase(uri.getScheme()) ? 443 : 80);
    }
    static boolean privateAddress(InetAddress address) {
        byte[] bytes = address.getAddress();
        if (bytes.length == 4) {
            int a = bytes[0] & 255, b = bytes[1] & 255;
            return a == 10 || a == 127 || (a == 172 && b >= 16 && b <= 31) || (a == 192 && b == 168)
                    || (a == 100 && b >= 64 && b <= 127);
        }
        return address.isLoopbackAddress() || ((bytes[0] & 254) == 252) || address.isLinkLocalAddress();
    }
}
