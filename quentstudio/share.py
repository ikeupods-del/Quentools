"""Partage : AirDrop (petit programme Swift NSSharingService), repli sur le Finder."""
import subprocess
import sys
from pathlib import Path

import config

SWIFT = r'''
import Cocoa

final class Delegue: NSObject, NSSharingServiceDelegate {
    func sharingService(_ s: NSSharingService, didShareItems items: [Any]) { exit(0) }
    func sharingService(_ s: NSSharingService, didFailToShareItems items: [Any], error: Error) {
        let e = error as NSError
        exit(e.code == NSUserCancelledError ? 0 : 2)
    }
}

let fichiers = CommandLine.arguments.dropFirst().map { URL(fileURLWithPath: $0) }
let app = NSApplication.shared
app.setActivationPolicy(.accessory)
guard let service = NSSharingService(named: .sendViaAirDrop), service.canPerform(withItems: fichiers) else {
    FileHandle.standardError.write("AirDrop indisponible\n".data(using: .utf8)!)
    exit(3)
}
let delegue = Delegue()
service.delegate = delegue
DispatchQueue.main.async {
    app.activate(ignoringOtherApps: true)
    service.perform(withItems: fichiers)
}
DispatchQueue.main.asyncAfter(deadline: .now() + 600) { exit(4) }
app.run()
'''


def programme_airdrop():
    """Programme de partage AirDrop : livré dans l'application, sinon compilé une fois (outils Xcode requis)."""
    if config.outil("airdrop"):
        return Path(config.outil("airdrop"))
    exe = config.DATA / "outils" / "airdrop"
    src = exe.with_suffix(".swift")
    if exe.exists() and src.exists() and src.read_text("utf-8") == SWIFT:
        return exe
    exe.parent.mkdir(parents=True, exist_ok=True)
    src.write_text(SWIFT, "utf-8")
    r = subprocess.run(["xcrun", "swiftc", "-O", "-o", str(exe), str(src)], capture_output=True, text=True, timeout=300)
    if r.returncode != 0:
        raise RuntimeError("compilation Swift impossible : " + (r.stderr or r.stdout)[-300:])
    return exe


def finder(fichier):
    """Montre la vidéo dans le Finder et ouvre la fenêtre AirDrop du Finder."""
    subprocess.run(["open", "-R", str(fichier)])
    airdrop = "/System/Library/CoreServices/Finder.app/Contents/Applications/AirDrop.app"
    if Path(airdrop).exists():
        subprocess.run(["open", airdrop])


def airdrop(fichier):
    """Ouvre la fenêtre AirDrop avec la vidéo ; renvoie 'airdrop' ou 'finder' (repli)."""
    if sys.platform != "darwin":
        raise RuntimeError("AirDrop n'existe que sur Mac")
    try:
        exe = programme_airdrop()
        p = subprocess.Popen([str(exe), str(fichier)], stderr=subprocess.PIPE)
        try:  # erreur immédiate (AirDrop coupé, pas de Wi-Fi…) : repli Finder
            code = p.wait(timeout=4)
            if code not in (0,):
                raise RuntimeError(p.stderr.read().decode("utf-8", "replace").strip() or f"code {code}")
        except subprocess.TimeoutExpired:
            pass  # la fenêtre AirDrop est ouverte, l'utilisateur choisit l'appareil
        return "airdrop"
    except Exception:
        finder(fichier)
        return "finder"
