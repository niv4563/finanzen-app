import Foundation
import UIKit
import Capacitor
import LocalAuthentication
import Security
import UserNotifications
import MachO

// Eigene, kleine Bausteine der Finanzen-App für das iPhone – gleiche Namen und Antworten wie auf Android,
// damit die App-Oberfläche nichts unterscheiden muss. Keine Fremdbibliotheken, nichts geht ins Internet.

// MARK: - Schlüsselbund (Keychain)

enum Keychain {
    static let service = "ch.nivaram.finanzen"

    static func base(_ account: String) -> [String: Any] {
        return [kSecClass as String: kSecClassGenericPassword,
                kSecAttrService as String: service,
                kSecAttrAccount as String: account]
    }

    static func read(_ account: String, context: LAContext? = nil) -> (Data?, OSStatus) {
        var q = base(account)
        q[kSecReturnData as String] = true
        q[kSecMatchLimit as String] = kSecMatchLimitOne
        if let c = context { q[kSecUseAuthenticationContext as String] = c }
        var out: AnyObject?
        let st = SecItemCopyMatching(q as CFDictionary, &out)
        return (out as? Data, st)
    }

    @discardableResult
    static func add(_ account: String, _ data: Data, access: SecAccessControl? = nil) -> OSStatus {
        delete(account)
        var q = base(account)
        q[kSecValueData as String] = data
        if let a = access { q[kSecAttrAccessControl as String] = a }
        else { q[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly }
        return SecItemAdd(q as CFDictionary, nil)
    }

    static func delete(_ account: String) {
        SecItemDelete(base(account) as CFDictionary)
    }
}

// MARK: - Entsperren mit Face ID / Touch ID («BioLock»)

@objc(BioLockPlugin)
public class BioLockPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BioLockPlugin"
    public let jsName = "BioLock"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "enable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "unlock", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "disable", returnType: CAPPluginReturnPromise)
    ]
    private let account = "finanzen_bio_v1"
    private let flag = "finanzen.bio.enrolled"

    @objc func status(_ call: CAPPluginCall) {
        let ctx = LAContext()
        var err: NSError?
        let ok = ctx.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &err)
        var reason = ok ? "ok" : "nichtVerfuegbar"
        if let e = err, e.code == LAError.biometryNotEnrolled.rawValue { reason = "keinFinger" }
        call.resolve(["available": ok, "reason": reason, "enrolled": UserDefaults.standard.bool(forKey: flag)])
    }

    @objc func enable(_ call: CAPPluginCall) {
        guard let secret = call.getString("secret"), !secret.isEmpty, secret.count <= 512, let data = secret.data(using: .utf8) else {
            call.reject("Ungültige Eingabe", "BAD_INPUT"); return
        }
        let ctx = LAContext()
        ctx.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: "Face ID für die Finanzen-App einrichten") { ok, err in
            if !ok {
                let code = (err as? LAError)?.code
                call.reject("Abgebrochen", (code == .userCancel || code == .appCancel || code == .systemCancel) ? "CANCELED" : "FAILED")
                return
            }
            var cfErr: Unmanaged<CFError>?
            guard let access = SecAccessControlCreateWithFlags(nil, kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly, .biometryCurrentSet, &cfErr) else {
                call.reject("Face ID konnte nicht eingerichtet werden", "FAILED"); return
            }
            let st = Keychain.add(self.account, data, access: access)
            if st != errSecSuccess { call.reject("Face ID konnte nicht eingerichtet werden", "FAILED"); return }
            UserDefaults.standard.set(true, forKey: self.flag)
            call.resolve(["data": "ios1." + UUID().uuidString])
        }
    }

    @objc func unlock(_ call: CAPPluginCall) {
        guard let handle = call.getString("data"), handle.hasPrefix("ios1."), UserDefaults.standard.bool(forKey: flag) else {
            call.reject("Nicht eingerichtet", "NOT_ENROLLED"); return
        }
        let ctx = LAContext()
        ctx.localizedReason = String((call.getString("subtitle") ?? "Finanzen entsperren").prefix(160))
        DispatchQueue.global(qos: .userInitiated).async {
            let (d, st) = Keychain.read(self.account, context: ctx)
            if st == errSecSuccess, let d = d, let s = String(data: d, encoding: .utf8) {
                call.resolve(["secret": s]); return
            }
            switch st {
            case errSecUserCanceled: call.reject("Abgebrochen", "CANCELED")
            case errSecItemNotFound:
                UserDefaults.standard.set(false, forKey: self.flag)
                call.reject("Face ID wurde geändert – bitte mit PIN entsperren und neu einrichten", "INVALIDATED")
            case errSecAuthFailed: call.reject("Zu viele Versuche", "LOCKOUT")
            default: call.reject("Entsperren mit Face ID nicht möglich", "FAILED")
            }
        }
    }

    @objc func disable(_ call: CAPPluginCall) {
        Keychain.delete(account)
        UserDefaults.standard.set(false, forKey: flag)
        call.resolve()
    }
}

