package fr.atelier.mobile;

/** Runs on the host JVM, before APK packaging: exercise the navigation trust boundary. */
public final class GatewayAddressTest {
    private static int checks;
    private static void accept(String url) throws Exception { new GatewayAddress(url); checks++; }
    private static void reject(String url) throws Exception {
        try { new GatewayAddress(url); } catch (Exception expected) { checks++; return; }
        throw new AssertionError("Unexpected accepted address: " + url);
    }
    private static void check(boolean result) { if(!result)throw new AssertionError("Origin check failed");checks++; }
    public static void main(String[] args) throws Exception {
        accept("http://100.64.0.10:4318"); accept("https://desktop.tailabc.ts.net"); accept("192.168.1.2:4318");
        accept("http://10.0.0.2:4318/mobile/"); accept("http://172.16.0.3:4318"); accept("http://[fd7a:115c:a1e0::1]:4318");
        accept("http://127.0.0.1:4318");
        reject("https://example.org"); reject("http://8.8.8.8:4318"); reject("http://100.128.0.10:4318");
        reject("http://100.63.0.10:4318"); reject("http://172.32.0.10:4318"); reject("http://100.64.0.10:4318/?token=secret");
        reject("http://user:secret@100.64.0.10:4318"); reject("javascript:alert(1)"); reject("file:///tmp/index.html");
        reject("http://100.64.0.10:4318/#secret"); reject("http://100.64.0.10:70000"); reject("http://100.64.0.10:4318/api/");
        reject("http://[2001:4860:4860::8888]:4318"); reject("http://100.064.0.10:4318"); reject("http://2130706433:4318");
        GatewayAddress local=new GatewayAddress("http://100.64.0.10:4318"); local.verifyPrivateDns();
        check(local.sameOrigin("http://100.64.0.10:4318/api/sessions"));
        check(!local.sameOrigin("https://100.64.0.10:4318/mobile/")); check(!local.sameOrigin("http://100.64.0.11:4318/mobile/"));
        check(!local.sameOrigin("http://100.64.0.10:4319/mobile/")); check(!local.sameOrigin("http://secret@100.64.0.10:4318/mobile/"));
        check(!local.sameOrigin("data:text/html,test")); check(!local.sameOrigin("javascript:void(0)"));
        System.out.println("GatewayAddress: " + checks + " checks passed");
    }
}
