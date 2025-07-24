"""
SubZero Subscription Discovery API Routes
Handles the "Find Subscriptions" feature using secure aggregation methods.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import asyncio
import logging
from datetime import datetime
from typing import List, Dict

from subscription_discovery_service import SubscriptionDiscoveryService, DetectedSubscription
from financial_account import FinancialAccount
from subscription import Subscription
from user import db

# Create blueprint
subscription_discovery_bp = Blueprint('subscription_discovery', __name__)

# Initialize service
discovery_service = SubscriptionDiscoveryService()
logger = logging.getLogger(__name__)

@subscription_discovery_bp.route('/discover-subscriptions', methods=['POST'])
@jwt_required()
def discover_subscriptions():
    """
    Main endpoint for discovering subscriptions using aggregation methods.
    Triggered by the "Find Subscriptions" button in the frontend.
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # Get user preferences for discovery sources
        enable_bank_discovery = data.get('enable_bank_discovery', True)
        enable_email_discovery = data.get('enable_email_discovery', True)
        
        if not enable_bank_discovery and not enable_email_discovery:
            return jsonify({
                'error': 'At least one discovery method must be enabled'
            }), 400
        
        # Initialize results
        bank_subscriptions = []
        email_subscriptions = []
        
        # Discover from bank accounts if enabled
        if enable_bank_discovery:
            bank_subscriptions = asyncio.run(
                _discover_from_bank_accounts(user_id)
            )
        
        # Discover from email if enabled
        if enable_email_discovery:
            email_credentials = data.get('email_credentials')
            if email_credentials:
                email_subscriptions = asyncio.run(
                    discovery_service.discover_subscriptions_from_email(
                        user_id, email_credentials
                    )
                )
        
        # Merge and deduplicate results
        merged_subscriptions = asyncio.run(
            discovery_service.merge_detected_subscriptions(
                bank_subscriptions, email_subscriptions
            )
        )
        
        # Convert to response format
        discovered_subscriptions = [
            _subscription_to_dict(sub) for sub in merged_subscriptions
        ]
        
        # Log discovery results
        logger.info(f"Discovered {len(discovered_subscriptions)} subscriptions for user {user_id}")
        
        return jsonify({
            'success': True,
            'discovered_subscriptions': discovered_subscriptions,
            'summary': {
                'total_found': len(discovered_subscriptions),
                'bank_sources': len(bank_subscriptions),
                'email_sources': len(email_subscriptions),
                'high_confidence': len([s for s in merged_subscriptions if s.confidence_score > 0.8]),
                'estimated_monthly_cost': sum(
                    float(s.amount) for s in merged_subscriptions 
                    if s.billing_cycle == 'monthly'
                ) + sum(
                    float(s.amount) / 12 for s in merged_subscriptions 
                    if s.billing_cycle == 'annual'
                )
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error in subscription discovery: {e}")
        return jsonify({
            'error': 'Failed to discover subscriptions',
            'details': str(e)
        }), 500

@subscription_discovery_bp.route('/connect-bank-account', methods=['POST'])
@jwt_required()
def connect_bank_account():
    """
    Connect a bank account using Plaid Link for subscription discovery.
    This endpoint handles the secure OAuth flow for bank account aggregation.
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        public_token = data.get('public_token')
        institution_id = data.get('institution_id')
        account_ids = data.get('account_ids', [])
        
        if not public_token:
            return jsonify({'error': 'Public token is required'}), 400
        
        # Exchange public token for access token using Plaid
        access_token = _exchange_public_token(public_token)
        
        if not access_token:
            return jsonify({'error': 'Failed to connect bank account'}), 500
        
        # Store financial account information
        financial_account = FinancialAccount(
            user_id=user_id,
            institution_id=institution_id,
            plaid_access_token=access_token,
            sync_status='active',
            last_sync=datetime.utcnow()
        )
        
        db.session.add(financial_account)
        db.session.commit()
        
        logger.info(f"Connected bank account for user {user_id}")
        
        return jsonify({
            'success': True,
            'account_id': financial_account.id,
            'message': 'Bank account connected successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Error connecting bank account: {e}")
        return jsonify({
            'error': 'Failed to connect bank account',
            'details': str(e)
        }), 500

@subscription_discovery_bp.route('/connect-email', methods=['POST'])
@jwt_required()
def connect_email():
    """
    Connect email account using OAuth for subscription discovery.
    This endpoint handles the Gmail OAuth flow for email aggregation.
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        authorization_code = data.get('authorization_code')
        
        if not authorization_code:
            return jsonify({'error': 'Authorization code is required'}), 400
        
        # Exchange authorization code for access token
        email_credentials = _exchange_email_authorization_code(authorization_code)
        
        if not email_credentials:
            return jsonify({'error': 'Failed to connect email account'}), 500
        
        # Store email credentials securely (encrypted)
        # In production, this would be encrypted and stored securely
        _store_email_credentials(user_id, email_credentials)
        
        logger.info(f"Connected email account for user {user_id}")
        
        return jsonify({
            'success': True,
            'message': 'Email account connected successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Error connecting email account: {e}")
        return jsonify({
            'error': 'Failed to connect email account',
            'details': str(e)
        }), 500

@subscription_discovery_bp.route('/save-discovered-subscription', methods=['POST'])
@jwt_required()
def save_discovered_subscription():
    """
    Save a discovered subscription to the user's subscription list.
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['merchant_name', 'amount', 'billing_cycle']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Create new subscription
        subscription = Subscription(
            user_id=user_id,
            merchant_name=data['merchant_name'],
            service_name=data.get('service_name'),
            category=data.get('category', 'unknown'),
            amount=data['amount'],
            billing_cycle=data['billing_cycle'],
            status='active',
            detection_confidence=data.get('confidence_score', 0.95),
            cancellation_method=data.get('cancellation_info', {}).get('method'),
            cancellation_url=data.get('cancellation_info', {}).get('url'),
            detected_at=datetime.utcnow()
        )
        
        # Set next billing date if provided
        if data.get('next_billing_date'):
            subscription.next_billing_date = datetime.fromisoformat(
                data['next_billing_date']
            ).date()
        
        db.session.add(subscription)
        db.session.commit()
        
        logger.info(f"Saved discovered subscription {subscription.id} for user {user_id}")
        
        return jsonify({
            'success': True,
            'subscription_id': subscription.id,
            'message': 'Subscription saved successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Error saving discovered subscription: {e}")
        return jsonify({
            'error': 'Failed to save subscription',
            'details': str(e)
        }), 500

@subscription_discovery_bp.route('/discovery-status', methods=['GET'])
@jwt_required()
def get_discovery_status():
    """
    Get the current status of connected accounts for subscription discovery.
    """
    try:
        user_id = get_jwt_identity()
        
        # Check connected bank accounts
        bank_accounts = FinancialAccount.query.filter_by(
            user_id=user_id,
            sync_status='active'
        ).all()
        
        # Check email connection status
        email_connected = _check_email_connection(user_id)
        
        return jsonify({
            'success': True,
            'status': {
                'bank_accounts_connected': len(bank_accounts),
                'email_connected': email_connected,
                'ready_for_discovery': len(bank_accounts) > 0 or email_connected
            },
            'connected_accounts': [
                {
                    'id': account.id,
                    'institution_id': account.institution_id,
                    'account_name': account.account_name,
                    'last_sync': account.last_sync.isoformat() if account.last_sync else None
                }
                for account in bank_accounts
            ]
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting discovery status: {e}")
        return jsonify({
            'error': 'Failed to get discovery status',
            'details': str(e)
        }), 500

@subscription_discovery_bp.route('/disconnect-account', methods=['POST'])
@jwt_required()
def disconnect_account():
    """
    Disconnect a connected account and delete associated data.
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        account_type = data.get('account_type')  # 'bank' or 'email'
        account_id = data.get('account_id')
        
        if account_type == 'bank' and account_id:
            # Remove bank account
            account = FinancialAccount.query.filter_by(
                id=account_id,
                user_id=user_id
            ).first()
            
            if account:
                db.session.delete(account)
                db.session.commit()
                
        elif account_type == 'email':
            # Remove email credentials
            _remove_email_credentials(user_id)
        
        logger.info(f"Disconnected {account_type} account for user {user_id}")
        
        return jsonify({
            'success': True,
            'message': f'{account_type.title()} account disconnected successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Error disconnecting account: {e}")
        return jsonify({
            'error': 'Failed to disconnect account',
            'details': str(e)
        }), 500

# Helper functions

async def _discover_from_bank_accounts(user_id: str) -> List[DetectedSubscription]:
    """Discover subscriptions from user's connected bank accounts"""
    try:
        # Get user's financial accounts
        accounts = FinancialAccount.query.filter_by(
            user_id=user_id,
            sync_status='active'
        ).all()
        
        if not accounts:
            return []
        
        # Extract access tokens
        access_tokens = [
            account.plaid_access_token for account in accounts 
            if account.plaid_access_token
        ]
        
        if not access_tokens:
            return []
        
        # Discover subscriptions using the service
        return await discovery_service.discover_subscriptions_from_bank(
            user_id, access_tokens
        )
        
    except Exception as e:
        logger.error(f"Error discovering from bank accounts: {e}")
        return []

def _exchange_public_token(public_token: str) -> str:
    """Exchange Plaid public token for access token"""
    try:
        # This would use the actual Plaid API in production
        # For now, return a mock access token
        return f"access-token-{public_token[-10:]}"
    except Exception as e:
        logger.error(f"Error exchanging public token: {e}")
        return None

def _exchange_email_authorization_code(auth_code: str) -> Dict:
    """Exchange Gmail authorization code for access credentials"""
    try:
        # This would use the actual Gmail OAuth flow in production
        # For now, return mock credentials
        return {
            'access_token': f"gmail-access-{auth_code[-10:]}",
            'refresh_token': f"gmail-refresh-{auth_code[-10:]}",
            'expires_in': 3600
        }
    except Exception as e:
        logger.error(f"Error exchanging email authorization code: {e}")
        return None

def _store_email_credentials(user_id: str, credentials: Dict):
    """Store email credentials securely (encrypted in production)"""
    # In production, this would encrypt and store credentials securely
    # For now, we'll use a simple in-memory store
    if not hasattr(_store_email_credentials, 'credentials_store'):
        _store_email_credentials.credentials_store = {}
    
    _store_email_credentials.credentials_store[user_id] = credentials

def _check_email_connection(user_id: str) -> bool:
    """Check if user has connected email account"""
    if hasattr(_store_email_credentials, 'credentials_store'):
        return user_id in _store_email_credentials.credentials_store
    return False

def _remove_email_credentials(user_id: str):
    """Remove stored email credentials"""
    if hasattr(_store_email_credentials, 'credentials_store'):
        _store_email_credentials.credentials_store.pop(user_id, None)

def _subscription_to_dict(subscription: DetectedSubscription) -> Dict:
    """Convert DetectedSubscription to dictionary for API response"""
    return {
        'merchant_name': subscription.merchant_name,
        'service_name': subscription.service_name,
        'amount': float(subscription.amount),
        'billing_cycle': subscription.billing_cycle,
        'category': subscription.category,
        'confidence_score': subscription.confidence_score,
        'detection_source': subscription.detection_source,
        'last_transaction_date': subscription.last_transaction_date.isoformat() if subscription.last_transaction_date else None,
        'next_billing_date': subscription.next_billing_date.isoformat() if subscription.next_billing_date else None,
        'cancellation_info': subscription.cancellation_info
    }

