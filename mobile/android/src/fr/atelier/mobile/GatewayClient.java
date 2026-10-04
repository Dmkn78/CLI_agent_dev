package fr.atelier.mobile;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Locale;
import org.json.JSONObject;

final class GatewayClient {
    private static final long MAX_APK = 50L * 1024 * 1024;
    final GatewayAddress address;
    private final String token;
    GatewayClient(GatewayAddress address, String token) { this.address = address; this.token = token; }

    private HttpURLConnection get(String path) throws Exception {
        address.verifyPrivateDns();
        HttpURLConnection connection = (HttpURLConnection) new URL(address.url(path)).openConnection();
        connection.setConnectTimeout(8000);
        connection.setReadTimeout(20000);
        connection.setInstanceFollowRedirects(false);
        connection.setRequestProperty("Authorization", "Bearer " + token);
        connection.setRequestProperty("Cache-Control", "no-store");
        try {
            int status = connection.getResponseCode();
            if (status != 200) {
                if (status == 401 || status == 403) throw new IllegalArgumentException("Clé refusée. Vérifiez la clé de la passerelle.");
                if (status == 404) throw new IllegalArgumentException("Aucune version publiée sur ce PC. Construisez l’APK puis relancez la passerelle.");
                throw new IllegalArgumentException("Le PC répond avec une erreur (" + status + ").");
            }
            return connection;
        } catch (Exception e) { connection.disconnect(); throw e; }
    }

    Release release() throws Exception {
        HttpURLConnection connection = get("/mobile/release.json");
        try (InputStream stream = connection.getInputStream(); ByteArrayOutputStream bytes = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[4096]; int count;
            while ((count = stream.read(buffer)) != -1) {
                if (bytes.size() + count > 65536) throw new IllegalArgumentException("Manifest de mise à jour trop grand.");
                bytes.write(buffer, 0, count);
            }
            return new Release(new JSONObject(new String(bytes.toByteArray(), StandardCharsets.UTF_8)));
        } finally { connection.disconnect(); }
    }

    File download(Release release, File cacheDirectory) throws Exception {
        File pending = new File(cacheDirectory, "pending-update.apk");
        File verified = new File(cacheDirectory, "verified-update.apk");
        verified.delete();
        HttpURLConnection connection = get(release.path);
        boolean complete = false;
        try (InputStream input = connection.getInputStream(); FileOutputStream output = new FileOutputStream(pending)) {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] buffer = new byte[16384]; int count; long length = 0;
            while ((count = input.read(buffer)) != -1) {
                length += count;
                if (length > release.size || length > MAX_APK) throw new IllegalArgumentException("Taille de mise à jour incorrecte.");
                digest.update(buffer, 0, count); output.write(buffer, 0, count);
            }
            output.getFD().sync();
            if (length != release.size || !hex(digest.digest()).equals(release.sha256))
                throw new IllegalArgumentException("L’APK ne correspond pas à son empreinte. Installation refusée.");
            complete = true;
        } finally {
            connection.disconnect();
            if (!complete) pending.delete();
        }
        // Package and signing certificate are checked by MainActivity before exposing this file.
        return pending;
    }

    static String hex(byte[] bytes) {
        StringBuilder result = new StringBuilder();
        for (byte value : bytes) result.append(String.format(Locale.ROOT, "%02x", value & 255));
        return result.toString();
    }
    static final class Release {
        final int versionCode;
        final String versionName, sha256, path;
        final long size;
        Release(JSONObject data) throws Exception {
            versionCode = data.getInt("versionCode"); versionName = data.getString("versionName");
            sha256 = data.getString("sha256").toLowerCase(Locale.ROOT);
            size = data.getLong("size"); path = data.getString("url");
            if (versionCode < 1 || versionName.length() > 40 || !sha256.matches("[0-9a-f]{64}")
                    || size < 1 || size > MAX_APK || !path.equals("/mobile/atelier.apk"))
                throw new IllegalArgumentException("Manifest de mise à jour invalide.");
        }
    }
}
