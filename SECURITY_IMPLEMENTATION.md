# Security Implementation Guide

This document explains the two security layers implemented in the EdusyncUpgrade system.

## Overview

Two security layers have been added to protect student data and authentication:

### Layer 1: Data Encryption (AES)
Students.xlsx is encrypted into Students.vault using Fernet (AES-compatible encryption).

### Layer 2: Secure Hashing (SHA256)
Login requires a verification hash computed from `SHA256(roll_no + salt)` instead of passwords.

---

## Layer 1: Data Encryption Setup

### How It Works

1. **Encryption Process:**
   - Students.xlsx is encrypted using Fernet (symmetric encryption)
   - Encrypted data is stored as Students.vault
   - Original file can be deleted after successful encryption
   - Encryption key is stored in `.env` file

2. **Decryption on Read:**
   - When app.py loads, it checks for Students.vault
   - If vault exists, data is decrypted into memory before pandas reads it
   - Decrypted data is never saved to disk (memory-only)
   - If vault missing, falls back to plaintext Students.xlsx (with warning)

### First-Time Setup

#### Option A: Auto-Generate Key (Recommended)

```bash
cd f:\edusync\Upgrade-main\backend
pip install cryptography
python security_utils.py
```

This will:
- Generate a new encryption key
- Display the key in console
- Show instruction to add it to `.env`

#### Option B: Manual Key Generation

```python
from cryptography.fernet import Fernet
key = Fernet.generate_key().decode()
print(key)  # Copy this key to .env ENCRYPTION_KEY field
```

Then add to `.env`:
```
ENCRYPTION_KEY=your-generated-key-here
```

### Encrypt Students File

Once key is in `.env`:

```bash
cd f:\edusync\Upgrade-main\backend
python -c "from security_utils import create_students_vault; create_students_vault()"
```

Or use it directly in Python:
```python
from security_utils import encrypt_file
encrypt_file("Students.xlsx", "Students.vault")
```

### Verify Encryption Works

```bash
# Check if vault was created
ls -la Students.vault

# Test decryption
cd f:\edusync\Upgrade-main\backend
python -c "from security_utils import read_encrypted_excel; df = read_encrypted_excel('Students.vault'); print(df.head())"
```

---

## Layer 2: Secure Hashing for Login

### How It Works

1. **Hash Generation:**
   - System generates SHA256(roll_no + salt)
   - Salt is stored in `.env` HASH_SALT variable
   - Default salt: "default-security-salt-2026" (you can customize)

2. **Login Flow:**
   - Student provides email (e.g., 22001@gmail.com)
   - Student provides verification_hash (obtained from endpoint)
   - System computes expected hash for that roll_no
   - Compares using constant-time comparison (HMAC) to prevent timing attacks
   - If match: login successful

### Get Verification Hash for Testing

**Endpoint:** `GET /api/student/{roll_no}/verification-hash`

Example:
```bash
curl http://localhost:8080/api/student/22001/verification-hash

Response:
{
  "success": true,
  "roll_no": "22001",
  "verification_hash": "a1b2c3d4e5f6...",
  "salt": "default-security-salt-2026",
  "message": "Use this hash in the verification_hash field when logging in"
}
```

### Login with Verification Hash

**Endpoint:** `POST /api/login`

```bash
curl -X POST http://localhost:8080/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "22001@gmail.com",
    "verification_hash": "a1b2c3d4e5f6..."
  }'

Response:
{
  "success": true,
  "message": "Login successful",
  "student_id": "22001",
  "student_name": "John Doe",
  "token": "token_22001_22001@gmail.com"
}
```

### Custom Salt Configuration

To use a custom salt instead of default:

1. Edit `.env`:
```
HASH_SALT=your-custom-salt-value
```

2. Regenerate hashes:
```bash
curl http://localhost:8080/api/student/22001/verification-hash
```

The new hash will use your custom salt.

---

## API Endpoints Reference

### Security Endpoints

#### 1. Get Verification Hash
```
GET /api/student/{roll_no}/verification-hash
```
Returns the SHA256 hash needed for login (for testing/setup only).

