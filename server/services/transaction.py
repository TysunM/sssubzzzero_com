from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, date
import uuid
from src.models.user import db

class Transaction(db.Model):
    __tablename__ = 'transactions'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    account_id = db.Column(db.String(36), db.ForeignKey('financial_accounts.id'), nullable=False)
    transaction_id = db.Column(db.String(100), unique=True, nullable=False)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    currency = db.Column(db.String(3), default='USD')
    description = db.Column(db.Text)
    merchant_name = db.Column(db.String(255))
    category = db.Column(db.String(100))
    subcategory = db.Column(db.String(100))
    transaction_date = db.Column(db.Date, nullable=False)
    authorized_date = db.Column(db.Date)
    posted_date = db.Column(db.Date)
    transaction_type = db.Column(db.String(20), nullable=False)
    pending = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<Transaction {self.merchant_name} - ${self.amount}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'account_id': self.account_id,
            'transaction_id': self.transaction_id,
            'amount': float(self.amount),
            'currency': self.currency,
            'description': self.description,
            'merchant_name': self.merchant_name,
            'category': self.category,
            'subcategory': self.subcategory,
            'transaction_date': self.transaction_date.isoformat() if self.transaction_date else None,
            'authorized_date': self.authorized_date.isoformat() if self.authorized_date else None,
            'posted_date': self.posted_date.isoformat() if self.posted_date else None,
            'transaction_type': self.transaction_type,
            'pending': self.pending,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
    
    def is_recurring(self):
        """Check if this transaction appears to be part of a recurring subscription"""
        # This is a simplified check - in production, this would use ML algorithms
        if not self.merchant_name:
            return False
            
        recurring_keywords = [
            'netflix', 'spotify', 'adobe', 'microsoft', 'apple', 'amazon prime',
            'hulu', 'disney', 'subscription', 'monthly', 'annual', 'recurring'
        ]
        
        merchant_lower = self.merchant_name.lower()
        return any(keyword in merchant_lower for keyword in recurring_keywords)
    
    def get_billing_cycle(self):
        """Estimate billing cycle based on amount and merchant"""
        # Simplified logic - production would use historical data analysis
        amount = float(self.amount)
        
        if amount < 20:
            return 'monthly'
        elif amount > 100:
            return 'annual'
        else:
            return 'monthly'

