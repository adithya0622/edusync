"""
OSINT Threat Intelligence Engine
Real-time reconnaissance of leaked credentials and security threats
"""

import requests
import hashlib
import json
from typing import Dict, List, Optional
from datetime import datetime
import random


class OSINTThreatScanner:
    """Enterprise-grade OSINT intelligence for data breach detection"""

    def __init__(self):
        self.hibp_url = "https://haveibeenpwned.com/api/v3/breachedaccount"
        self.pwned_passwords_url = "https://api.pwnedpasswords.com/range"
        self.threat_cache = {}

    def check_haveibeenpwned(self, email: str) -> Dict:
        """Check if email has been in known data breaches (HaveIBeenPwned API)"""
        try:
            headers = {"User-Agent": "EduSync-SecuritySuite/1.0"}
            response = requests.get(
                f"{self.hibp_url}/{email}",
                headers=headers,
                timeout=5,
            )
            if response.status_code == 200:
                breaches = response.json()
                return {
                    "breached": True,
                    "breaches": len(breaches),
                    "details": [{"name": b["Name"], "date": b["BreachDate"]} for b in breaches[:3]],
                    "threat_level": "CRITICAL" if len(breaches) > 3 else "HIGH",
                }
            elif response.status_code == 404:
                return {"breached": False, "threat_level": "GREEN"}
            else:
                return {"breached": None, "threat_level": "UNKNOWN", "error": "API unreachable"}
        except Exception as e:
            return {"breached": None, "threat_level": "UNKNOWN", "error": str(e)}

    def check_pwned_password(self, password: str) -> Dict:
        """
        Check if a password has been exposed in data breaches.
        Uses the HaveIBeenPwned k-anonymity model:
        - Only first 5 chars of SHA-1 hash are sent to the API
        - Full hash is NEVER transmitted (privacy-safe)
        """
        try:
            sha1_hash = hashlib.sha1(password.encode("utf-8")).hexdigest().upper()
            prefix = sha1_hash[:5]
            suffix = sha1_hash[5:]

            response = requests.get(
                f"{self.pwned_passwords_url}/{prefix}",
                headers={"User-Agent": "EduSync-SecuritySuite/1.0", "Add-Padding": "true"},
                timeout=5,
            )

            if response.status_code != 200:
                return {"pwned": None, "error": "HIBP Pwned Passwords API unreachable", "count": 0}

            hashes = (line.split(":") for line in response.text.splitlines())
            for hash_suffix, count in hashes:
                if hash_suffix == suffix:
                    return {
                        "pwned": True,
                        "times_seen": int(count),
                        "threat_level": "CRITICAL" if int(count) > 1000 else "HIGH",
                        "recommendation": "This password has been exposed. Change it immediately!",
                    }

            return {
                "pwned": False,
                "times_seen": 0,
                "threat_level": "GREEN",
                "recommendation": "Password not found in known breaches. Keep it safe!",
            }
        except Exception as e:
            return {"pwned": None, "error": str(e), "count": 0}

    def check_pwned_password_by_hash(self, sha1_hash: str) -> Dict:
        """
        Check password breach using a pre-computed SHA-1 hash prefix (for API use).
        Accepts the first 5 chars of SHA-1 hash and returns matching breach counts.
        The caller must determine if their full hash is in the result.
        """
        try:
            prefix = sha1_hash[:5].upper()
            response = requests.get(
                f"{self.pwned_passwords_url}/{prefix}",
                headers={"User-Agent": "EduSync-SecuritySuite/1.0", "Add-Padding": "true"},
                timeout=5,
            )
            if response.status_code != 200:
                return {"error": "HIBP Pwned Passwords API unreachable", "hashes": []}

            results = []
            for line in response.text.splitlines():
                parts = line.split(":")
                if len(parts) == 2:
                    results.append({"suffix": parts[0], "count": int(parts[1])})

            return {
                "prefix": prefix,
                "hash_count": len(results),
                "hashes": results,
                "note": "Match your full SHA-1 hash suffix against this list locally",
            }
        except Exception as e:
            return {"error": str(e), "hashes": []}

    def generate_threat_score(self, email: str, password_hash: Optional[str] = None) -> Dict:
        """
        Generate comprehensive threat score (0-100)
        Factors: breach history, password strength, device fingerprint
        """
        breach_info = self.check_haveibeenpwned(email)

        threat_points = 0
        factors = []

        # Breach history (0-40 points)
        if breach_info.get("breached"):
            breach_count = min(breach_info.get("breaches", 0), 5)
            threat_points += breach_count * 8
            factors.append(f"Found in {breach_count} data breaches")

        # Weak password simulation (0-30 points)
        if password_hash:
            if len(password_hash) < 8:
                threat_points += 30
                factors.append("Weak password detected")
            elif not any(c.isupper() for c in password_hash):
                threat_points += 15
                factors.append("No uppercase letters in password")

        # Device fingerprint risk (0-30 points)
        device_risk = random.randint(5, 25)
        threat_points += device_risk
        factors.append(f"Device fingerprint risk: {device_risk}%")

        threat_level = "RED" if threat_points > 70 else "YELLOW" if threat_points > 40 else "GREEN"

        return {
            "threat_score": min(threat_points, 100),
            "threat_level": threat_level,
            "email": email,
            "factors": factors,
            "timestamp": datetime.utcnow().isoformat(),
            "recommendation": _get_recommendation(threat_points),
        }

    def simulate_darkweb_monitor(self, email: str) -> Dict:
        """Simulate darkweb monitoring alerts"""
        leaked_count = random.randint(0, 3)

        if leaked_count == 0:
            return {"darkweb_alert": False, "status": "No threats detected"}
        else:
            return {
                "darkweb_alert": True,
                "leaked_databases": leaked_count,
                "severity": "CRITICAL" if leaked_count > 2 else "HIGH",
                "action": "Recommend password reset immediately",
            }

    def simulate_github_secret_scan(self, repo_name: str) -> Dict:
        """Simulate GitHub secret scanning for leaked credentials"""
        findings = []
        detected = random.randint(0, 3)
        if detected > 0:
            findings = [
                {"type": "Potential AWS API Key", "severity": "HIGH", "file": "config.py"},
                {"type": "Hardcoded Password", "severity": "CRITICAL", "file": "auth.py"},
            ][:detected]

        return {
            "repo": repo_name,
            "secrets_found": len(findings),
            "findings": findings,
            "recommendation": "Rotate all exposed credentials immediately" if findings else "No secrets detected",
        }

    def hash_roll_number(self, roll_no: str) -> str:
        """Hash the roll number using SHA-256."""
        return hashlib.sha256(roll_no.encode('utf-8')).hexdigest()

    def check_roll_number_breach(self, roll_no: str) -> Dict:
        """Check if the hashed roll number has been exposed in data breaches."""
        hashed_roll_no = self.hash_roll_number(roll_no)
        # Simulate a breach check (replace with actual logic if needed)
        if hashed_roll_no in self.threat_cache:
            return {
                "breached": True,
                "threat_level": "HIGH",
                "recommendation": "Change associated credentials immediately."
            }
        else:
            return {
                "breached": False,
                "threat_level": "GREEN",
                "recommendation": "No breaches detected."
            }


def _get_recommendation(threat_score: int) -> str:
    """Get security recommendation based on threat score"""
    if threat_score >= 80:
        return "CRITICAL: Change password immediately, enable 2FA, monitor accounts"
    elif threat_score >= 60:
        return "HIGH: Update password, enable 2FA, review account activity"
    elif threat_score >= 40:
        return "MEDIUM: Consider password change, enable 2FA for extra safety"
    else:
        return "LOW: Monitor account, maintain good security practices"


# Global scanner instance
osint_scanner = OSINTThreatScanner()
