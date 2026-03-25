"""
Security utilities for data encryption/decryption and hashing
Layer 1: Data Encryption (AES via Fernet)
Layer 2: Secure Hashing (SHA256)
"""

import os
import hashlib
import io
from cryptography.fernet import Fernet
from dotenv import load_dotenv
import pandas as pd

# Load environment variables
load_dotenv()

# ==================== LAYER 1: DATA ENCRYPTION ====================

def get_or_create_encryption_key():
    """
    Get encryption key from .env or create a new one.
    The key is stored in ENCRYPTION_KEY environment variable.
    """
    encryption_key = os.getenv("ENCRYPTION_KEY")
    
    if not encryption_key:
        # Generate a new key
        encryption_key = Fernet.generate_key().decode()
        print(f"⚠️  NEW ENCRYPTION KEY GENERATED: {encryption_key}")
        print("⚠️  ADD THIS TO YOUR .env FILE: ENCRYPTION_KEY={}".format(encryption_key))
    
    return encryption_key.encode() if isinstance(encryption_key, str) else encryption_key


def encrypt_file(input_path: str, output_path: str, key: bytes = None):
    """
    Encrypt an Excel file using Fernet (AES).
    
    Args:
        input_path: Path to original file (e.g., Students.xlsx)
        output_path: Path to encrypted vault file (e.g., Students.vault)
        key: Encryption key (optional, fetches from .env if not provided)
    """
    if key is None:
        key = get_or_create_encryption_key()
    
    cipher = Fernet(key)
    
    # Read the file
    with open(input_path, 'rb') as f:
        data = f.read()
    
    # Encrypt
    encrypted_data = cipher.encrypt(data)
    
    # Write encrypted data
    with open(output_path, 'wb') as f:
        f.write(encrypted_data)
    
    print(f"✓ File encrypted: {input_path} → {output_path}")


def decrypt_file_to_bytes(encrypted_path: str, key: bytes = None) -> bytes:
    """
    Decrypt a vault file and return raw bytes.
    
    Args:
        encrypted_path: Path to encrypted vault file
        key: Encryption key (optional, fetches from .env if not provided)
    
    Returns:
        Decrypted file bytes
    """
    if key is None:
        key = get_or_create_encryption_key()
    
    cipher = Fernet(key)
    
    # Read encrypted data
    with open(encrypted_path, 'rb') as f:
        encrypted_data = f.read()
    
    # Decrypt
    decrypted_data = cipher.decrypt(encrypted_data)
    
    return decrypted_data


def read_encrypted_excel(encrypted_path: str, sheet_name=None, key: bytes = None):
    """
    Read an encrypted Excel file directly into a Pandas DataFrame.
    
    Args:
        encrypted_path: Path to encrypted vault file
        sheet_name: Sheet name to read (optional)
        key: Encryption key (optional, fetches from .env if not provided)
    
    Returns:
        Pandas DataFrame
    """
    # Decrypt to bytes
    decrypted_data = decrypt_file_to_bytes(encrypted_path, key)
    
    # Read from BytesIO
    excel_file = io.BytesIO(decrypted_data)
    df = pd.read_excel(excel_file, sheet_name=sheet_name)
    
    return df


# ==================== LAYER 2: SECURE HASHING ====================

def generate_verification_hash(roll_no: str, salt: str = None) -> dict:
    """
    Generate SHA256 hash for verification.
    
    Args:
        roll_no: Student roll number
        salt: Optional salt (if not provided, uses HASH_SALT from .env)
    
    Returns:
        dict with 'hash' and 'salt' keys
    """
    if salt is None:
        salt = os.getenv("HASH_SALT", "default-security-salt-2026")
    
    # Combine roll_no + salt
    to_hash = f"{roll_no}{salt}"
    
    # Generate SHA256 hash
    hash_value = hashlib.sha256(to_hash.encode()).hexdigest()
    
    return {
        "hash": hash_value,
        "salt": salt
    }


def verify_hash(roll_no: str, provided_hash: str, salt: str = None) -> bool:
    """
    Verify if provided hash matches the expected hash for a roll number.
    
    Args:
        roll_no: Student roll number
        provided_hash: Hash provided by user
        salt: Salt used (optional, uses HASH_SALT from .env if not provided)
    
    Returns:
        Boolean indicating if hash is valid
    """
    if salt is None:
        salt = os.getenv("HASH_SALT", "default-security-salt-2026")
    
    # Generate expected hash
    expected = generate_verification_hash(roll_no, salt)
    
    # Compare hashes (using constant-time comparison to prevent timing attacks)
    import hmac
    return hmac.compare_digest(expected["hash"], provided_hash)


def get_hash_for_display(roll_no: str, salt: str = None) -> str:
    """
    Generate the hash that a user should provide during login.
    This is for backend use to show what hash to expect.
    
    Args:
        roll_no: Student roll number
        salt: Optional salt
    
    Returns:
        SHA256 hash string
    """
    result = generate_verification_hash(roll_no, salt)
    return result["hash"]


# ==================== UTILITY ====================

def create_students_vault():
    """
    Helper function to create Students.vault from Students.xlsx
    (One-time setup task)
    """
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    students_xlsx = os.path.join(base_dir, "Students.xlsx")
    students_vault = os.path.join(base_dir, "Students.vault")
    
    if os.path.exists(students_vault):
        print("✓ Students.vault already exists")
        return
    
    if not os.path.exists(students_xlsx):
        print("✗ Students.xlsx not found!")
        return
    
    encrypt_file(students_xlsx, students_vault)
    print("✓ Students.vault created successfully")


if __name__ == "__main__":
    # Test encryption
    print("=== DATA ENCRYPTION TEST ===")
    key = get_or_create_encryption_key()
    print(f"Encryption key: {key[:20]}...")
    
    print("\n=== SECURE HASHING TEST ===")
    test_roll = "22001"
    hash_result = generate_verification_hash(test_roll)
    print(f"Roll No: {test_roll}")
    print(f"Generated Hash: {hash_result['hash']}")
    print(f"Salt: {hash_result['salt']}")
    
    # Verify hash
    is_valid = verify_hash(test_roll, hash_result['hash'])
    print(f"Hash verification: {is_valid}")
