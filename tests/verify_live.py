import urllib.request
import json

def test_live_servers():
    print("Testing live servers...")

    # 1. Backend root
    with urllib.request.urlopen("http://127.0.0.1:8000/") as resp:
        assert resp.getcode() == 200
        data = json.loads(resp.read().decode("utf-8"))
        print("1. Backend Root:", data["platform"], "-", data["status"])

    # 2. Public QR endpoint
    with urllib.request.urlopen("http://127.0.0.1:8000/verify/CERT-MH-001-0001") as resp:
        assert resp.getcode() == 200
        qr_data = json.loads(resp.read().decode("utf-8"))
        print("2. Public QR Endpoint:")
        print("   Certificate:", qr_data["certificate_number"])
        print("   Masked UID:", qr_data["instrument_masked_id"])
        print("   Validity Status:", qr_data["validity_status"])
        print("   Integrity Status:", qr_data["integrity_status"])
        print("   Fingerprint:", qr_data["display_fingerprint"])
        assert "phone" not in qr_data
        assert "latitude" not in qr_data

    # 3. Frontend root
    with urllib.request.urlopen("http://127.0.0.1:5173/") as resp:
        assert resp.getcode() == 200
        html = resp.read().decode("utf-8")
        assert "LegalMetrix" in html
        print("3. Frontend HTML served successfully (length:", len(html), "bytes)")

    print("\nALL LIVE SERVERS OPERATIONAL AND HEALTHY!")

if __name__ == "__main__":
    test_live_servers()
