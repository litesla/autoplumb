# DNS Security Records Configuration (SPF, DMARC, CAA)

To resolve **Issue 4 (SPF)**, **Issue 5 (DMARC)**, and **Issue 6 (CAA)** reported by security scanners, add the following DNS records to your DNS provider dashboard (Cloudflare, Netlify DNS, Namecheap, GoDaddy, AWS Route 53, etc.).

---

## 1. SPF Record (Protects domain from email spoofing & phishing)
* **Type:** `TXT`
* **Name / Host:** `@` (or root domain)
* **TTL:** `3600` (or `Auto`)
* **Value:** 
  - **Option A (If you do NOT send outgoing emails from this domain - Recommended):**
    ```text
    v=spf1 -all
    ```
  - **Option B (If you send mail via Google Workspace / Gmail):**
    ```text
    v=spf1 include:_spf.google.com ~all
    ```
  - **Option C (If you send mail via Resend / SendGrid / Mailgun):**
    ```text
    v=spf1 include:sendgrid.net include:resend.com ~all
    ```

---

## 2. DMARC Record (Specifies how receivers should handle spoofed mail)
* **Type:** `TXT`
* **Name / Host:** `_dmarc` (or `_dmarc.yourdomain.com`)
* **TTL:** `3600` (or `Auto`)
* **Value:**
  - **Quarantine Policy (Recommended):**
    ```text
    v=DMARC1; p=quarantine; sp=quarantine; rua=mailto:admin@yourdomain.com; fo=1; pct=100
    ```
  - **Strict Reject Policy (Maximum Security):**
    ```text
    v=DMARC1; p=reject; sp=reject; rua=mailto:admin@yourdomain.com; fo=1; pct=100
    ```

---

## 3. CAA Records (Restricts Certificate Authorities allowed to issue SSL certificates)
Prevents rogue CAs from issuing fraudulent SSL/TLS certificates for your website.

Add the following records for your root domain:

### Record 1: Allow Let's Encrypt (Used by Netlify & Vercel)
* **Type:** `CAA`
* **Name / Host:** `@` (or root domain)
* **Flag:** `0`
* **Tag:** `issue`
* **Value:** `"letsencrypt.org"`

### Record 2: Allow Let's Encrypt Wildcard Certificates
* **Type:** `CAA`
* **Name / Host:** `@`
* **Flag:** `0`
* **Tag:** `issuewild`
* **Value:** `"letsencrypt.org"`

### Record 3: Allow DigiCert (Optional Fallback)
* **Type:** `CAA`
* **Name / Host:** `@`
* **Flag:** `0`
* **Tag:** `issue`
* **Value:** `"digicert.com"`

### Record 4: Security Incident Reporting (Optional)
* **Type:** `CAA`
* **Name / Host:** `@`
* **Flag:** `0`
* **Tag:** `iodef`
* **Value:** `"mailto:security@yourdomain.com"`

---

## Quick Summary Table for Cloudflare / Netlify DNS

| Type | Name | Content / Value | Proxy / TTL |
| :--- | :--- | :--- | :--- |
| **TXT** | `@` | `v=spf1 include:_spf.google.com ~all` (or `v=spf1 -all`) | DNS only (Auto) |
| **TXT** | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:security@yourdomain.com` | DNS only (Auto) |
| **CAA** | `@` | `0 issue "letsencrypt.org"` | DNS only (Auto) |
| **CAA** | `@` | `0 issuewild "letsencrypt.org"` | DNS only (Auto) |
| **CAA** | `@` | `0 issue "digicert.com"` | DNS only (Auto) |
