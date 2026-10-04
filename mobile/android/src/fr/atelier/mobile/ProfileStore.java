package fr.atelier.mobile;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import org.json.JSONArray;

/** Encrypts all profiles with an app-specific, non-exportable Android Keystore key. */
final class ProfileStore {
    private static final String ALIAS = "atelier.mobile.profiles.v1";
    private final SharedPreferences preferences;
    ProfileStore(Context context) { preferences = context.getSharedPreferences("private_profiles", Context.MODE_PRIVATE); }

    private SecretKey key() throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore");
        store.load(null);
        if (!store.containsAlias(ALIAS)) {
            KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
            generator.init(new KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                    .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                    .setKeySize(256).build());
            generator.generateKey();
        }
        return (SecretKey) store.getKey(ALIAS, null);
    }
    JSONArray load() throws Exception {
        String encrypted = preferences.getString("ciphertext", null);
        if (encrypted == null) return new JSONArray();
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128,
                Base64.decode(preferences.getString("iv", ""), Base64.NO_WRAP)));
        return new JSONArray(new String(cipher.doFinal(Base64.decode(encrypted, Base64.NO_WRAP)), StandardCharsets.UTF_8));
    }
    void save(JSONArray profiles) throws Exception {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, key());
        String encrypted = Base64.encodeToString(cipher.doFinal(profiles.toString().getBytes(StandardCharsets.UTF_8)), Base64.NO_WRAP);
        if (!preferences.edit().putString("ciphertext", encrypted)
                .putString("iv", Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP)).commit())
            throw new IllegalStateException("Impossible d’enregistrer les ordinateurs.");
    }
}
