from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.subscription import Subscription
from models.user import User
from services.subscription_service import subscription_service
from database import db
from datetime import datetime, timedelta
import uuid

subscriptions_bp = Blueprint('subscriptions', __name__)

@subscriptions_bp.route('/subscriptions', methods=['GET'])
@jwt_required()
def get_subscriptions():
    """Get all subscriptions for the authenticated user"""
    try:
        user_id = get_jwt_identity()
        
        # Get query parameters
        status = request.args.get('status', 'active')
        category = request.args.get('category')
        
        # Build query
        query = Subscription.query.filter_by(user_id=user_id)
        
        if status:
            query = query.filter_by(status=status)
        
        if category:
            query = query.filter_by(category=category)
        
        subscriptions = query.all()
        
        # Get user's feature access
        feature_access = subscription_service.get_feature_access(user_id)
        
        return jsonify({
            'subscriptions': [sub.to_dict() for sub in subscriptions],
            'feature_access': feature_access,
            'subscription_limits': subscription_service.get_user_subscription_limits(user_id)
        })
        
    except Exception as e:
        current_app.logger.error(f"Failed to get subscriptions: {str(e)}")
        return jsonify({'error': 'Failed to retrieve subscriptions'}), 500

@subscriptions_bp.route('/subscriptions', methods=['POST'])
@jwt_required()
def create_subscription():
    """Create a new subscription"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # Check if user can add more subscriptions
        can_add, message = subscription_service.can_add_subscription(user_id)
        if not can_add:
            return jsonify({
                'error': message,
                'upgrade_required': True,
                'subscription_limits': subscription_service.get_user_subscription_limits(user_id)
            }), 403
        
        # Validate required fields
        required_fields = ['merchant_name', 'service_name', 'amount', 'billing_cycle']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        # Create subscription
        subscription = Subscription(
            id=str(uuid.uuid4()),
            user_id=user_id,
            merchant_name=data['merchant_name'],
            service_name=data['service_name'],
            amount=data['amount'],
            billing_cycle=data['billing_cycle'],
            category=data.get('category', 'other'),
            description=data.get('description'),
            website_url=data.get('website_url'),
            next_billing_date=datetime.strptime(data['next_billing_date'], '%Y-%m-%d').date() if data.get('next_billing_date') else None,
            status='active'
        )
        
        db.session.add(subscription)
        db.session.commit()
        
        return jsonify({
            'subscription': subscription.to_dict(),
            'message': 'Subscription created successfully',
            'subscription_limits': subscription_service.get_user_subscription_limits(user_id)
        }), 201
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        current_app.logger.error(f"Failed to create subscription: {str(e)}")
        return jsonify({'error': 'Failed to create subscription'}), 500

@subscriptions_bp.route('/subscriptions/<subscription_id>', methods=['GET'])
@jwt_required()
def get_subscription(subscription_id):
    """Get a specific subscription"""
    try:
        user_id = get_jwt_identity()
        
        subscription = Subscription.query.filter_by(
            id=subscription_id,
            user_id=user_id
        ).first()
        
        if not subscription:
            return jsonify({'error': 'Subscription not found'}), 404
        
        return jsonify({'subscription': subscription.to_dict()})
        
    except Exception as e:
        current_app.logger.error(f"Failed to get subscription: {str(e)}")
        return jsonify({'error': 'Failed to retrieve subscription'}), 500

@subscriptions_bp.route('/subscriptions/<subscription_id>', methods=['PUT'])
@jwt_required()
def update_subscription(subscription_id):
    """Update a subscription"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        subscription = Subscription.query.filter_by(
            id=subscription_id,
            user_id=user_id
        ).first()
        
        if not subscription:
            return jsonify({'error': 'Subscription not found'}), 404
        
        # Update fields
        updatable_fields = [
            'merchant_name', 'service_name', 'amount', 'billing_cycle',
            'category', 'description', 'website_url', 'next_billing_date'
        ]
        
        for field in updatable_fields:
            if field in data:
                if field == 'next_billing_date' and data[field]:
                    setattr(subscription, field, datetime.strptime(data[field], '%Y-%m-%d').date())
                else:
                    setattr(subscription, field, data[field])
        
        subscription.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'subscription': subscription.to_dict(),
            'message': 'Subscription updated successfully'
        })
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        current_app.logger.error(f"Failed to update subscription: {str(e)}")
        return jsonify({'error': 'Failed to update subscription'}), 500

@subscriptions_bp.route('/subscriptions/<subscription_id>', methods=['DELETE'])
@jwt_required()
def delete_subscription(subscription_id):
    """Delete a subscription"""
    try:
        user_id = get_jwt_identity()
        
        subscription = Subscription.query.filter_by(
            id=subscription_id,
            user_id=user_id
        ).first()
        
        if not subscription:
            return jsonify({'error': 'Subscription not found'}), 404
        
        db.session.delete(subscription)
        db.session.commit()
        
        return jsonify({
            'message': 'Subscription deleted successfully',
            'subscription_limits': subscription_service.get_user_subscription_limits(user_id)
        })
        
    except Exception as e:
        current_app.logger.error(f"Failed to delete subscription: {str(e)}")
        return jsonify({'error': 'Failed to delete subscription'}), 500