// MARK: - Geräteschlüssel («DeviceKey»): bindet die Daten an dieses iPhone

@objc(DeviceKeyPlugin)
public class DeviceKeyPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "DeviceKeyPlugin"
    public let jsName = "DeviceKey"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "get", returnType: CAPPluginReturnPromise)
    ]
    private let account = "finanzen_device_v1"
    private let flag = "finanzen.devicekey.created"

    @objc func get(_ call: CAPPluginCall) {
        let (d, st) = Keychain.read(account)
        if st == errSecSuccess, let d = d, d.count == 32 {
            call.resolve(["secret": d.base64EncodedString()]); return
        }
        if UserDefaults.standard.bool(forKey: flag) {
            // Daten stammen von einem anderen Gerät (z. B. aus einer iCloud-Sicherung): Schlüssel fehlt
            call.reject("Geräteschlüssel fehlt", "MISSING"); return
        }
        var bytes = [UInt8](repeating: 0, count: 32)
        guard SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes) == errSecSuccess else {
            call.reject("Geräteschlüssel nicht verfügbar", "FAILED"); return
        }
        let data = Data(bytes)
        guard Keychain.add(account, data) == errSecSuccess else {
            call.reject("Geräteschlüssel nicht verfügbar", "FAILED"); return
        }
        UserDefaults.standard.set(true, forKey: flag)
        call.resolve(["secret": data.base64EncodedString()])
    }
}

// MARK: - Bildschirmschutz («Screen»)
// iOS erlaubt keiner App, Bildschirmfotos zu verbieten. Stattdessen: Die Beträge werden im App-Umschalter
// und während einer Bildschirmaufnahme verdeckt.

@objc(ScreenPlugin)
public class ScreenPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ScreenPlugin"
    public let jsName = "Screen"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setSecure", returnType: CAPPluginReturnPromise)
    ]
    @objc func setSecure(_ call: CAPPluginCall) {
        let secure = call.getBool("secure") ?? true
        DispatchQueue.main.async {
            PrivacyShield.shared.enabled = secure
            call.resolve()
        }
    }
}

final class PrivacyShield {
    static let shared = PrivacyShield()
    var enabled = true { didSet { update() } }
    private var cover: UIView?
    private var inBackground = false
    weak var host: UIViewController?

    func start(host: UIViewController) {
        self.host = host
        let nc = NotificationCenter.default
        nc.addObserver(forName: UIApplication.willResignActiveNotification, object: nil, queue: .main) { [weak self] _ in self?.inBackground = true; self?.update() }
        nc.addObserver(forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main) { [weak self] _ in self?.inBackground = false; self?.update() }
        nc.addObserver(forName: UIScreen.capturedDidChangeNotification, object: nil, queue: .main) { [weak self] _ in self?.update() }
        update()
    }

    private func update() {
        guard let v = host?.view else { return }
        let captured = v.window?.windowScene?.screen.isCaptured ?? false
        let hide = enabled && (inBackground || captured)
        if hide && cover == nil {
            let c = UIVisualEffectView(effect: UIBlurEffect(style: .systemMaterial))
            c.frame = v.bounds
            c.autoresizingMask = [.flexibleWidth, .flexibleHeight]
            let l = UILabel()
            l.text = captured ? "Bildschirmaufnahme läuft – Beträge verdeckt" : "Finanzen"
            l.font = .preferredFont(forTextStyle: .headline)
            l.textAlignment = .center
            l.numberOfLines = 0
            l.frame = c.bounds.insetBy(dx: 24, dy: 0)
            l.autoresizingMask = [.flexibleWidth, .flexibleHeight]
            c.contentView.addSubview(l)
            v.addSubview(c)
            cover = c
        } else if !hide, let c = cover {
            c.removeFromSuperview()
            cover = nil
        }
    }
}

// MARK: - Mitteilungen («Notify»): von der App selbst geplant, kein Push-Server

