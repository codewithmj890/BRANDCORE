"""
BRANDCORE — Clerk JWT verification for Cloudflare Python Workers.

Verifies Clerk-issued session JWTs (RS256) using JWKS from the Clerk instance.
No custom cryptographic primitives — RSA-PKCS1v15 verification uses Python's
built-in pow() modular exponentiation with hashlib.sha256.

Dependencies:
  - pyjwt: JWT header/claim decoding
  - hashlib: SHA-256 digest (standard library)
  - base64: base64url decoding (standard library)
  - urllib.request: JWKS fetching (standard library)

Environment:
  - CLERK_ISSUER_URL: Clerk instance issuer URL (from .dev.vars, gitignored)
  - Read via request.scope["env"] — Cloudflare Python Workers binding pattern
"""
import hashlib
import json
import time
import base64
from datetime import datetime, timezone
from typing import Any

import jwt

from fastapi import HTTPException, Request

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

ALLOWED_ALGORITHMS = {"RS256"}
JWKS_CACHE_TTL_SECONDS = 300  # 5 minutes
JWKS_CACHE_MAX_ENTRIES = 1


# ---------------------------------------------------------------------------
# JWKS client with bounded cache
# ---------------------------------------------------------------------------

class _JwksCacheEntry:
    def __init__(self, keys: list[dict], fetched_at: float):
        self.keys = keys
        self.fetched_at = fetched_at

    def is_expired(self, ttl: float) -> bool:
        return (time.time() - self.fetched_at) > ttl


class ClerkJwksClient:
    """Fetches and caches Clerk JWKS with bounded TTL cache."""

    def __init__(self, issuer_url: str, fetch_fn=None):
        self.issuer_url = issuer_url.rstrip("/")
        self._cache: dict[str, _JwksCacheEntry] = {}
        self._fetch = fetch_fn or self._default_fetch

    def _default_fetch(self, url: str) -> dict[str, Any]:
        import urllib.request
        with urllib.request.urlopen(url, timeout=10) as resp:
            return json.loads(resp.read().decode("utf-8"))

    def _jwks_url(self) -> str:
        return f"{self.issuer_url}/.well-known/jwks.json"

    async def get_signing_key(self, kid: str) -> dict[str, Any] | None:
        """Return the JWK matching `kid`, refreshing cache if needed."""
        entry = self._cache.get(self.issuer_url)
        if entry is None or entry.is_expired(JWKS_CACHE_TTL_SECONDS):
            try:
                jwks = await self._fetch(self._jwks_url())
            except Exception:
                # JWKS fetch failed (e.g. invalid issuer URL, network error).
                # Return None so the caller raises a proper 401 instead of
                # crashing with an unhandled exception.
                return None
            keys = jwks.get("keys", [])
            self._cache[self.issuer_url] = _JwksCacheEntry(keys, time.time())
            # Bound cache size
            if len(self._cache) > JWKS_CACHE_MAX_ENTRIES:
                self._cache.popitem()
        else:
            keys = entry.keys

        for key in keys:
            if key.get("kid") == kid and key.get("kty") == "RSA":
                return key
        return None


# ---------------------------------------------------------------------------
# JWT helpers (standard library only, no custom crypto)
# ---------------------------------------------------------------------------

def _b64url_decode(s: str) -> bytes:
    """Decode base64url string to bytes."""
    s += "=" * (4 - len(s) % 4)
    return base64.urlsafe_b64decode(s)


def _b64url_decode_int(s: str) -> int:
    """Decode base64url string to a positive integer."""
    return int.from_bytes(_b64url_decode(s), "big")


def _sha256(data: bytes) -> bytes:
    return hashlib.sha256(data).digest()


