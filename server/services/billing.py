from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
import stripe
from services.stripe_service import stripe_service
from models.subscription_plan import SubscriptionPlan, UserSubscription
from models.user import User
from database import db

billing_bp = Blueprint('billing', __name__)

@billing_bp.route('/config', methods=['GET'])
def get_stripe_config():
    """Get Stripe publishable key for frontend"""
    try:
        return jsonify({
            'publishable_key': stripe_service.get_publishable_key()
        })
    except Exception as e:
        current_app.logger.error(f"Failed to get Stripe config: {str(e)}")
        return jsonify({'error': 'Failed to get payment configuration'}), 500

@billing_bp.route('/plans', methods=['GET'])
def get_subscription_plans():
    """Get all available subscription plans"""
    try:
        plans = SubscriptionPlan.query.filter_by(is_active=True).all()
        return jsonify({
            'plans': [plan.to_dict() for plan in plans]
        })
    except Exception as e:
        current_app.logger.error(f"Failed to get subscription plans: {str(e)}")
        return jsonify({'error': 'Failed to get subscription plans'}), 500

@billing_bp.route('/create-checkout-session', methods=['POST'])
@jwt_required()
def create_checkout_session():
    """Create a Stripe Checkout session for subscription"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        plan_id = data.get('plan_id')
        success_url = data.get('success_url', 'http://localhost:3000/success')
        cancel_url = data.get('cancel_url', 'http://localhost:3000/cancel')
        
        if not plan_id:
            return jsonify({'error': 'plan_id is required'}), 400
        
        # Check if plan exists and is active
        plan = SubscriptionPlan.query.get(plan_id)
        if not plan or not plan.is_active:
            return jsonify({'error': 'Invalid subscription plan'}), 400
        
        # Free plan doesn't need Stripe checkout
        if plan.price == 0:
            # Directly assign free plan to user
            user_subscription = UserSubscription.query.filter_by(user_id=user_id).first()
            
            if user_subscription:
                user_subscription.plan_id = plan_id
                user_subscription.status = 'active'
                user_subscription.updated_at = datetime.utcnow()
            else:
                user_subscription = UserSubscription(
                    user_id=user_id,
                    plan_id=plan_id,
                    status='active'
                )
                db.session.add(user_subscription)
            
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'Free plan activated successfully',
                'subscription': user_subscription.to_dict()
            })
        
        # Create Stripe checkout session for paid plans
        session = stripe_service.create_checkout_session(
            user_id=user_id,
            plan_id=plan_id,
            success_url=success_url,
            cancel_url=cancel_url
        )
        
        return jsonify({
            'checkout_url': session.url,
            'session_id': session.id
        })
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except stripe.error.StripeError as e:
        current_app.logger.error(f"Stripe error: {str(e)}")
        return jsonify({'error': 'Payment processing error'}), 500
    except Exception as e:
        current_app.logger.error(f"Checkout session creation failed: {str(e)}")
        return jsonify({'error': 'Failed to create checkout session'}), 500

@billing_bp.route('/subscription-status', methods=['GET'])
@jwt_required()
def get_subscription_status():
    """Get current user's subscription status"""
    try:
        user_id = get_jwt_identity()
        status = stripe_service.get_subscription_status(user_id)
        return jsonify(status)
        
    except Exception as e:
        current_app.logger.error(f"Failed to get subscription status: {str(e)}")
        return jsonify({'error': 'Failed to get subscription status'}), 500

@billing_bp.route('/cancel-subscription', methods=['POST'])
@jwt_required()
def cancel_subscription():
    """Cancel user's subscription"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        at_period_end = data.get('at_period_end', True)
        
        user_subscription = stripe_service.cancel_subscription(
            user_id=user_id,
            at_period_end=at_period_end
        )
        
        return jsonify({
            'success': True,
            'message': 'Subscription canceled successfully',
            'subscription': user_subscription.to_dict()
        })
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except stripe.error.StripeError as e:
        current_app.logger.error(f"Stripe cancellation error: {str(e)}")
        return jsonify({'error': 'Failed to cancel subscription'}), 500
    except Exception as e:
        current_app.logger.error(f"Subscription cancellation failed: {str(e)}")
        return jsonify({'error': 'Failed to cancel subscription'}), 500

@billing_bp.route('/webhook', methods=['POST'])
def stripe_webhook():
    """Handle Stripe webhooks"""
    payload = request.get_data()
    sig_header = request.headers.get('Stripe-Signature')
    endpoint_secret = current_app.config.get('STRIPE_WEBHOOK_SECRET')
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, endpoint_secret
        )
    except ValueError as e:
        current_app.logger.error(f"Invalid payload: {str(e)}")
        return jsonify({'error': 'Invalid payload'}), 400
    except stripe.error.SignatureVerificationError as e:
        current_app.logger.error(f"Invalid signature: {str(e)}")
        return jsonify({'error': 'Invalid signature'}), 400
    
    # Handle the event
    try:
        if event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            
            # Handle successful subscription creation
            if session['mode'] == 'subscription':
                stripe_service.handle_checkout_completed(session)
                
        elif event['type'] == 'invoice.payment_succeeded':
            invoice = event['data']['object']
            # Handle successful payment
            current_app.logger.info(f"Payment succeeded for invoice: {invoice['id']}")
            
        elif event['type'] == 'invoice.payment_failed':
            invoice = event['data']['object']
            # Handle failed payment
            current_app.logger.warning(f"Payment failed for invoice: {invoice['id']}")
            
        elif event['type'] == 'customer.subscription.updated':
            subscription = event['data']['object']
            # Handle subscription updates
            current_app.logger.info(f"Subscription updated: {subscription['id']}")
            
        elif event['type'] == 'customer.subscription.deleted':
            subscription = event['data']['object']
            # Handle subscription cancellation
            current_app.logger.info(f"Subscription deleted: {subscription['id']}")
            
        else:
            current_app.logger.info(f"Unhandled event type: {event['type']}")
        
        return jsonify({'success': True})
        
    except Exception as e:
        current_app.logger.error(f"Webhook handling failed: {str(e)}")
        return jsonify({'error': 'Webhook handling failed'}), 500

@billing_bp.route('/setup-products', methods=['POST'])
def setup_stripe_products():
    """Setup Stripe products and prices (admin endpoint)"""
    try:
        # This should be protected in production
        result = stripe_service.create_products_and_prices()
        return jsonify({
            'success': True,
            'message': 'Stripe products and prices created successfully',
            'data': result
        })
        
    except Exception as e:
        current_app.logger.error(f"Failed to setup Stripe products: {str(e)}")
        return jsonify({'error': 'Failed to setup Stripe products'}), 500

