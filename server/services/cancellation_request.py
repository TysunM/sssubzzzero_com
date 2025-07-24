from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import uuid
from src.models.user import db

class CancellationRequest(db.Model):
    __tablename__ = 'cancellation_requests'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    subscription_id = db.Column(db.String(36), db.ForeignKey('subscriptions.id'), nullable=False)
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    request_type = db.Column(db.String(20), nullable=False)  # immediate, end_of_cycle, scheduled
    status = db.Column(db.String(20), default='pending')  # pending, in_progress, completed, failed
    method_used = db.Column(db.String(50))  # api, web_automation, phone, email, manual
    initiated_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)
    confirmation_number = db.Column(db.String(100))
    notes = db.Column(db.Text)
    retry_count = db.Column(db.Integer, default=0)
    last_retry_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('cancellation_requests', lazy=True))
    
    def __repr__(self):
        return f'<CancellationRequest {self.id} - {self.status}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'subscription_id': self.subscription_id,
            'user_id': self.user_id,
            'request_type': self.request_type,
            'status': self.status,
            'method_used': self.method_used,
            'initiated_at': self.initiated_at.isoformat(),
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'confirmation_number': self.confirmation_number,
            'notes': self.notes,
            'retry_count': self.retry_count,
            'last_retry_at': self.last_retry_at.isoformat() if self.last_retry_at else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
    
    def can_retry(self):
        """Check if this cancellation request can be retried"""
        return self.status == 'failed' and self.retry_count < 3
    
    def mark_completed(self, confirmation_number=None, notes=None):
        """Mark the cancellation request as completed"""
        self.status = 'completed'
        self.completed_at = datetime.utcnow()
        if confirmation_number:
            self.confirmation_number = confirmation_number
        if notes:
            self.notes = notes
        self.updated_at = datetime.utcnow()
    
    def mark_failed(self, notes=None):
        """Mark the cancellation request as failed"""
        self.status = 'failed'
        self.retry_count += 1
        self.last_retry_at = datetime.utcnow()
        if notes:
            self.notes = notes
        self.updated_at = datetime.utcnow()
    
    def get_status_color(self):
        """Get color code for status display"""
        status_colors = {
            'pending': '#f59e0b',      # orange
            'in_progress': '#3b82f6',  # blue
            'completed': '#10b981',    # green
            'failed': '#ef4444'        # red
        }
        return status_colors.get(self.status, '#6b7280')  # gray default