@objc(NotifyPlugin)
public class NotifyPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NotifyPlugin"
    public let jsName = "Notify"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "enable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "schedule", returnType: CAPPluginReturnPromise)
    ]
    private let idsKey = "finanzen.notify.ids"

    @objc func enable(_ call: CAPPluginCall) {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
            call.resolve(["granted": granted])
        }
    }

    @objc func schedule(_ call: CAPPluginCall) {
        let center = UNUserNotificationCenter.current()
        let old = UserDefaults.standard.stringArray(forKey: idsKey) ?? []
        center.removePendingNotificationRequests(withIdentifiers: old)
        let items = call.getArray("items", JSObject.self) ?? []
        let now = Date().timeIntervalSince1970 * 1000
        var ids: [String] = []
        for o in items {
            if ids.count >= 60 { break }
            guard let id = (o["id"] as? NSNumber)?.intValue, let at = (o["at"] as? NSNumber)?.doubleValue, at > now else { continue }
            let content = UNMutableNotificationContent()
            content.title = String(((o["title"] as? String) ?? "Finanzen").prefix(80))
            content.body = String(((o["text"] as? String) ?? "").prefix(240))
            content.sound = .default
            let trigger = UNTimeIntervalNotificationTrigger(timeInterval: max(1, (at - now) / 1000), repeats: false)
            let ident = "finanzen.\(id)"
            center.add(UNNotificationRequest(identifier: ident, content: content, trigger: trigger), withCompletionHandler: nil)
            ids.append(ident)
        }
        UserDefaults.standard.set(ids, forKey: idsKey)
        call.resolve(["scheduled": ids.count])
    }
}

// MARK: - Sicherheitsprüfung («Integrity»): Jailbreak, Hooking, Debugger – nur warnen, nie sperren

@objc(IntegrityPlugin)
public class IntegrityPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "IntegrityPlugin"
    public let jsName = "Integrity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "check", returnType: CAPPluginReturnPromise)
    ]

    @objc func check(_ call: CAPPluginCall) {
        var reasons: [String] = []
        var rooted = false, hooked = false, debugger = false, emulator = false

        #if targetEnvironment(simulator)
        emulator = true
        reasons.append("Simulator")
        #else
        let paths = ["/Applications/Cydia.app", "/Applications/Sileo.app", "/Applications/Zebra.app",
                     "/Library/MobileSubstrate/MobileSubstrate.dylib", "/bin/bash", "/usr/sbin/sshd", "/etc/apt",
                     "/private/var/lib/apt", "/var/jb", "/var/binpack", "/usr/lib/TweakInject", "/var/LIB"]
        for p in paths where FileManager.default.fileExists(atPath: p) {
            rooted = true; reasons.append("Jailbreak-Datei gefunden: " + p); break
        }
        let probe = "/private/finanzen_jb_probe.txt"
        if (try? "x".write(toFile: probe, atomically: true, encoding: .utf8)) != nil {
            rooted = true; reasons.append("Schreiben ausserhalb der App möglich")
            try? FileManager.default.removeItem(atPath: probe)
        }
        #endif

        let marks = ["frida", "cynject", "libcycript", "substrate", "substitute", "tweakinject", "libhooker", "ellekit"]
        for i in 0..<_dyld_image_count() {
            guard let n = _dyld_get_image_name(i) else { continue }
            let s = String(cString: n).lowercased()
            if let m = marks.first(where: { s.contains($0) }) { hooked = true; reasons.append("Fremder Code geladen: " + m); break }
        }
        if getenv("DYLD_INSERT_LIBRARIES") != nil { hooked = true; reasons.append("DYLD_INSERT_LIBRARIES gesetzt") }

        var info = kinfo_proc()
        var mib: [Int32] = [CTL_KERN, KERN_PROC, KERN_PROC_PID, getpid()]
        var size = MemoryLayout<kinfo_proc>.stride
        if sysctl(&mib, UInt32(mib.count), &info, &size, nil, 0) == 0, (info.kp_proc.p_flag & P_TRACED) != 0 {
            debugger = true; reasons.append("Debugger angehängt")
        }

        call.resolve(["rooted": rooted, "hooked": hooked, "debugger": debugger, "emulator": emulator,
                      "signatureOk": NSNull(), "cert": "", "installer": "", "reasons": reasons])
    }
}

// MARK: - Haupt-Bildschirm: registriert die eigenen Bausteine

class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(BioLockPlugin())
        bridge?.registerPluginInstance(DeviceKeyPlugin())
        bridge?.registerPluginInstance(ScreenPlugin())
        bridge?.registerPluginInstance(NotifyPlugin())
        bridge?.registerPluginInstance(IntegrityPlugin())
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        webView?.allowsLinkPreview = false
        if #available(iOS 16.4, *) { webView?.isInspectable = false }
        PrivacyShield.shared.start(host: self)
    }
}

// MARK: - Daten nicht in die iCloud-Sicherung (wie allowBackup=false auf Android)

enum BackupExclusion {
    static func apply() {
        let fm = FileManager.default
        guard let lib = fm.urls(for: .libraryDirectory, in: .userDomainMask).first else { return }
        for sub in ["WebKit", "Caches", "Application Support"] {
            var url = lib.appendingPathComponent(sub, isDirectory: true)
            if !fm.fileExists(atPath: url.path) { try? fm.createDirectory(at: url, withIntermediateDirectories: true) }
            var values = URLResourceValues()
            values.isExcludedFromBackup = true
            try? url.setResourceValues(values)
        }
    }
}
