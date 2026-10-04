#!/usr/bin/env python3
"""Build a small native APK with Android's official aapt2, d8 and apksigner.

The toolchain stays in ignored build/ and the stable signing key in private
.atelier/mobile/signing/, with no global installation. A clean Mac ARM64 build downloads pinned SDK and
Temurin packages. Other hosts can provide JAVA_HOME and ANDROID_BUILD_TOOLS.
"""
import hashlib
import argparse
import json
import os
from pathlib import Path
import platform
import shutil
import subprocess
import tarfile
import tempfile
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "mobile/android"
TOOLCHAIN = ROOT / "build/mobile-toolchain"
OUTPUT = ROOT / "build/mobile"
SDK = TOOLCHAIN / "sdk"
DOWNLOADS = TOOLCHAIN / "downloads"
ANDROID_NAMESPACE = "http://schemas.android.com/apk/res/android"
PACKAGES = {
    "jdk.tar.gz": (
        "https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.20.1%2B1/OpenJDK17U-jdk_aarch64_mac_hotspot_17.0.20.1_1.tar.gz",
        "sha256", "196d13ba5f10414bef7f6a05a9b3f00edacb18ebacef2b99485db9e2ee18f0e8"),
    "build-tools.zip": (
        "https://dl.google.com/android/repository/build-tools_r37_macosx.zip",
        "sha1", "eb080751b2b2028eb3604f571027d6f7b3c46321"),
    "platform.zip": (
        "https://dl.google.com/android/repository/platform-35_r02.zip",
        "sha1", "0bb560a90a7a2cbd0dd8348224d518b638fe7949"),
}


def digest(path, algorithm="sha256"):
    value = hashlib.new(algorithm)
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            value.update(block)
    return value.hexdigest()


def fetch(name):
    url, algorithm, expected = PACKAGES[name]
    destination = DOWNLOADS / name
    if not destination.exists() or digest(destination, algorithm) != expected:
        print(f"Téléchargement {name} depuis la distribution officielle…", flush=True)
        partial = destination.with_suffix(destination.suffix + ".part")
        # curl follows GitHub's signed download redirect reliably on macOS.
        subprocess.run(["curl", "--fail", "--location", "--retry", "3", "--silent", "--show-error",
                        url, "--output", str(partial)], check=True)
        if digest(partial, algorithm) != expected:
            partial.unlink(missing_ok=True)
            raise SystemExit(f"Empreinte incorrecte : {name}")
        partial.replace(destination)
    return destination


def unpack_zip(archive, destination):
    with zipfile.ZipFile(archive) as zipped:
        for entry in zipped.infolist():
            path = (destination / entry.filename).resolve()
            if not path.is_relative_to(destination.resolve()):
                raise SystemExit("Chemin inattendu dans le SDK.")
        zipped.extractall(destination)
        for entry in zipped.infolist():
            mode = (entry.external_attr >> 16) & 0o777
            if mode:
                (destination / entry.filename).chmod(mode)