@subscriptions_bp.route('/subscriptions/analytics', methods=['GET'])
@jwt_required()
def get_subscription_analytics():
    """Get subscription analytics with plan-based features"""
    try:
        user_id = get_jwt_identity()
        analytics = subscription_service.get_subscription_analytics(user_id)
        
        return jsonify(analytics)
        
    except Exception as e:
        current_app.logger.error(f"Failed to get analytics: {str(e)}")
        return jsonify({'error': 'Failed to retrieve analytics'}), 500

@subscriptions_bp.route('/subscriptions/categories', methods=['GET'])
def get_subscription_categories():
    """Get available subscription categories"""
    categories = [
        {'id': 'entertainment', 'name': 'Entertainment', 'icon': 'play'},
        {'id': 'productivity', 'name': 'Productivity', 'icon': 'briefcase'},
        {'id': 'fitness', 'name': 'Fitness & Health', 'icon': 'heart'},
        {'id': 'news', 'name': 'News & Media', 'icon': 'newspaper'},
        {'id': 'shopping', 'name': 'Shopping', 'icon': 'shopping-bag'},
        {'id': 'utilities', 'name': 'Utilities', 'icon': 'zap'},
        {'id': 'education', 'name': 'Education', 'icon': 'book'},
        {'id': 'finance', 'name': 'Finance', 'icon': 'dollar-sign'},
        {'id': 'other', 'name': 'Other', 'icon': 'more-horizontal'}
    ]
    
    return jsonify({'categories': categories})

@subscriptions_bp.route('/subscriptions/<subscription_id>/cancel', methods=['POST'])
@jwt_required()
def cancel_subscription(subscription_id):
    """Initiate subscription cancellation"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        subscription = Subscription.query.filter_by(
            id=subscription_id,
            user_id=user_id
        ).first()
        
        if not subscription:
            return jsonify({'error': 'Subscription not found'}), 404
        
        # Check if user has premium features for cancellation assistance
        feature_access = subscription_service.get_feature_access(user_id)
        
        if feature_access['cancellation_assistance']:
            # Premium users get automated cancellation assistance
            cancellation_method = 'automated'
            estimated_completion = '1-3 business days'
        else:
            # Free users get manual instructions
            cancellation_method = 'manual'
            estimated_completion = 'Self-service'
        
        # Create cancellation request (using existing model)
        from models.cancellation_request import CancellationRequest
        
        cancellation_request = CancellationRequest(
            id=str(uuid.uuid4()),
            user_id=user_id,
            subscription_id=subscription_id,
            cancellation_method=cancellation_method,
            reason=data.get('reason', 'User requested'),
            status='pending' if cancellation_method == 'automated' else 'manual_required',
            estimated_completion_date=datetime.utcnow() + timedelta(days=3) if cancellation_method == 'automated' else None
        )
        
        db.session.add(cancellation_request)
        
        # Update subscription status
        subscription.status = 'cancellation_pending'
        subscription.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        response_data = {
            'message': 'Cancellation request initiated',
            'request_id': cancellation_request.id,
            'method': cancellation_method,
            'estimated_completion': estimated_completion
        }
        
        if cancellation_method == 'manual':
            response_data['instructions'] = f"To cancel your {subscription.service_name} subscription, please visit {subscription.website_url or 'their website'} and follow their cancellation process."
            response_data['upgrade_message'] = "Upgrade to Premium for automated cancellation assistance!"
        
        return jsonify(response_data)
        
    except Exception as e:
        current_app.logger.error(f"Failed to cancel subscription: {str(e)}")
        return jsonify({'error': 'Failed to initiate cancellation'}), 500

@subscriptions_bp.route('/subscriptions/limits', methods=['GET'])
@jwt_required()
def get_subscription_limits():
    """Get user's subscription limits and usage"""
    try:
        user_id = get_jwt_identity()
        limits = subscription_service.get_user_subscription_limits(user_id)
        
        return jsonify(limits)
        
    except Exception as e:
        current_app.logger.error(f"Failed to get subscription limits: {str(e)}")
        return jsonify({'error': 'Failed to retrieve subscription limits'}), 500

@subscriptions_bp.route('/subscriptions/upgrade-prompt', methods=['GET'])
@jwt_required()
def get_upgrade_prompt():
    """Check if user should see upgrade prompts"""
    try:
        user_id = get_jwt_identity()
        should_show = subscription_service.should_show_upgrade_prompt(user_id)
        
        return jsonify({
            'show_upgrade_prompt': should_show,
            'subscription_limits': subscription_service.get_user_subscription_limits(user_id)
        })
        
    except Exception as e:
        current_app.logger.error(f"Failed to check upgrade prompt: {str(e)}")
        return jsonify({'error': 'Failed to check upgrade status'}), 500

