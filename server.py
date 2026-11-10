"""
Green Gate Real Estate LLC — Full-Stack Production, SEO & Google Sheets Lead Server
Features:
- Instant SSR/Pre-rendered HTML delivery for Googlebot & all crawlers
- HTTP 301 Permanent Redirects (Zero redirect chains)
- Custom 404.html error handling with HTTP 404 status
- POST /api/submit endpoint saving leads to JSON, CSV (/api/leads.csv), and forwarding to Google Sheets Webhook
- Cache-Control headers for < 1.0s load time and Core Web Vitals
"""
import os
import csv
import json
import urllib.request
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

SITE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SITE_DIR, "data")
SUBMISSIONS_FILE = os.path.join(DATA_DIR, "submissions.json")
LEADS_CSV_FILE = os.path.join(DATA_DIR, "leads.csv")
GOOGLE_SHEETS_WEBHOOK_URL = os.environ.get("GOOGLE_SHEETS_WEBHOOK_URL", "")

REDIRECTS_301 = {
    "/project-palm-villas.html": "/villas.html",
    "/project-downtown-lofts.html": "/apartments.html",
    "/project-hills-townhouses.html": "/townhouses.html",
    "/general-clean": "/villas.html",
    "/copy-of-villas": "/townhouses.html",
    "/copy-of-townhouses": "/apartments.html",
    "/copy-of-projects": "/about.html",
    "/contact-8": "/careers.html",
    "/home": "/",
    "/index.php": "/",
}


class GreenGateServerHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=SITE_DIR, **kwargs)

    def end_headers(self):
        path = urlparse(self.path).path.lower()
        if path.endswith((".webp", ".png", ".jpg", ".jpeg", ".svg", ".mp4", ".webm", ".woff2")):
            self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        elif path.endswith((".css", ".js")):
            # Assets are fingerprinted with ?v=<build> in HTML, so a new build always busts the cache
            query = urlparse(self.path).query
            if "v=" in query:
                self.send_header("Cache-Control", "public, max-age=31536000, immutable")
            else:
                self.send_header("Cache-Control", "no-cache, must-revalidate")
        else:
            # HTML must always revalidate so new builds show immediately
            self.send_header("Cache-Control", "no-cache, must-revalidate")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        super().end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        clean_path = parsed.path

        if clean_path in REDIRECTS_301:
            target = REDIRECTS_301[clean_path]
            self.send_response(301)
            self.send_header("Location", target)
            self.end_headers()
            return

        if clean_path == "/api/submissions":
            os.makedirs(DATA_DIR, exist_ok=True)
            records = []
            if os.path.exists(SUBMISSIONS_FILE):
                try:
                    with open(SUBMISSIONS_FILE, "r", encoding="utf-8") as f:
                        records = json.load(f)
                except Exception:
                    records = []
            payload = json.dumps({"count": len(records), "submissions": records}, indent=2).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return

        if clean_path == "/api/leads.csv":
            os.makedirs(DATA_DIR, exist_ok=True)
            if not os.path.exists(LEADS_CSV_FILE):
                with open(LEADS_CSV_FILE, "w", newline="", encoding="utf-8") as f:
                    writer = csv.writer(f)
                    writer.writerow(["ID", "Timestamp", "CTA_Context", "Page_URL", "Name", "Email", "Phone", "Interest", "Budget", "Preferred_Date", "Notes"])
            with open(LEADS_CSV_FILE, "rb") as f:
                csv_bytes = f.read()
            self.send_response(200)
            self.send_header("Content-Type", "text/csv; charset=utf-8")
            self.send_header("Content-Disposition", 'inline; filename="greengate_leads.csv"')
            self.send_header("Content-Length", str(len(csv_bytes)))
            self.end_headers()
            self.wfile.write(csv_bytes)
            return

        fs_path = self.translate_path(self.path)
        if os.path.isdir(fs_path):
            index_candidate = os.path.join(fs_path, "index.html")
            if not os.path.exists(index_candidate):
                self.serve_custom_404()
                return
        elif not os.path.exists(fs_path):
            if os.path.exists(fs_path + ".html"):
                self.send_response(301)
                self.send_header("Location", clean_path + ".html")
                self.end_headers()
                return
            self.serve_custom_404()
            return

        super().do_GET()

    def serve_custom_404(self):
        p404 = os.path.join(SITE_DIR, "404.html")
        if os.path.exists(p404):
            with open(p404, "rb") as f:
                body = f.read()
            self.send_response(404)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            self.send_error(404, "Page Not Found")

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path in ("/api/submit", "/api/contact", "/api/inquiry", "/api/careers"):
            length = int(self.headers.get("Content-Length", 0))
            raw_body = self.rfile.read(length).decode("utf-8", errors="replace") if length > 0 else "{}"
            try:
                data = json.loads(raw_body)
            except Exception:
                data = {"raw": raw_body}

            os.makedirs(DATA_DIR, exist_ok=True)
            records = []
            if os.path.exists(SUBMISSIONS_FILE):
                try:
                    with open(SUBMISSIONS_FILE, "r", encoding="utf-8") as f:
                        records = json.load(f)
                except Exception:
                    records = []

            received_at = datetime.utcnow().isoformat() + "Z"
            lead_id = len(records) + 1
            entry = {
                "id": lead_id,
                "receivedAt": received_at,
                "endpoint": parsed.path,
                "data": data,
            }
            records.append(entry)
            with open(SUBMISSIONS_FILE, "w", encoding="utf-8") as f:
                json.dump(records, f, indent=2)

            # Also append to data/leads.csv for Google Sheets =IMPORTDATA() or direct CSV download
            fields = data.get("fields", {}) if isinstance(data, dict) else {}
            write_header = not os.path.exists(LEADS_CSV_FILE)
            with open(LEADS_CSV_FILE, "a", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                if write_header:
                    writer.writerow(["ID", "Timestamp", "CTA_Context", "Page_URL", "Name", "Email", "Phone", "Interest", "Budget", "Preferred_Date", "Notes"])
                writer.writerow([
                    lead_id,
                    received_at,
                    data.get("ctaContext", data.get("formId", "Website Inquiry")),
                    data.get("pageUrl", "/"),
                    fields.get("name") or fields.get("Name") or fields.get("Full-Name") or "",
                    fields.get("email") or fields.get("Email") or "",
                    fields.get("phone") or fields.get("Phone") or "",
                    fields.get("interest") or fields.get("Property-Interest") or fields.get("Subject") or "",
                    fields.get("budget") or fields.get("Investment-Budget") or "",
                    fields.get("preferred_date") or fields.get("Preferred-Date") or "",
                    fields.get("notes") or fields.get("Message") or "",
                ])

            # Forward to Google Sheets Apps Script Webhook if configured on server
            webhook = GOOGLE_SHEETS_WEBHOOK_URL or (data.get("sheetsWebhookUrl") if isinstance(data, dict) else "")
            if webhook and webhook.startswith("https://script.google.com"):
                try:
                    req = urllib.request.Request(
                        webhook,
                        data=json.dumps(entry).encode("utf-8"),
                        headers={"Content-Type": "application/json"},
                        method="POST",
                    )
                    urllib.request.urlopen(req, timeout=4)
                except Exception:
                    pass

            resp = json.dumps({
                "status": "ok",
                "id": lead_id,
                "message": "Thank you! Green Gate Real Estate LLC has logged your inquiry."
            }).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(resp)))
            self.end_headers()
            self.wfile.write(resp)
        else:
            self.send_error(404, "Endpoint Not Found")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    server = ThreadingHTTPServer(("0.0.0.0", port), GreenGateServerHandler)
    print(f"Green Gate Real Estate LLC Server listening on http://localhost:{port}")
    server.serve_forever()