def toolchain():
    DOWNLOADS.mkdir(parents=True, exist_ok=True)
    java_home = Path(os.environ.get("JAVA_HOME", str(TOOLCHAIN / "jdk/jdk-17.0.20.1+1/Contents/Home")))
    build_tools = Path(os.environ.get("ANDROID_BUILD_TOOLS", str(SDK / "android-37.0")))
    android_jar = Path(os.environ.get("ANDROID_PLATFORM_JAR", str(SDK / "android-35/android.jar")))
    if not all(path.exists() for path in [java_home / "bin/javac", build_tools / "aapt2", android_jar]):
        if platform.system() != "Darwin" or platform.machine() != "arm64":
            raise SystemExit("Fournissez JAVA_HOME, ANDROID_BUILD_TOOLS et ANDROID_PLATFORM_JAR pour ce système.")
        if not (java_home / "bin/javac").exists():
            archive = fetch("jdk.tar.gz")
            target = TOOLCHAIN / "jdk"
            target.mkdir(exist_ok=True)
            with tarfile.open(archive) as tar:
                # Only verified official archives are accepted; inspect destinations too.
                for entry in tar.getmembers():
                    if not (target / entry.name).resolve().is_relative_to(target.resolve()):
                        raise SystemExit("Chemin inattendu dans le JDK.")
                tar.extractall(target)
        if not (build_tools / "aapt2").exists():
            unpack_zip(fetch("build-tools.zip"), SDK)
        if not android_jar.exists():
            unpack_zip(fetch("platform.zip"), SDK)
    return java_home, build_tools, android_jar


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--version-file", type=Path, default=SOURCE / "version.json")
    parser.add_argument("--output-directory", type=Path, default=OUTPUT)
    args = parser.parse_args()
    output = args.output_directory.resolve()
    version = json.loads(args.version_file.read_text())
    if not isinstance(version["versionCode"], int) or version["versionCode"] < 1:
        raise SystemExit("versionCode invalide")
    java_home, tools, android_jar = toolchain()
    env = os.environ.copy()
    env["JAVA_HOME"] = str(java_home)
    env["PATH"] = str(java_home / "bin") + os.pathsep + env.get("PATH", "")
    output.mkdir(parents=True, exist_ok=True)
    TOOLCHAIN.chmod(0o700)
    work = Path(tempfile.mkdtemp(prefix="android-build-", dir=output))

    def run(args, capture=False):
        result = subprocess.run([str(arg) for arg in args], env=env, check=True,
                                stdout=subprocess.PIPE if capture else None, text=True)
        return result.stdout if capture else None

    try:
        test_classes = work / "url-tests"
        test_classes.mkdir()
        run([java_home / "bin/javac", "-encoding", "UTF-8", "-d", test_classes,
             SOURCE / "src/fr/atelier/mobile/GatewayAddress.java",
             SOURCE / "tests/fr/atelier/mobile/GatewayAddressTest.java"])
        run([java_home / "bin/java", "-cp", test_classes, "fr.atelier.mobile.GatewayAddressTest"])
        manifest = ET.parse(SOURCE / "AndroidManifest.xml")
        manifest.getroot().set(f"{{{ANDROID_NAMESPACE}}}versionCode", str(version["versionCode"]))
        manifest.getroot().set(f"{{{ANDROID_NAMESPACE}}}versionName", version["versionName"])
        ET.register_namespace("android", ANDROID_NAMESPACE)
        manifest.write(work / "AndroidManifest.xml", encoding="utf-8", xml_declaration=True)
        run([tools / "aapt2", "compile", "--dir", SOURCE / "res", "-o", work / "resources.zip"])
        run([tools / "aapt2", "link", "-I", android_jar, "--manifest", work / "AndroidManifest.xml",
             "--min-sdk-version", "26", "--target-sdk-version", "35", "-o", work / "unsigned.apk", work / "resources.zip"])
        classes = work / "classes"
        classes.mkdir()
        run([java_home / "bin/javac", "-source", "8", "-target", "8", "-encoding", "UTF-8", "-classpath", android_jar,
             "-d", classes, *sorted((SOURCE / "src").rglob("*.java"))])
        dex = work / "dex"
        dex.mkdir()
        run([java_home / "bin/java", "-cp", tools / "lib/d8.jar", "com.android.tools.r8.D8", "--min-api", "26",
             "--lib", android_jar, "--output", dex, *sorted(classes.rglob("*.class"))])
        with zipfile.ZipFile(work / "unsigned.apk", "a") as apk:
            for entry in sorted(dex.glob("*.dex")):
                info = zipfile.ZipInfo(entry.name, (1980, 1, 1, 0, 0, 0))
                info.compress_type = zipfile.ZIP_STORED
                apk.writestr(info, entry.read_bytes())
        run([tools / "zipalign", "-f", "-P", "16", "4", work / "unsigned.apk", work / "aligned.apk"])
        signing_directory = ROOT / ".atelier/mobile/signing"
        signing_directory.mkdir(parents=True, exist_ok=True)
        signing_directory.chmod(0o700)
        keystore = signing_directory / "debug.keystore"
        legacy_keystore = TOOLCHAIN / "debug.keystore"
        if not keystore.exists() and legacy_keystore.exists():
            shutil.copy2(legacy_keystore, keystore)
            keystore.chmod(0o600)
        if not keystore.exists():
            run([java_home / "bin/keytool", "-genkeypair", "-keystore", keystore, "-storepass", "android",
                 "-keypass", "android", "-alias", "atelier-local", "-keyalg", "RSA", "-keysize", "2048",
                 "-validity", "10000", "-dname", "CN=Atelier Local Debug,O=Atelier,C=FR", "-noprompt"])
        keystore.chmod(0o600)
        destination = output / "Atelier-mobile.apk"
        signer = [java_home / "bin/java", "-jar", tools / "lib/apksigner.jar"]
        run([*signer, "sign", "--ks", keystore, "--ks-key-alias", "atelier-local", "--ks-pass", "pass:android",
             "--key-pass", "pass:android", "--min-sdk-version", "26", "--out", destination, work / "aligned.apk"])
        proof = run([*signer, "verify", "--verbose", "--print-certs", destination], capture=True)
        (output / "signature-proof.txt").write_text(proof)
        badging = run([tools / "aapt2", "dump", "badging", destination], capture=True)
        (output / "package-proof.txt").write_text(badging)
        run([tools / "zipalign", "-c", "-P", "16", "4", destination])
        sha = digest(destination)
        release = dict(version, sha256=sha, size=destination.stat().st_size, url="/mobile/atelier.apk")
        (output / "release.json").write_text(json.dumps(release, indent=2) + "\n")
        (output / "Atelier-mobile.apk.sha256").write_text(sha + "  Atelier-mobile.apk\n")
        print(proof)
        print(badging.splitlines()[0])
        print(f"APK : {destination}\nSHA256 : {sha}\nTaille : {destination.stat().st_size} octets")
    finally:
        shutil.rmtree(work)


if __name__ == "__main__":
    main()
