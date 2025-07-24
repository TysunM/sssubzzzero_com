from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from src.models.user import User, db
from src.models.financial_account import FinancialAccount
from src.models.transaction import Transaction
from src.models.subscription import Subscription
import uuid

financial_accounts_bp = Blueprint('financial_accounts', __name__)

@financial_accounts_bp.route('/accounts', methods=['GET'])
@jwt_required()
def get_accounts():
    """Get all financial accounts for the current user"""
    try:
        user_id = get_jwt_identity()
        accounts = FinancialAccount.query.filter_by(user_id=user_id).all()
        
        return jsonify({
            'accounts': [account.to_dict_secure() for account in accounts],
            'total_count': len(accounts)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@financial_accounts_bp.route('/accounts/link', methods=['POST'])
@jwt_required()
def link_account():
    """Link a new financial account (simulated Plaid integration)"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['institution_id', 'account_type', 'account_name']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # In a real implementation, this would use Plaid's Link flow
        # For demo purposes, we'll create a simulated account
        account = FinancialAccount(
            user_id=user_id,
            institution_id=data['institution_id'],
            account_id=f"acc_{uuid.uuid4().hex[:8]}",
            account_type=data['account_type'],
            account_name=data['account_name'],
            account_mask=data.get('account_mask', '****1234'),
            balance_current=data.get('balance_current', 2500.00),
            balance_available=data.get('balance_available', 2300.00),
            currency=data.get('currency', 'USD'),
            plaid_access_token=f"access_token_{uuid.uuid4().hex}",
            plaid_item_id=f"item_{uuid.uuid4().hex[:8]}",
            last_sync=datetime.utcnow(),
            sync_status='active'
        )
        
        db.session.add(account)
        db.session.commit()
        
        # Simulate initial transaction sync
        _simulate_initial_transactions(account.id)
        
        return jsonify({
            'message': 'Account linked successfully',
            'account': account.to_dict_secure()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@financial_accounts_bp.route('/accounts/<account_id>', methods=['GET'])
@jwt_required()
def get_account(account_id):
    """Get a specific financial account"""
    try:
        user_id = get_jwt_identity()
        account = FinancialAccount.query.filter_by(
            id=account_id, 
            user_id=user_id
        ).first()
        
        if not account:
            return jsonify({'error': 'Account not found'}), 404
        
        return jsonify({'account': account.to_dict_secure()}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@financial_accounts_bp.route('/accounts/<account_id>', methods=['PUT'])
@jwt_required()
def update_account(account_id):
    """Update a financial account"""
    try:
        user_id = get_jwt_identity()
        account = FinancialAccount.query.filter_by(
            id=account_id, 
            user_id=user_id
        ).first()
        
        if not account:
            return jsonify({'error': 'Account not found'}), 404
        
        data = request.get_json()
        
        # Update allowed fields
        if 'account_name' in data:
            account.account_name = data['account_name']
        if 'sync_status' in data:
            account.sync_status = data['sync_status']
        
        account.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': 'Account updated successfully',
            'account': account.to_dict_secure()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@financial_accounts_bp.route('/accounts/<account_id>', methods=['DELETE'])
@jwt_required()
def delete_account(account_id):
    """Delete a financial account"""
    try:
        user_id = get_jwt_identity()
        account = FinancialAccount.query.filter_by(
            id=account_id, 
            user_id=user_id
        ).first()
        
        if not account:
            return jsonify({'error': 'Account not found'}), 404
        
        # Delete associated transactions and subscriptions
        Transaction.query.filter_by(account_id=account_id).delete()
        Subscription.query.filter_by(account_id=account_id).update({'account_id': None})
        
        db.session.delete(account)
        db.session.commit()
        
        return jsonify({'message': 'Account deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@financial_accounts_bp.route('/accounts/<account_id>/sync', methods=['POST'])
@jwt_required()
def sync_account(account_id):
    """Sync transactions for a financial account"""
    try:
        user_id = get_jwt_identity()
        account = FinancialAccount.query.filter_by(
            id=account_id, 
            user_id=user_id
        ).first()
        
        if not account:
            return jsonify({'error': 'Account not found'}), 404
        
        # In a real implementation, this would call Plaid's transactions endpoint
        # For demo purposes, we'll simulate new transactions
        new_transactions = _simulate_new_transactions(account_id)
        
        # Update last sync time
        account.last_sync = datetime.utcnow()
        db.session.commit()
        
        # Detect new subscriptions from transactions
        _detect_subscriptions_from_transactions(user_id, account_id)
        
        return jsonify({
            'message': 'Account synced successfully',
            'new_transactions': len(new_transactions),
            'last_sync': account.last_sync.isoformat()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@financial_accounts_bp.route('/accounts/<account_id>/transactions', methods=['GET'])
@jwt_required()
def get_account_transactions(account_id):
    """Get transactions for a specific account"""
    try:
        user_id = get_jwt_identity()
        account = FinancialAccount.query.filter_by(
            id=account_id, 
            user_id=user_id
        ).first()
        
        if not account:
            return jsonify({'error': 'Account not found'}), 404
        
        # Get query parameters
        limit = int(request.args.get('limit', 50))
        offset = int(request.args.get('offset', 0))
        
        transactions = Transaction.query.filter_by(account_id=account_id)\
            .order_by(Transaction.transaction_date.desc())\
            .offset(offset)\
            .limit(limit)\
            .all()
        
        return jsonify({
            'transactions': [transaction.to_dict() for transaction in transactions],
            'total_count': Transaction.query.filter_by(account_id=account_id).count()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def _simulate_initial_transactions(account_id):
    """Simulate initial transaction data for a newly linked account"""
    sample_transactions = [
        {
            'merchant_name': 'Netflix',
            'amount': -15.49,
            'category': 'entertainment',
            'description': 'NETFLIX.COM',
            'days_ago': 5
        },
        {
            'merchant_name': 'Spotify',
            'amount': -9.99,
            'category': 'entertainment',
            'description': 'Spotify Premium',
            'days_ago': 12
        },
        {
            'merchant_name': 'Adobe',
            'amount': -52.99,
            'category': 'productivity',
            'description': 'Adobe Creative Cloud',
            'days_ago': 18
        },
        {
            'merchant_name': 'Amazon Prime',
            'amount': -14.99,
            'category': 'shopping',
            'description': 'AMAZON PRIME MEMBERSHIP',
            'days_ago': 25
        }
    ]
    
    for tx_data in sample_transactions:
        transaction = Transaction(
            account_id=account_id,
            transaction_id=f"tx_{uuid.uuid4().hex[:12]}",
            amount=tx_data['amount'],
            merchant_name=tx_data['merchant_name'],
            category=tx_data['category'],
            description=tx_data['description'],
            transaction_date=(datetime.utcnow() - timedelta(days=tx_data['days_ago'])).date(),
            transaction_type='debit' if tx_data['amount'] < 0 else 'credit',
            pending=False
        )
        db.session.add(transaction)
    
    db.session.commit()

def _simulate_new_transactions(account_id):
    """Simulate new transactions during sync"""
    # For demo purposes, randomly add 1-3 new transactions
    import random
    
    sample_merchants = [
        {'name': 'Starbucks', 'amount': -4.75, 'category': 'food'},
        {'name': 'Uber', 'amount': -12.50, 'category': 'transportation'},
        {'name': 'Target', 'amount': -45.67, 'category': 'shopping'},
        {'name': 'Gym Membership', 'amount': -29.99, 'category': 'fitness'}
    ]
    
    new_transactions = []
    num_transactions = random.randint(1, 3)
    
    for _ in range(num_transactions):
        tx_data = random.choice(sample_merchants)
        transaction = Transaction(
            account_id=account_id,
            transaction_id=f"tx_{uuid.uuid4().hex[:12]}",
            amount=tx_data['amount'],
            merchant_name=tx_data['name'],
            category=tx_data['category'],
            description=f"{tx_data['name']} Purchase",
            transaction_date=datetime.utcnow().date(),
            transaction_type='debit' if tx_data['amount'] < 0 else 'credit',
            pending=False
        )
        db.session.add(transaction)
        new_transactions.append(transaction)
    
    db.session.commit()
    return new_transactions

def _detect_subscriptions_from_transactions(user_id, account_id):
    """Detect potential subscriptions from transaction patterns"""
    # Get recent transactions for this account
    transactions = Transaction.query.filter_by(account_id=account_id)\
        .filter(Transaction.amount < 0)\
        .order_by(Transaction.transaction_date.desc())\
        .limit(100)\
        .all()
    
    # Group transactions by merchant
    merchant_transactions = {}
    for tx in transactions:
        if tx.merchant_name and tx.is_recurring():
            if tx.merchant_name not in merchant_transactions:
                merchant_transactions[tx.merchant_name] = []
            merchant_transactions[tx.merchant_name].append(tx)
    
    # Create subscriptions for merchants with recurring patterns
    for merchant_name, txs in merchant_transactions.items():
        if len(txs) >= 2:  # At least 2 transactions to establish pattern
            # Check if subscription already exists
            existing = Subscription.query.filter_by(
                user_id=user_id,
                merchant_name=merchant_name,
                status='active'
            ).first()
            
            if not existing:
                latest_tx = txs[0]
                subscription = Subscription(
                    user_id=user_id,
                    account_id=account_id,
                    merchant_name=merchant_name,
                    service_name=merchant_name,
                    category=latest_tx.category,
                    amount=abs(float(latest_tx.amount)),
                    billing_cycle=latest_tx.get_billing_cycle(),
                    last_billing_date=latest_tx.transaction_date,
                    next_billing_date=latest_tx.transaction_date + timedelta(days=30),
                    detection_confidence=0.85,
                    detected_at=datetime.utcnow()
                )
                db.session.add(subscription)
    
    db.session.commit()

# Import timedelta for date calculations
from datetime import timedelta

