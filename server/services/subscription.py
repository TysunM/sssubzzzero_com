from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, date, timedelta
import uuid
from src.models.user import db

class Subscription(db.Model):
    __tablename__ = 'subscriptions'
    __table_args__ = {'extend_existing': True}
    __tablename__ = 'subscriptions'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    account_id = db.Column(db.String(36), db.ForeignKey('financial_accounts.id'))
    merchant_name = db.Column(db.String(255), nullable=False)
    service_name = db.Column(db.String(255))
    category = db.Column(db.String(100))
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    currency = db.Column(db.String(3), default='USD')
    billing_cycle = db.Column(db.String(20), nullable=False)  # monthly, annual, weekly
    next_billing_date = db.Column(db.Date)
    last_billing_date = db.Column(db.Date)
    status = db.Column(db.String(20), default='active')  # active, cancelled, paused
    detection_confidence = db.Column(db.Numeric(3, 2), default=0.95)
    cancellation_method = db.Column(db.String(50))  # api, web, phone, email
    cancellation_url = db.Column(db.Text)
    cancellation_phone = db.Column(db.String(20))
    cancellation_email = db.Column(db.String(255))
    auto_cancel_enabled = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    detected_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('subscriptions', lazy=True))
    account = db.relationship('FinancialAccount', backref=db.backref('subscriptions', lazy=True))
    cancellation_requests = db.relationship('CancellationRequest', backref='subscription', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Subscription {self.service_name or self.merchant_name} - ${self.amount}/{self.billing_cycle}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'account_id': self.account_id,
            'merchant_name': self.merchant_name,
            'service_name': self.service_name,
            'category': self.category,
            'amount': float(self.amount),
            'currency': self.currency,
            'billing_cycle': self.billing_cycle,
            'next_billing_date': self.next_billing_date.isoformat() if self.next_billing_date else None,
            'last_billing_date': self.last_billing_date.isoformat() if self.last_billing_date else None,
            'status': self.status,
            'detection_confidence': float(self.detection_confidence),
            'cancellation_method': self.cancellation_method,
            'cancellation_url': self.cancellation_url,
            'cancellation_phone': self.cancellation_phone,
            'cancellation_email': self.cancellation_email,
            'auto_cancel_enabled': self.auto_cancel_enabled,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'detected_at': self.detected_at.isoformat()
        }
    
    def calculate_annual_cost(self):
        """Calculate the annual cost of this subscription"""
        amount = float(self.amount)
        
        if self.billing_cycle == 'monthly':
            return amount * 12
        elif self.billing_cycle == 'annual':
            return amount
        elif self.billing_cycle == 'weekly':
            return amount * 52
        elif self.billing_cycle == 'quarterly':
            return amount * 4
        else:
            return amount * 12  # Default to monthly
    
    def get_next_billing_date(self):
        """Calculate next billing date based on last billing date and cycle"""
        if not self.last_billing_date:
            return None
            
        if self.billing_cycle == 'monthly':
            return self.last_billing_date + timedelta(days=30)
        elif self.billing_cycle == 'annual':
            return self.last_billing_date + timedelta(days=365)
        elif self.billing_cycle == 'weekly':
            return self.last_billing_date + timedelta(days=7)
        elif self.billing_cycle == 'quarterly':
            return self.last_billing_date + timedelta(days=90)
        else:
            return self.last_billing_date + timedelta(days=30)
    
    def is_cancellable(self):
        """Check if this subscription can be cancelled automatically"""
        return self.cancellation_method in ['api', 'web'] and (
            self.cancellation_url or self.cancellation_method == 'api'
        )
    
    def get_category_icon(self):
        """Get icon name for subscription category"""
        category_icons = {
            'entertainment': 'play-circle',
            'productivity': 'briefcase',
            'education': 'book',
            'fitness': 'activity',
            'music': 'music',
            'news': 'newspaper',
            'cloud_storage': 'cloud',
            'software': 'code',
            'gaming': 'gamepad',
            'shopping': 'shopping-cart'
        }
        return category_icons.get(self.category, 'credit-card')