#### 2. Login with Hash
```
POST /api/login
Body: {
  "email": "roll_no@gmail.com",
  "verification_hash": "sha256_hash_here"
}
```
Authenticates student with email and verification hash.

---

## Data Flow Diagram

### Encryption Layer
```
Students.xlsx
    ↓
[encrypt_file()]
    ↓
Students.vault (encrypted)
    ↓
[app starts]
    ↓
[read_students_excel()]
    ↓
[read_encrypted_excel()]
    ↓
Decrypted bytes in memory
    ↓
Pandas DataFrame (never saved to disk)
```

### Hash Verification Layer
```
User provides email + hash
    ↓
[login endpoint]
    ↓
Extract roll_no from email
    ↓
generate_verification_hash(roll_no)
    ↓
Expected hash = SHA256(roll_no + HASH_SALT)
    ↓
Compare using hmac.compare_digest()
    ↓
If match: Login success ✓
If no match: Login failed ✗
```

---

## Safety & Backward Compatibility

### Why This Is Safe

1. **Decryption only to memory:** Decrypted data never touches disk
2. **Constant-time comparison:** Hash verification uses HMAC to prevent timing attacks
3. **Backward compatible:** Falls back to plaintext if vault missing
4. **MLkNN logic untouched:** Core ML functions work with both encrypted and plaintext data
5. **findthem() still works:** Updated to use read_students_file() wrapper

### Testing Core Functionality

All existing functions continue to work:

```python
# Generate data (works with encrypted data)
mlcode.generate_data("19CSE301")

# Train models (works with encrypted data)
mlcode.training_data("19CSE301")

# Find student recommendations (works with encrypted data)
mlcode.findthem(22001, "CSE A", "19CSE301")

# API endpoints
GET /api/student/22001/results  # Pulls from encrypted vault
GET /api/student/22001/recommendations  # Uses decrypted data
```

---

## Troubleshooting

### Issue: "ENCRYPTION_KEY is not set in .env"
**Solution:** Generate and add key to `.env`:
```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
# Copy output to .env ENCRYPTION_KEY=
```

### Issue: "Failed to decrypt vault"
**Solution:** Check key matches the one used to encrypt:
1. Verify `.env ENCRYPTION_KEY` value
2. Regenerate vault with current key: `create_students_vault()`
3. Check vault file exists: `ls -la Students.vault`

### Issue: "Invalid verification hash"
**Solution:** Get fresh hash from endpoint:
```bash
curl http://localhost:8080/api/student/22001/verification-hash
```

### Issue: "FileNotFoundError: Neither vault nor file found"
**Solution:** Ensure Students.xlsx exists at project root, then create vault:
```bash
cd backend
python -c "from security_utils import encrypt_file; encrypt_file('../Students.xlsx', '../Students.vault')"
```

---

## Security Best Practices

1. **Never commit .env to git:**
   - .env is in .gitignore
   - Always use environment variables for secrets

2. **Keep encryption key safe:**
   - Don't share ENCRYPTION_KEY
   - Rotate key periodically if needed
   - Store in secure vault in production

3. **Custom salt recommended:**
   - Don't use default salt in production
   - Generate random salt: `os.urandom(16).hex()`
   - Store in .env as HASH_SALT

4. **API key also protected:**
   - X-API-KEY header still required for protected endpoints
   - Verification hash is additional security layer

---

## File Changes Summary

### New Files
- `backend/security_utils.py` - Encryption and hashing utilities
- `.env` - Environment variables (add to .gitignore)
- `.env.example` - Template for security setup
- `SECURITY_IMPLEMENTATION.md` - This documentation

### Modified Files
- `backend/app.py` - Added decryption support, updated login endpoint
- `backend/requirements.txt` - Added cryptography library
- `mlcode.py` - Added read_students_file() with vault support

### Generated Files (on first run)
- `Students.vault` - Encrypted copy of Students.xlsx

---

## Production Deployment

For production deployment:

1. Generate strong encryption key (don't use default)
2. Generate strong hash salt (don't use default)
3. Store both in secure key management system (AWS KMS, HashiCorp Vault, etc.)
4. Encrypt Students.vault before deployment
5. Set environment variables in deployment platform
6. Monitor for failed login attempts (invalid hashes)

---

End of Security Implementation Guide
