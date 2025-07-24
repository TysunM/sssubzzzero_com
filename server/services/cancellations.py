from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from src.models.user import User, db
from src.models.subscription import Subscription
from src.models.cancellation_request import CancellationRequest

cancellations_bp = Blueprint('cancellations', __name__)

@cancellations_bp.route('/cancellations', methods=['GET'])
@jwt_required()
def get_cancellations():
    """Get all cancellation requests for the current user"""
    try:
        user_id = get_jwt_identity()
        
        # Get query parameters
        status = request.args.get('status', 'all')
        limit = int(request.args.get('limit', 50))
        offset = int(request.args.get('offset', 0))
        
        # Build query
        query = CancellationRequest.query.filter_by(user_id=user_id)
        
        if status != 'all':
            query = query.filter_by(status=status)
        
        cancellations = query.order_by(CancellationRequest.created_at.desc())\
            .offset(offset)\
            .limit(limit)\
            .all()
        
        # Get subscription details for each cancellation
        cancellation_data = []
        for cancellation in cancellations:
            subscription = Subscription.query.get(cancellation.subscription_id)
            cancellation_dict = cancellation.to_dict()
            if subscription:
                cancellation_dict['subscription'] = {
                    'service_name': subscription.service_name or subscription.merchant_name,
                    'amount': float(subscription.amount),
                    'billing_cycle': subscription.billing_cycle,
                    'category': subscription.category
                }
            cancellation_data.append(cancellation_dict)
        
        return jsonify({
            'cancellations': cancellation_data,
            'total_count': CancellationRequest.query.filter_by(user_id=user_id).count()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@cancellations_bp.route('/cancellations/<cancellation_id>', methods=['GET'])
@jwt_required()
def get_cancellation(cancellation_id):
    """Get a specific cancellation request"""
    try:
        user_id = get_jwt_identity()
        cancellation = CancellationRequest.query.filter_by(
            id=cancellation_id, 
            user_id=user_id
        ).first()
        
        if not cancellation:
            return jsonify({'error': 'Cancellation request not found'}), 404
        
        # Get subscription details
        subscription = Subscription.query.get(cancellation.subscription_id)
        cancellation_dict = cancellation.to_dict()
        
        if subscription:
            cancellation_dict['subscription'] = subscription.to_dict()
        
        return jsonify({'cancellation': cancellation_dict}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@cancellations_bp.route('/cancellations/<cancellation_id>/retry', methods=['POST'])
@jwt_required()
def retry_cancellation(cancellation_id):
    """Retry a failed cancellation request"""
    try:
        user_id = get_jwt_identity()
        cancellation = CancellationRequest.query.filter_by(
            id=cancellation_id, 
            user_id=user_id
        ).first()
        
        if not cancellation:
            return jsonify({'error': 'Cancellation request not found'}), 404
        
        if not cancellation.can_retry():
            return jsonify({'error': 'Cancellation request cannot be retried'}), 400
        
        # Reset status and increment retry count
        cancellation.status = 'pending'
        cancellation.last_retry_at = datetime.utcnow()
        cancellation.updated_at = datetime.utcnow()
        
        # Simulate retry logic
        subscription = Subscription.query.get(cancellation.subscription_id)
        if subscription and subscription.is_cancellable():
            cancellation.status = 'in_progress'
            cancellation.method_used = 'api'
        else:
            cancellation.method_used = 'manual'
            cancellation.notes = 'Retry initiated - manual intervention required'
        
        db.session.commit()
        
        return jsonify({
            'message': 'Cancellation retry initiated',
            'cancellation': cancellation.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@cancellations_bp.route('/cancellations/<cancellation_id>/complete', methods=['POST'])
@jwt_required()
def complete_cancellation(cancellation_id):
    """Mark a cancellation request as completed (admin/system use)"""
    try:
        user_id = get_jwt_identity()
        cancellation = CancellationRequest.query.filter_by(
            id=cancellation_id, 
            user_id=user_id
        ).first()
        
        if not cancellation:
            return jsonify({'error': 'Cancellation request not found'}), 404
        
        data = request.get_json()
        confirmation_number = data.get('confirmation_number')
        notes = data.get('notes')
        
        # Mark as completed
        cancellation.mark_completed(confirmation_number, notes)
        
        # Update subscription status
        subscription = Subscription.query.get(cancellation.subscription_id)
        if subscription:
            if cancellation.request_type == 'immediate':
                subscription.status = 'cancelled'
            else:
                subscription.status = 'pending_cancellation'
            subscription.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Cancellation completed successfully',
            'cancellation': cancellation.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@cancellations_bp.route('/cancellations/stats', methods=['GET'])
@jwt_required()
def get_cancellation_stats():
    """Get cancellation statistics for the current user"""
    try:
        user_id = get_jwt_identity()
        
        # Get all cancellation requests
        cancellations = CancellationRequest.query.filter_by(user_id=user_id).all()
        
        # Calculate statistics
        total_requests = len(cancellations)
        completed_requests = len([c for c in cancellations if c.status == 'completed'])
        pending_requests = len([c for c in cancellations if c.status in ['pending', 'in_progress']])
        failed_requests = len([c for c in cancellations if c.status == 'failed'])
        
        # Calculate success rate
        success_rate = (completed_requests / total_requests * 100) if total_requests > 0 else 0
        
        # Calculate total savings from completed cancellations
        total_savings = 0
        for cancellation in cancellations:
            if cancellation.status == 'completed':
                subscription = Subscription.query.get(cancellation.subscription_id)
                if subscription:
                    # Calculate annual savings
                    annual_cost = subscription.calculate_annual_cost()
                    total_savings += annual_cost
        
        # Get recent cancellations
        recent_cancellations = CancellationRequest.query.filter_by(user_id=user_id)\
            .order_by(CancellationRequest.created_at.desc())\
            .limit(5)\
            .all()
        
        recent_data = []
        for cancellation in recent_cancellations:
            subscription = Subscription.query.get(cancellation.subscription_id)
            recent_data.append({
                'id': cancellation.id,
                'service_name': subscription.service_name or subscription.merchant_name if subscription else 'Unknown',
                'status': cancellation.status,
                'created_at': cancellation.created_at.isoformat(),
                'amount_saved': subscription.calculate_annual_cost() if subscription and cancellation.status == 'completed' else 0
            })
        
        return jsonify({
            'total_requests': total_requests,
            'completed_requests': completed_requests,
            'pending_requests': pending_requests,
            'failed_requests': failed_requests,
            'success_rate': round(success_rate, 1),
            'total_annual_savings': round(total_savings, 2),
            'recent_cancellations': recent_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@cancellations_bp.route('/cancellations/simulate-completion', methods=['POST'])
@jwt_required()
def simulate_completion():
    """Simulate completion of pending cancellations (for demo purposes)"""
    try:
        user_id = get_jwt_identity()
        
        # Find pending cancellations
        pending_cancellations = CancellationRequest.query.filter_by(
            user_id=user_id, 
            status='in_progress'
        ).all()
        
        completed_count = 0
        for cancellation in pending_cancellations:
            # Simulate successful completion
            import random
            if random.random() > 0.2:  # 80% success rate
                cancellation.mark_completed(
                    confirmation_number=f"CONF_{random.randint(100000, 999999)}",
                    notes="Cancellation completed successfully via automated system"
                )
                
                # Update subscription status
                subscription = Subscription.query.get(cancellation.subscription_id)
                if subscription:
                    subscription.status = 'cancelled'
                    subscription.updated_at = datetime.utcnow()
                
                completed_count += 1
            else:
                cancellation.mark_failed("Cancellation failed - service unavailable")
        
        db.session.commit()
        
        return jsonify({
            'message': f'Simulated completion of {completed_count} cancellations',
            'completed_count': completed_count,
            'total_processed': len(pending_cancellations)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