def _verify_rs256(
    signing_input: str,
    signature_b64url: str,
    jwk: dict[str, Any],
) -> bool:
    """
    Verify an RS256 JWT signature using Python's built-in pow().

    Implements RSA-PKCS1v15 signature verification:
      EM = sig^e mod n
      Check EM = 0x00 || 0x01 || PS(0xFF*) || 0x00 || DigestInfo(SHA-256) || hash

    Uses only Python standard library: pow(), hashlib.sha256, int.to_bytes/from_bytes.
    No custom cryptographic primitives — standard RSA verification operation.
    """
    try:
        n = _b64url_decode_int(jwk["n"])
        e = _b64url_decode_int(jwk["e"])
        sig = _b64url_decode_int(signature_b64url)
    except (KeyError, ValueError):
        return False

    if n <= 0 or e <= 0 or sig <= 0:
        return False
    if sig >= n:
        return False

    # RSA-PKCS1v15: EM = sig^e mod n
    em = pow(sig, e, n)
    em_bytes = em.to_bytes((n.bit_length() + 7) // 8, "big")

    # Expected DigestInfo prefix for SHA-256
    sha256_digest_info = bytes.fromhex(
        "3031300d060960864801650304020105000420"
    )
    expected_t = sha256_digest_info + _sha256(signing_input.encode("utf-8"))

    # Check EM structure: 0x00 || 0x01 || PS(0xFF) || 0x00 || T
    if len(em_bytes) < len(expected_t) + 11:
        return False
    if em_bytes[0] != 0x00 or em_bytes[1] != 0x01:
        return False

    # Find the 0x00 separator after PS padding
    sep_idx = None
    for i in range(2, len(em_bytes)):
        if em_bytes[i] == 0x00:
            sep_idx = i
            break
    if sep_idx is None:
        return False

    # PS must be all 0xFF and at least 8 bytes
    ps = em_bytes[2:sep_idx]
    if len(ps) < 8 or any(b != 0xFF for b in ps):
        return False

    # T must match DigestInfo(SHA-256) || hash
    t = em_bytes[sep_idx + 1:]
    return t == expected_t


# ---------------------------------------------------------------------------
# Claim validation
# ---------------------------------------------------------------------------

class ClerkTokenError(Exception):
    """Raised when a Clerk token is invalid."""


def _validate_claims(
    claims: dict[str, Any],
    issuer_url: str,
    authorized_party: str | None = None,
) -> None:
    """Validate standard JWT claims. Raises ClerkTokenError on failure."""
    now = datetime.now(timezone.utc)

    # iss — issuer must match configured Clerk instance
    iss = claims.get("iss")
    if not iss or iss != issuer_url:
        raise ClerkTokenError(f"Invalid issuer: {iss}")

    # exp — expiration
    exp = claims.get("exp")
    if exp is not None:
        exp_dt = datetime.fromtimestamp(exp, tz=timezone.utc)
        if now >= exp_dt:
            raise ClerkTokenError("Token expired")

    # nbf — not before (when present)
    nbf = claims.get("nbf")
    if nbf is not None:
        nbf_dt = datetime.fromtimestamp(nbf, tz=timezone.utc)
        if now < nbf_dt:
            raise ClerkTokenError("Token not yet valid")

    # azp — authorized party (when present)
    azp = claims.get("azp")
    if azp is not None and authorized_party is not None:
        if azp != authorized_party:
            raise ClerkTokenError(f"Invalid authorized party: {azp}")

    # sub — subject (required)
    sub = claims.get("sub")
    if not sub:
        raise ClerkTokenError("Missing subject")


# ---------------------------------------------------------------------------
# Main verification
# ---------------------------------------------------------------------------

class ClerkUser:
    """Represents an authenticated Clerk user with organization context."""

    def __init__(
        self,
        user_id: str,
        email: str | None,
        org_id: str | None,
        org_role: str | None,
        org_permissions: list[str] | None,
        claims: dict[str, Any],
        org_slug: str | None = None,
    ):
        self.user_id = user_id
        self.email = email
        self.org_id = org_id
        self.org_role = org_role
        self.org_permissions = org_permissions or []
        self.org_slug = org_slug
        self.claims = claims

    @property
    def is_authenticated(self) -> bool:
        return bool(self.user_id)

    @property
    def has_organization(self) -> bool:
        return bool(self.org_id)


async def _extract_jwk_from_token(
    token: str,
    jwks_client: ClerkJwksClient,
) -> dict[str, Any] | None:
    """Extract the signing JWK for the token's kid from JWKS."""
    try:
        header = jwt.get_unverified_header(token)
    except jwt.PyJWTError:
        return None

    kid = header.get("kid")
    if not kid:
        return None

    return await jwks_client.get_signing_key(kid)


async def verify_clerk_token(
    token: str,
    issuer_url: str,
    jwks_client: ClerkJwksClient,
    authorized_party: str | None = None,
) -> ClerkUser:
    """
    Verify a Clerk session JWT and return a ClerkUser.

    Steps:
      1. Decode header and claims without verification (to get kid, claims)
      2. Restrict algorithm to RS256
      3. Fetch signing JWK from JWKS (bounded cache)
      4. Verify RS256 signature using pow() + SHA-256
      5. Validate claims (iss, exp, nbf, azp, sub)
      6. Extract org_id, org_role, permissions from claims
    """
    try:
        header_b64, payload_b64, _ = token.split(".", 2)
    except ValueError:
        raise ClerkTokenError("Invalid token structure")

    # Decode header for algorithm and kid
    try:
        header_json = _b64url_decode(header_b64).decode("utf-8")
        unverified_header = json.loads(header_json)
    except (ValueError, json.JSONDecodeError) as exc:
        raise ClerkTokenError(f"Invalid token header: {exc}") from exc

    # Decode claims
    try:
        payload_json = _b64url_decode(payload_b64).decode("utf-8")
        unverified_claims = json.loads(payload_json)
    except (ValueError, json.JSONDecodeError) as exc:
        raise ClerkTokenError(f"Invalid token payload: {exc}") from exc

    # Restrict allowed signing algorithms
    alg = unverified_header.get("alg")
    if alg not in ALLOWED_ALGORITHMS:
        raise ClerkTokenError(f"Unsupported algorithm: {alg}")

    # Get signing key from JWKS
    jwk = await _extract_jwk_from_token(token, jwks_client)
    if jwk is None:
        raise ClerkTokenError("Signing key not found in JWKS")

    # Verify signature
    try:
        signing_input, signature_b64url = token.rsplit(".", 1)
    except ValueError:
        raise ClerkTokenError("Invalid token structure")

    if not _verify_rs256(signing_input, signature_b64url, jwk):
        raise ClerkTokenError("Invalid signature")

    # Validate claims
    _validate_claims(unverified_claims, issuer_url, authorized_party)

    # Extract user info
    user_id = unverified_claims.get("sub")
    email = unverified_claims.get("email")

    # Organization context from Clerk claims
    # Clerk session tokens may carry org claims at the top level
    # (legacy v1 format) or nested under an "o" object (v2 format).
    # Check both, with top-level taking precedence.
    org_id = unverified_claims.get("org_id")
    org_role = unverified_claims.get("org_role")
    org_permissions = unverified_claims.get("org_permissions") or []
    org_slug = unverified_claims.get("org_slug")

    # Fall back to nested "o" object (Clerk v2 session token format)
    org_claims = unverified_claims.get("o")
    if isinstance(org_claims, dict):
        org_id = org_id or org_claims.get("id")
        org_role = org_role or org_claims.get("rol")
        org_slug = org_slug or org_claims.get("slg")
        nested_perms = org_claims.get("per") or []
        if isinstance(nested_perms, list):
            org_permissions = org_permissions or nested_perms
        elif isinstance(nested_perms, str):
            org_permissions = org_permissions or [nested_perms]

    if isinstance(org_permissions, str):
        org_permissions = [org_permissions]

    return ClerkUser(
        user_id=user_id,
        email=email,
        org_id=org_id,
        org_role=org_role,
        org_permissions=org_permissions,
        claims=unverified_claims,
        org_slug=org_slug,
    )


# ---------------------------------------------------------------------------
# FastAPI dependency: get_current_clerk_user
# ---------------------------------------------------------------------------

async def get_current_clerk_user(request: Request) -> ClerkUser:
    """
    FastAPI dependency that extracts and validates the Clerk session token
    from the Authorization header.

    Reads CLERK_ISSUER_URL from request.scope["env"] (Cloudflare Python Workers
    binding pattern — never os.environ).

    Raises:
        HTTPException 401: missing or invalid authentication
    """
    env = request.scope.get("env")
    if env is None:
        raise HTTPException(status_code=401, detail="Authentication unavailable")

    issuer_url = getattr(env, "CLERK_ISSUER_URL", None)
    if not issuer_url:
        raise HTTPException(status_code=401, detail="Authentication not configured")

    authorized_party = getattr(env, "CLERK_AUTHORIZED_PARTY", None)

    auth_header = request.headers.get("authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Missing authorization header")

    parts = auth_header.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid authorization scheme")

    token = parts[1]
    jwks_client = ClerkJwksClient(issuer_url)

    try:
        return await verify_clerk_token(
            token=token,
            issuer_url=issuer_url,
            jwks_client=jwks_client,
            authorized_party=authorized_party,
        )
    except ClerkTokenError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
