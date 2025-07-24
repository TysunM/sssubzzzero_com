"""
SubZero Privacy and Security Manager
Handles data encryption, privacy controls, and secure data handling for subscription discovery.
"""

import os
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
import hashlib
from flask import current_app

class PrivacyManager:
    """Manages privacy and security for sensitive user data"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self._encryption_key = self._get_or_create_encryption_key()
        self._fernet = Fernet(self._encryption_key)
    
    def _get_or_create_encryption_key(self) -> bytes:
        """Get or create encryption key for data protection"""
        key_env = os.getenv('SUBZERO_ENCRYPTION_KEY')
        
        if key_env:
            return key_env.encode()
        
        # Generate key from app secret
        password = current_app.config.get('SECRET_KEY', 'subzero-default-key').encode()
        salt = b'subzero-salt-2024'  # In production, use random salt per user
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(password))
        return key
    
    def encrypt_sensitive_data(self, data: Any) -> str:
        """Encrypt sensitive data before storage"""
        try:
            if isinstance(data, dict):
                data_str = json.dumps(data)
            else:
                data_str = str(data)
            
            encrypted_data = self._fernet.encrypt(data_str.encode())
            return base64.urlsafe_b64encode(encrypted_data).decode()
            
        except Exception as e:
            self.logger.error(f"Failed to encrypt data: {e}")
            raise
    
    def decrypt_sensitive_data(self, encrypted_data: str) -> Any:
        """Decrypt sensitive data for use"""
        try:
            encrypted_bytes = base64.urlsafe_b64decode(encrypted_data.encode())
            decrypted_data = self._fernet.decrypt(encrypted_bytes)
            
            # Try to parse as JSON, fallback to string
            try:
                return json.loads(decrypted_data.decode())
            except json.JSONDecodeError:
                return decrypted_data.decode()
                
        except Exception as e:
            self.logger.error(f"Failed to decrypt data: {e}")
            raise
    
    def hash_user_identifier(self, user_id: str, data_type: str) -> str:
        """Create hashed identifier for user data"""
        combined = f"{user_id}:{data_type}:{datetime.now().strftime('%Y-%m-%d')}"
        return hashlib.sha256(combined.encode()).hexdigest()[:16]
    
    def sanitize_financial_data(self, transaction_data: Dict) -> Dict:
        """Sanitize financial data to remove sensitive information"""
        sanitized = transaction_data.copy()
        
        # Remove or mask sensitive fields
        sensitive_fields = [
            'account_number', 'routing_number', 'account_id',
            'transaction_id', 'authorization_code'
        ]
        
        for field in sensitive_fields:
            if field in sanitized:
                if field == 'account_number':
                    # Mask account number (show last 4 digits)
                    account_num = str(sanitized[field])
                    sanitized[field] = '*' * (len(account_num) - 4) + account_num[-4:]
                else:
                    del sanitized[field]
        
        # Keep only necessary transaction information
        allowed_fields = [
            'amount', 'date', 'merchant_name', 'category',
            'description', 'account_type'
        ]
        
        return {k: v for k, v in sanitized.items() if k in allowed_fields}
    
    def sanitize_email_data(self, email_data: Dict) -> Dict:
        """Sanitize email data to remove sensitive information"""
        sanitized = email_data.copy()
        
        # Remove sensitive email fields
        sensitive_fields = [
            'message_id', 'thread_id', 'full_headers',
            'raw_content', 'attachments'
        ]
        
        for field in sensitive_fields:
            if field in sanitized:
                del sanitized[field]
        
        # Mask email addresses
        if 'sender' in sanitized:
            sanitized['sender'] = self._mask_email(sanitized['sender'])
        
        # Keep only subscription-relevant content
        if 'body' in sanitized:
            sanitized['body'] = self._extract_subscription_content(sanitized['body'])
        
        return sanitized
    
    def _mask_email(self, email: str) -> str:
        """Mask email address for privacy"""
        if '@' not in email:
            return email
        
        local, domain = email.split('@', 1)
        if len(local) <= 2:
            masked_local = local
        else:
            masked_local = local[0] + '*' * (len(local) - 2) + local[-1]
        
        return f"{masked_local}@{domain}"
    
    def _extract_subscription_content(self, body: str) -> str:
        """Extract only subscription-relevant content from email body"""
        # Limit body content to subscription-relevant keywords
        subscription_keywords = [
            'subscription', 'billing', 'payment', 'charge', 'invoice',
            'receipt', 'renewal', 'trial', 'premium', 'plan', 'monthly',
            'annual', 'cancel', 'upgrade', 'amount', 'total', '$'
        ]
        
        lines = body.split('\n')
        relevant_lines = []
        
        for line in lines:
            line_lower = line.lower()
            if any(keyword in line_lower for keyword in subscription_keywords):
                # Limit line length and remove potential sensitive info
                clean_line = line[:200]  # Limit length
                relevant_lines.append(clean_line)
        
        return '\n'.join(relevant_lines[:10])  # Limit to 10 relevant lines
    
    def create_privacy_audit_log(self, user_id: str, action: str, data_type: str, details: Dict = None) -> Dict:
        """Create audit log entry for privacy compliance"""
        log_entry = {
            'user_id': user_id,
            'action': action,
            'data_type': data_type,
            'timestamp': datetime.utcnow().isoformat(),
            'details': details or {},
            'ip_hash': self._get_request_ip_hash(),
            'session_id': self._get_session_hash()
        }
        
        # Log to secure audit system
        self.logger.info(f"Privacy audit: {action} for user {user_id}", extra=log_entry)
        
        return log_entry
    
    def _get_request_ip_hash(self) -> str:
        """Get hashed IP address for audit logging"""
        try:
            from flask import request
            ip = request.remote_addr or 'unknown'
            return hashlib.sha256(ip.encode()).hexdigest()[:16]
        except:
            return 'unknown'
    
    def _get_session_hash(self) -> str:
        """Get hashed session identifier"""
        try:
            from flask import session
            session_id = session.get('session_id', 'unknown')
            return hashlib.sha256(str(session_id).encode()).hexdigest()[:16]
        except:
            return 'unknown'
    
    def validate_data_retention(self, data_timestamp: datetime, data_type: str) -> bool:
        """Validate if data should be retained based on privacy policy"""
        retention_periods = {
            'bank_transactions': timedelta(days=90),  # 3 months
            'email_content': timedelta(days=30),      # 1 month
            'discovery_results': timedelta(days=365), # 1 year
            'audit_logs': timedelta(days=2555),       # 7 years (compliance)
        }
        
        retention_period = retention_periods.get(data_type, timedelta(days=30))
        return datetime.utcnow() - data_timestamp <= retention_period
    
    def schedule_data_cleanup(self, user_id: str) -> Dict:
        """Schedule cleanup of expired user data"""
        cleanup_tasks = []
        
        # This would integrate with a task queue in production
        cleanup_tasks.append({
            'task': 'cleanup_expired_bank_data',
            'user_id': user_id,
            'scheduled_for': datetime.utcnow() + timedelta(hours=1)
        })
        
        cleanup_tasks.append({
            'task': 'cleanup_expired_email_data',
            'user_id': user_id,
            'scheduled_for': datetime.utcnow() + timedelta(hours=1)
        })
        
        self.logger.info(f"Scheduled {len(cleanup_tasks)} cleanup tasks for user {user_id}")
        
        return {
            'scheduled_tasks': len(cleanup_tasks),
            'next_cleanup': min(task['scheduled_for'] for task in cleanup_tasks).isoformat()
        }
    
    def get_user_privacy_settings(self, user_id: str) -> Dict:
        """Get user's privacy preferences"""
        # In production, this would fetch from database
        default_settings = {
            'data_retention_days': 90,
            'allow_email_scanning': True,
            'allow_bank_analysis': True,
            'share_anonymized_insights': False,
            'auto_delete_discovery_data': True,
            'notification_preferences': {
                'data_processing': True,
                'privacy_updates': True,
                'security_alerts': True
            }
        }
        
        return default_settings
    
    def update_user_privacy_settings(self, user_id: str, settings: Dict) -> Dict:
        """Update user's privacy preferences"""
        # Validate settings
        allowed_settings = [
            'data_retention_days', 'allow_email_scanning', 'allow_bank_analysis',
            'share_anonymized_insights', 'auto_delete_discovery_data',
            'notification_preferences'
        ]
        
        validated_settings = {k: v for k, v in settings.items() if k in allowed_settings}
        
        # Audit log
        self.create_privacy_audit_log(
            user_id, 
            'privacy_settings_updated', 
            'user_preferences',
            {'updated_settings': list(validated_settings.keys())}
        )
        
        # In production, save to database
        self.logger.info(f"Updated privacy settings for user {user_id}")
        
        return validated_settings
    
    def generate_privacy_report(self, user_id: str) -> Dict:
        """Generate privacy report for user"""
        return {
            'user_id': user_id,
            'report_generated': datetime.utcnow().isoformat(),
            'data_categories': {
                'bank_transactions': {
                    'collected': True,
                    'retention_period': '90 days',
                    'encryption': 'AES-256',
                    'purpose': 'Subscription discovery and analysis'
                },
                'email_content': {
                    'collected': True,
                    'retention_period': '30 days',
                    'encryption': 'AES-256',
                    'purpose': 'Subscription receipt analysis'
                },
                'subscription_data': {
                    'collected': True,
                    'retention_period': '1 year',
                    'encryption': 'AES-256',
                    'purpose': 'Service provision and insights'
                }
            },
            'third_party_sharing': {
                'plaid': {
                    'purpose': 'Bank account connection',
                    'data_shared': 'Transaction data (encrypted)',
                    'retention': 'Per Plaid policy'
                },
                'google': {
                    'purpose': 'Email access',
                    'data_shared': 'Email content (read-only)',
                    'retention': 'Not stored by Google for this purpose'
                }
            },
            'user_rights': [
                'Access your data',
                'Correct inaccurate data',
                'Delete your data',
                'Export your data',
                'Restrict processing',
                'Object to processing'
            ],
            'contact_info': {
                'privacy_officer': 'privacy@subzero.com',
                'data_protection': 'dpo@subzero.com'
            }
        }

# Global privacy manager instance
privacy_manager = PrivacyManager()

