from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import uuid
from src.models.user import db

class FinancialAccount(db.Model):
    __tablename__ = 'financial_accounts'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    institution_id = db.Column(db.String(100), nullable=False)
    account_id = db.Column(db.String(100), nullable=False)
    account_type = db.Column(db.String(50), nullable=False)
    account_name = db.Column(db.String(255))
    account_mask = db.Column(db.String(10))
    balance_current = db.Column(db.Numeric(12, 2))
    balance_available = db.Column(db.Numeric(12, 2))
    currency = db.Column(db.String(3), default='USD')
    plaid_access_token = db.Column(db.Text)
    plaid_item_id = db.Column(db.String(100))
    last_sync = db.Column(db.DateTime)
    sync_status = db.Column(db.String(20), default='active')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('financial_accounts', lazy=True))
    transactions = db.relationship('Transaction', backref='account', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<FinancialAccount {self.account_name} - {self.account_mask}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'institution_id': self.institution_id,
            'account_id': self.account_id,
            'account_type': self.account_type,
            'account_name': self.account_name,
            'account_mask': self.account_mask,
            'balance_current': float(self.balance_current) if self.balance_current else None,
            'balance_available': float(self.balance_available) if self.balance_available else None,
            'currency': self.currency,
            'last_sync': self.last_sync.isoformat() if self.last_sync else None,
            'sync_status': self.sync_status,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
    
    def to_dict_secure(self):
        """Returns account info without sensitive data like tokens"""
        return {
            'id': self.id,
            'account_type': self.account_type,
            'account_name': self.account_name,
            'account_mask': self.account_mask,
            'balance_current': float(self.balance_current) if self.balance_current else None,
            'balance_available': float(self.balance_available) if self.balance_available else None,
            'currency': self.currency,
            'last_sync': self.last_sync.isoformat() if self.last_sync else None,
            'sync_status': self.sync_status
        }

