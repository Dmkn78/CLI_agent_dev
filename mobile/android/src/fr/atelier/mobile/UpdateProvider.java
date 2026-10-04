package fr.atelier.mobile;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;
import java.io.File;
import java.io.FileNotFoundException;

/** Grants Android's installer read access to exactly one verified APK. */
public final class UpdateProvider extends ContentProvider {
    static final Uri APK_URI = Uri.parse("content://fr.atelier.mobile.updates/verified.apk");
    private File file(Uri uri) throws FileNotFoundException {
        if (!APK_URI.equals(uri)) throw new FileNotFoundException("Unknown file");
        File apk = new File(getContext().getCacheDir(), "verified-update.apk");
        if (!apk.isFile()) throw new FileNotFoundException("No verified update");
        return apk;
    }
    @Override public boolean onCreate() { return true; }
    @Override public String getType(Uri uri) { return APK_URI.equals(uri) ? "application/vnd.android.package-archive" : null; }
    @Override public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        if (!"r".equals(mode)) throw new FileNotFoundException("Read only");
        return ParcelFileDescriptor.open(file(uri), ParcelFileDescriptor.MODE_READ_ONLY);
    }
    @Override public Cursor query(Uri uri, String[] projection, String selection, String[] selectionArgs, String sortOrder) {
        try {
            File apk = file(uri);
            String[] columns = projection == null ? new String[]{OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE} : projection;
            MatrixCursor cursor = new MatrixCursor(columns);
            Object[] values = new Object[columns.length];
            for (int i=0;i<columns.length;i++) {
                if (OpenableColumns.DISPLAY_NAME.equals(columns[i])) values[i] = "Atelier-mobile.apk";
                else if (OpenableColumns.SIZE.equals(columns[i])) values[i] = apk.length();
            }
            cursor.addRow(values); return cursor;
        } catch (FileNotFoundException e) { return null; }
    }
    @Override public Uri insert(Uri uri, ContentValues values) { throw new UnsupportedOperationException("Read only"); }
    @Override public int delete(Uri uri, String where, String[] args) { throw new UnsupportedOperationException("Read only"); }
    @Override public int update(Uri uri, ContentValues values, String where, String[] args) { throw new UnsupportedOperationException("Read only"); }
}
