package fr.atelier.mobile;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ClipData;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.graphics.drawable.RippleDrawable;
import android.content.res.ColorStateList;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Bundle;
import android.os.SystemClock;
import android.provider.Settings;
import android.text.InputType;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.SslErrorHandler;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebStorage;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONArray;
import org.json.JSONObject;

public final class MainActivity extends Activity {
    private static final int BACKGROUND = Color.rgb(32,29,27), CARD = Color.rgb(42,39,37);
    private static final int FOREGROUND = Color.rgb(241,233,223), MUTED = Color.rgb(182,170,160), ACCENT = Color.rgb(225,155,125);
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private JSONArray profiles = new JSONArray();
    private ProfileStore profileStore;
    private LinearLayout root, content;
    private TextView connectionStatus;
    private Button updateButton;
    private ProgressBar progress;
    private WebView web;
    private volatile GatewayClient gateway;
    private GatewayClient.Release latestRelease;
    private boolean checkingUpdate, pendingInstall, pageFailed;
    private volatile boolean downloadingUpdate;
    private volatile int generation;
    private String connectedName, installedName;
    private int installedCode;
    private long lastUpdateCheckAt;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(BACKGROUND); getWindow().setNavigationBarColor(BACKGROUND);
        profileStore = new ProfileStore(this);
        try {
            PackageInfo installed = getPackageManager().getPackageInfo(getPackageName(), 0);
            installedCode = installed.versionCode; installedName = installed.versionName;
        } catch (Exception ignored) { installedCode = 1; installedName = "0.1.0"; }
        String error = null;
        try { profiles = profileStore.load(); }
        catch (Exception e) { error = "Impossible de déchiffrer les profils de ce téléphone. Ajoutez à nouveau vos PC."; }
        showComputers();
        if (error != null) message("Profils locaux", error);
    }

    private int dp(float value) { return Math.round(value * getResources().getDisplayMetrics().density); }
    private LinearLayout column() { LinearLayout view = new LinearLayout(this); view.setOrientation(LinearLayout.VERTICAL); return view; }
    private TextView label(String text, int size, int color) {
        TextView view = new TextView(this); view.setText(text); view.setTextSize(size); view.setTextColor(color); view.setPadding(0, dp(6), 0, dp(8)); return view;
    }
    private Button button(String text, View.OnClickListener listener) {
        Button view = new Button(this); view.setText(text); view.setAllCaps(false); view.setTextColor(FOREGROUND);
        view.setTextSize(14); view.setMinHeight(dp(48)); view.setPadding(dp(12),dp(5),dp(12),dp(5));
        GradientDrawable shape=new GradientDrawable();shape.setColor(CARD);shape.setCornerRadius(dp(12));shape.setStroke(dp(1),Color.rgb(70,64,59));
        view.setBackground(new RippleDrawable(ColorStateList.valueOf(Color.argb(80,225,155,125)),shape,null));
        view.setOnClickListener(listener); return view;
    }
    private LinearLayout card() {
        LinearLayout view = column(); view.setPadding(dp(18), dp(12), dp(18), dp(16));
        GradientDrawable shape = new GradientDrawable(); shape.setColor(CARD); shape.setCornerRadius(dp(18)); view.setBackground(shape);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(-1,-2); params.bottomMargin=dp(14); view.setLayoutParams(params); return view;
    }
    private void baseLayout() {
        root=column(); root.setBackgroundColor(BACKGROUND); root.setPadding(dp(16),dp(8),dp(16),dp(8)); setContentView(root);
    }
    private void showComputers() {
        disconnectWeb(); baseLayout();
        TextView title=label("Atelier",30,FOREGROUND); title.setTypeface(null,Typeface.BOLD); root.addView(title);
        root.addView(label("Votre atelier, dans votre poche",16,MUTED));
        ScrollView scroll=new ScrollView(this); content=column(); scroll.addView(content); root.addView(scroll,new LinearLayout.LayoutParams(-1,0,1));
        LinearLayout introduction=card(); introduction.addView(label("Vos ordinateurs",21,FOREGROUND));
        introduction.addView(label("Retrouvez vos projets, envoyez vos prompts et pilotez vos agents sur chaque PC connecté.",15,MUTED));
        introduction.addView(button("＋ Ajouter un ordinateur", v -> editProfile(-1))); content.addView(introduction);
        for(int i=0;i<profiles.length();i++) {
            final int index=i; JSONObject profile=profiles.optJSONObject(i); if(profile==null)continue;
            LinearLayout entry=card(); TextView name=label(profile.optString("name"),20,FOREGROUND); name.setTypeface(null,Typeface.BOLD); entry.addView(name);
            entry.addView(label(profile.optString("url"),14,MUTED));
            entry.addView(button("Se connecter",v->connect(index)));
            LinearLayout actions=new LinearLayout(this); actions.addView(button("Modifier",v->editProfile(index)),new LinearLayout.LayoutParams(0,-2,1));
            actions.addView(button("Supprimer",v->deleteProfile(index)),new LinearLayout.LayoutParams(0,-2,1)); entry.addView(actions); content.addView(entry);
        }
        LinearLayout guide=card(); guide.addView(label("Connexion privée avec Tailscale",18,FOREGROUND));
        guide.addView(label("1. Installez Tailscale sur ce téléphone et vos PC, puis connectez-les au même compte.\n\n2. Sur chaque PC, démarrez Atelier et sa passerelle mobile.\n\n3. Ajoutez ici l’URL privée et la clé affichées par la passerelle.",15,MUTED));
        guide.addView(label("Les clés sont chiffrées sur ce téléphone. Les comptes IA et les fichiers restent sur vos PC. Chaque PC doit rester allumé.",14,MUTED)); content.addView(guide);
        root.addView(label("Version " + installedName + " · Android " + android.os.Build.VERSION.RELEASE,12,MUTED));
    }

    private EditText input(String hint, String value, int type) {
        EditText edit=new EditText(this); edit.setHint(hint); edit.setText(value); edit.setTextColor(FOREGROUND); edit.setHintTextColor(MUTED);
        edit.setSingleLine(true); edit.setInputType(type); edit.setMinHeight(dp(52)); return edit;
    }
    private void editProfile(int index) {
        JSONObject existing=index>=0?profiles.optJSONObject(index):new JSONObject();
        LinearLayout form=column(); form.setPadding(dp(20),dp(8),dp(20),0);
        EditText name=input("Nom : PC bureau",existing.optString("name"),InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_FLAG_CAP_SENTENCES);
        EditText url=input("http://100.64.0.10:4318",existing.optString("url"),InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_URI);
        EditText token=input("Clé de la passerelle",existing.optString("token"),InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_PASSWORD);
        form.addView(label("Nom de l’ordinateur",14,MUTED)); form.addView(name); form.addView(label("Adresse privée",14,MUTED)); form.addView(url);
        form.addView(label("Clé mobile affichée sur le PC",14,MUTED)); form.addView(token);
        TextView validation=label("",14,ACCENT); form.addView(validation);
        AlertDialog dialog=new AlertDialog.Builder(this).setTitle(index<0?"Ajouter un PC":"Modifier le PC").setView(form).setNegativeButton("Annuler",null).setPositiveButton("Enregistrer",null).create();
        dialog.setOnShowListener(d->dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v->{
            try {
                String displayName=name.getText().toString().trim(); String key=token.getText().toString().trim();
                if(displayName.isEmpty()||displayName.length()>60)throw new IllegalArgumentException("Donnez un nom de 1 à 60 caractères au PC.");
                GatewayAddress address=new GatewayAddress(url.getText().toString());
                if(!key.matches("[A-Za-z0-9_-]{32,256}"))throw new IllegalArgumentException("Copiez la clé de la passerelle, pas votre clé Codex.");
                JSONObject profile=new JSONObject().put("name",displayName).put("url",address.origin.toString()).put("token",key);
                JSONArray changed=new JSONArray(profiles.toString()); if(index>=0)changed.put(index,profile); else changed.put(profile);
                profileStore.save(changed); profiles=changed; dialog.dismiss(); showComputers();
            } catch(Exception e) { validation.setText(safeError(e)); }
        })); dialog.show();
    }
    private void deleteProfile(int index) {
        new AlertDialog.Builder(this).setTitle("Supprimer ce PC ?").setMessage("Son profil et sa clé seront retirés de ce téléphone.")
            .setNegativeButton("Annuler",null).setPositiveButton("Supprimer",(d,w)->{
                try { JSONArray changed=new JSONArray(profiles.toString()); changed.remove(index); profileStore.save(changed); profiles=changed; showComputers(); }
                catch(Exception e){ message("Enregistrement impossible",safeError(e)); }
            }).show();
    }

    private void connect(int index) {
        JSONObject profile=profiles.optJSONObject(index); if(profile==null)return;
        try {
            disconnectWeb();
            GatewayAddress address=new GatewayAddress(profile.getString("url"));
            gateway=new GatewayClient(address,profile.getString("token")); connectedName=profile.getString("name");
            showWorkbench(); int attempt=++generation; GatewayClient selected=gateway;
            worker.execute(()->{
                try { address.verifyPrivateDns(); runOnUiThread(()->{
                    if(attempt!=generation||web==null)return;
                    connectionStatus.setText("Connexion à " + connectedName + "…");
                    web.loadUrl(address.url("/mobile/"),Collections.singletonMap("Authorization","Bearer " + profile.optString("token")));
                    checkUpdates(false);
                }); } catch(Exception e) { runOnUiThread(()->{if(attempt==generation)showConnectionError(safeError(e),index);}); }
            });
        } catch(Exception e){ message("Connexion impossible",safeError(e)); }
    }
    private void showWorkbench() {
        pageFailed=false;
        baseLayout(); LinearLayout toolbar=new LinearLayout(this); toolbar.setGravity(android.view.Gravity.CENTER_VERTICAL);
        toolbar.addView(button("‹",v->goBack()),new LinearLayout.LayoutParams(dp(48),dp(48)));
        TextView name=label(connectedName,16,FOREGROUND); name.setMaxLines(1); toolbar.addView(name,new LinearLayout.LayoutParams(0,-2,1));
        toolbar.addView(button("PCs",v->showComputers()),new LinearLayout.LayoutParams(dp(64),dp(48)));
        updateButton=button("MàJ",v->checkUpdates(true)); toolbar.addView(updateButton,new LinearLayout.LayoutParams(dp(84),dp(48))); root.addView(toolbar);
        updateButton.setContentDescription("Vérifier les mises à jour d’Atelier");
        connectionStatus=label("Recherche du PC…",12,MUTED); root.addView(connectionStatus);
        progress=new ProgressBar(this,null,android.R.attr.progressBarStyleHorizontal); progress.setIndeterminate(true); root.addView(progress,new LinearLayout.LayoutParams(-1,dp(3)));
        web=new WebView(this); web.setBackgroundColor(BACKGROUND); WebSettings settings=web.getSettings();
        settings.setJavaScriptEnabled(true); settings.setDomStorageEnabled(true); settings.setAllowFileAccess(false); settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false); settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW); settings.setSupportMultipleWindows(false); settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setMediaPlaybackRequiresUserGesture(true); settings.setCacheMode(WebSettings.LOAD_NO_CACHE); settings.setSafeBrowsingEnabled(true);
        CookieManager.getInstance().setAcceptCookie(false); CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient(){
            private boolean active(WebView view){ return view==web&&gateway!=null; }
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request) {
                if(!active(view))return true;
                boolean blocked=gateway==null||!gateway.address.sameOrigin(request.getUrl().toString())||!request.getUrl().getPath().startsWith("/mobile/");
                if(blocked)Toast.makeText(MainActivity.this,"Navigation extérieure refusée.",Toast.LENGTH_SHORT).show(); return blocked;
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request) {
                GatewayClient selected=gateway;
                boolean allowed=view==web&&selected!=null&&selected.address.sameOrigin(request.getUrl().toString());
                if(allowed)try{selected.address.verifyPrivateDns();}catch(Exception e){allowed=false;}
                if(!allowed)
                    return new WebResourceResponse("text/plain","UTF-8",403,"Forbidden",Collections.emptyMap(),new ByteArrayInputStream(new byte[0]));
                return null;
            }
            @Override public void onPageFinished(WebView view,String url) {
                if(!active(view)||pageFailed||!gateway.address.sameOrigin(url))return;
                progress.setVisibility(View.GONE); connectionStatus.setText(connectedName + " · connexion privée");
            }
            @Override public void onReceivedError(WebView view,WebResourceRequest request,WebResourceError error) {
                if(active(view)&&request.isForMainFrame())connectionFailed("PC inaccessible. Vérifiez Tailscale et la passerelle.");
            }
            @Override public void onReceivedHttpError(WebView view,WebResourceRequest request,WebResourceResponse response) {
                if(active(view)&&request.isForMainFrame())connectionFailed(response.getStatusCode()==401||response.getStatusCode()==403?"Clé refusée. Modifiez le profil du PC.":"La passerelle répond avec une erreur ("+response.getStatusCode()+").");
            }
            @Override public void onReceivedSslError(WebView view,SslErrorHandler handler,SslError error) {
                handler.cancel(); if(active(view))connectionFailed("Certificat HTTPS invalide. Connexion interrompue.");
            }
        });
        root.addView(web,new LinearLayout.LayoutParams(-1,0,1));
    }
    private void connectionFailed(String reason) {
        if(web==null||pageFailed)return; pageFailed=true; progress.setVisibility(View.GONE); connectionStatus.setText(reason);
        new AlertDialog.Builder(this).setTitle("Connexion impossible").setMessage(reason).setNegativeButton("Ordinateurs",(d,w)->showComputers())
            .setPositiveButton("Réessayer",(d,w)->retryConnection()).show();
    }
    private void showConnectionError(String reason,int index) {
        new AlertDialog.Builder(this).setTitle("Connexion impossible").setMessage(reason).setNegativeButton("Ordinateurs",(d,w)->showComputers())
            .setPositiveButton("Réessayer",(d,w)->connect(index)).show();
    }
    private void retryConnection() {
        if(gateway==null)return;
        for(int i=0;i<profiles.length();i++)if(profiles.optJSONObject(i).optString("url").equals(gateway.address.origin.toString())){connect(i);return;}
        showComputers();
    }
    private void disconnectWeb() {
        generation++; gateway=null; latestRelease=null; checkingUpdate=false;lastUpdateCheckAt=0;
        if(web!=null){web.stopLoading(); web.loadUrl("about:blank"); web.clearHistory(); web.clearCache(true); web.destroy(); web=null;}
        WebStorage.getInstance().deleteAllData(); CookieManager.getInstance().removeAllCookies(null);
    }
    private void goBack() { if(web!=null&&web.canGoBack())web.goBack(); else showComputers(); }
    @Override public void onBackPressed() { if(web!=null)goBack(); else super.onBackPressed(); }

    private void checkUpdates(boolean showResult) {
        if(gateway==null||checkingUpdate||downloadingUpdate)return;
        long now=SystemClock.elapsedRealtime();
        if(!showResult&&lastUpdateCheckAt!=0&&now-lastUpdateCheckAt<300000)return;
        lastUpdateCheckAt=now;
        checkingUpdate=true; updateButton.setText("…"); final GatewayClient selected=gateway; final int attempt=generation;
        worker.execute(()->{
            try { GatewayClient.Release release=selected.release(); runOnUiThread(()->{
                if(attempt!=generation||isFinishing())return; checkingUpdate=false; latestRelease=release;
                updateButton.setText(release.versionCode>installedCode?"MàJ ↓":"MàJ");
                if(showResult)showRelease(release);
                else if(release.versionCode>installedCode)Toast.makeText(this,"Mise à jour " + release.versionName + " disponible",Toast.LENGTH_LONG).show();
            }); } catch(Exception e){runOnUiThread(()->{
                if(attempt!=generation||isFinishing())return; checkingUpdate=false; updateButton.setText("MàJ ?");
                if(showResult)message("Mises à jour", "Version installée : " + installedName + "\n\n" + safeError(e));
            });}
        });
    }
    private void showRelease(GatewayClient.Release release) {
        AlertDialog.Builder dialog=new AlertDialog.Builder(this).setTitle("Mises à jour d’Atelier")
            .setMessage("Version installée : " + installedName + "\nVersion du PC : " + release.versionName +
                (release.versionCode>installedCode?"\n\nTélécharger " + String.format(java.util.Locale.FRANCE,"%.1f",release.size/1048576.0) + " Mo et ouvrir l’installateur Android ?":"\n\nVotre application est à jour pour ce PC."))
            .setNegativeButton("Fermer",null);
        if(release.versionCode>installedCode)dialog.setPositiveButton("Télécharger",(d,w)->downloadUpdate(release)); dialog.show();
    }
    private void downloadUpdate(GatewayClient.Release release) {
        if(gateway==null||downloadingUpdate)return; downloadingUpdate=true; updateButton.setText("↓…");
        final GatewayClient selected=gateway; final int attempt=generation;
        worker.execute(()->{
            File pending=null;
            try {
                pending=selected.download(release,getCacheDir()); verifyPackage(pending,release);
                if(attempt!=generation){pending.delete();return;}
                File verified=new File(getCacheDir(),"verified-update.apk");
                if(!pending.renameTo(verified))throw new IllegalStateException("Impossible de préparer l’APK.");
                runOnUiThread(()->{downloadingUpdate=false;if(attempt==generation&&!isFinishing()){updateButton.setText("MàJ ↓");installUpdate();}});
            } catch(Exception e) { if(pending!=null)pending.delete();runOnUiThread(()->{downloadingUpdate=false;if(attempt==generation&&!isFinishing()){updateButton.setText("MàJ ↓");message("Installation refusée",safeError(e));}}); }
            finally { if(attempt!=generation)downloadingUpdate=false; }
        });
    }
    private void verifyPackage(File apk,GatewayClient.Release release) throws Exception {
        PackageInfo candidate=getPackageManager().getPackageArchiveInfo(apk.getAbsolutePath(),PackageManager.GET_SIGNATURES);
        PackageInfo installed=getPackageManager().getPackageInfo(getPackageName(),PackageManager.GET_SIGNATURES);
        if(candidate==null||!getPackageName().equals(candidate.packageName)||candidate.versionCode!=release.versionCode||candidate.versionCode<=installedCode
                ||!signatureSet(candidate.signatures).equals(signatureSet(installed.signatures)))
            throw new IllegalArgumentException("Nom, version ou signature Android incorrects. Installation refusée.");
    }
    private Set<String> signatureSet(Signature[] signatures) throws Exception {
        if(signatures==null||signatures.length==0)throw new IllegalArgumentException("Signature Android absente.");
        Set<String> result=new HashSet<>(); for(Signature signature:signatures)result.add(signature.toCharsString()); return result;
    }
    private void installUpdate() {
        if(!getPackageManager().canRequestPackageInstalls()) {
            new AlertDialog.Builder(this).setTitle("Autoriser l’installation")
                .setMessage("Android demande votre autorisation pour installer les mises à jour depuis Atelier. Activez-la sur l’écran suivant, puis revenez ici.")
                .setNegativeButton("Annuler",null).setPositiveButton("Ouvrir les paramètres",(d,w)->{
                    pendingInstall=true; startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,Uri.parse("package:"+getPackageName())));
                }).show(); return;
        }
        Intent intent=new Intent(Intent.ACTION_VIEW).setDataAndType(UpdateProvider.APK_URI,"application/vnd.android.package-archive")
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        intent.setClipData(ClipData.newRawUri("Atelier APK",UpdateProvider.APK_URI));
        try { startActivity(intent); } catch(Exception e){message("Installateur indisponible","Aucun installateur Android ne peut ouvrir l’APK sur ce téléphone.");}
    }
    @Override protected void onResume() {
        super.onResume();
        if(pendingInstall){pendingInstall=false;if(getPackageManager().canRequestPackageInstalls())installUpdate();return;}
        if(gateway!=null)checkUpdates(false);
    }
    private String safeError(Exception error) {
        return error instanceof IllegalArgumentException || error instanceof IllegalStateException?error.getMessage():"PC inaccessible ou opération impossible. Vérifiez Tailscale, la passerelle et réessayez.";
    }
    private void message(String title,String body) { new AlertDialog.Builder(this).setTitle(title).setMessage(body).setPositiveButton("Compris",null).show(); }
    @Override protected void onDestroy() { disconnectWeb();worker.shutdownNow();super.onDestroy(); }
}
