import stripe
import os
from datetime import datetime
from flask import current_app
from models.subscription_plan import SubscriptionPlan, UserSubscription
from models.user import User
from database import db

class StripeService:
    def __init__(self):
        # Use test keys for development
        stripe.api_key = os.getenv('STRIPE_SECRET_KEY', 'sk_test_...')
        self.publishable_key = os.getenv('STRIPE_PUBLISHABLE_KEY', 'pk_test_...')
        
    def get_publishable_key(self):
        """Get Stripe publishable key for frontend"""
        return self.publishable_key
    
    def create_customer(self, user_id, email, name=None):
        """Create a Stripe customer"""
        try:
            customer = stripe.Customer.create(
                email=email,
                name=name,
                metadata={'user_id': user_id}
            )
            return customer
        except stripe.error.StripeError as e:
            current_app.logger.error(f"Stripe customer creation failed: {str(e)}")
            raise e
    
    def create_checkout_session(self, user_id, plan_id, success_url, cancel_url):
        """Create a Stripe Checkout session for subscription"""
        try:
            # Get the subscription plan
            plan = SubscriptionPlan.query.get(plan_id)
            if not plan or not plan.is_active:
                raise ValueError("Invalid or inactive subscription plan")
            
            # Get or create Stripe customer
            user = User.query.get(user_id)
            if not user:
                raise ValueError("User not found")
            
            # Check if user already has a Stripe customer ID
            user_subscription = UserSubscription.query.filter_by(user_id=user_id).first()
            customer_id = None
            
            if user_subscription and user_subscription.stripe_customer_id:
                customer_id = user_subscription.stripe_customer_id
            else:
                # Create new Stripe customer
                customer = self.create_customer(
                    user_id=user_id,
                    email=user.email,
                    name=f"{user.first_name} {user.last_name}"
                )
                customer_id = customer.id
            
            # Create checkout session
            session = stripe.checkout.Session.create(
                customer=customer_id,
                payment_method_types=['card'],
                line_items=[{
                    'price': plan.stripe_price_id,
                    'quantity': 1,
                }],
                mode='subscription',
                success_url=success_url,
                cancel_url=cancel_url,
                metadata={
                    'user_id': user_id,
                    'plan_id': plan_id
                }
            )
            
            return session
            
        except stripe.error.StripeError as e:
            current_app.logger.error(f"Stripe checkout session creation failed: {str(e)}")
            raise e
    
    def handle_checkout_completed(self, session):
        """Handle successful checkout completion"""
        try:
            user_id = session.metadata.get('user_id')
            plan_id = session.metadata.get('plan_id')
            
            if not user_id or not plan_id:
                raise ValueError("Missing user_id or plan_id in session metadata")
            
            # Get the subscription from Stripe
            subscription = stripe.Subscription.retrieve(session.subscription)
            
            # Update or create user subscription record
            user_subscription = UserSubscription.query.filter_by(user_id=user_id).first()
            
            if user_subscription:
                # Update existing subscription
                user_subscription.plan_id = plan_id
                user_subscription.stripe_customer_id = session.customer
                user_subscription.stripe_subscription_id = session.subscription
                user_subscription.status = subscription.status
                user_subscription.current_period_start = datetime.fromtimestamp(subscription.current_period_start)
                user_subscription.current_period_end = datetime.fromtimestamp(subscription.current_period_end)
                user_subscription.updated_at = datetime.utcnow()
            else:
                # Create new subscription record
                user_subscription = UserSubscription(
                    user_id=user_id,
                    plan_id=plan_id,
                    stripe_customer_id=session.customer,
                    stripe_subscription_id=session.subscription,
                    status=subscription.status,
                    current_period_start=datetime.fromtimestamp(subscription.current_period_start),
                    current_period_end=datetime.fromtimestamp(subscription.current_period_end)
                )
                db.session.add(user_subscription)
            
            db.session.commit()
            return user_subscription
            
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Checkout completion handling failed: {str(e)}")
            raise e
    
    def cancel_subscription(self, user_id, at_period_end=True):
        """Cancel a user's subscription"""
        try:
            user_subscription = UserSubscription.query.filter_by(
                user_id=user_id,
                status='active'
            ).first()
            
            if not user_subscription or not user_subscription.stripe_subscription_id:
                raise ValueError("No active subscription found")
            
            # Cancel the subscription in Stripe
            if at_period_end:
                subscription = stripe.Subscription.modify(
                    user_subscription.stripe_subscription_id,
                    cancel_at_period_end=True
                )
                user_subscription.cancel_at_period_end = True
            else:
                subscription = stripe.Subscription.cancel(
                    user_subscription.stripe_subscription_id
                )
                user_subscription.status = 'canceled'
            
            user_subscription.updated_at = datetime.utcnow()
            db.session.commit()
            
            return user_subscription
            
        except stripe.error.StripeError as e:
            db.session.rollback()
            current_app.logger.error(f"Stripe subscription cancellation failed: {str(e)}")
            raise e
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Subscription cancellation failed: {str(e)}")
            raise e
    
    def get_subscription_status(self, user_id):
        """Get current subscription status for a user"""
        user_subscription = UserSubscription.query.filter_by(user_id=user_id).first()
        
        if not user_subscription:
            return {
                'status': 'free',
                'plan': None,
                'current_period_end': None,
                'cancel_at_period_end': False
            }
        
        # Sync with Stripe if we have a subscription ID
        if user_subscription.stripe_subscription_id:
            try:
                stripe_subscription = stripe.Subscription.retrieve(
                    user_subscription.stripe_subscription_id
                )
                
                # Update local record with Stripe data
                user_subscription.status = stripe_subscription.status
                user_subscription.current_period_start = datetime.fromtimestamp(
                    stripe_subscription.current_period_start
                )
                user_subscription.current_period_end = datetime.fromtimestamp(
                    stripe_subscription.current_period_end
                )
                user_subscription.cancel_at_period_end = stripe_subscription.cancel_at_period_end
                user_subscription.updated_at = datetime.utcnow()
                db.session.commit()
                
            except stripe.error.StripeError as e:
                current_app.logger.error(f"Failed to sync subscription status: {str(e)}")
        
        return {
            'status': user_subscription.status,
            'plan': user_subscription.plan.to_dict() if user_subscription.plan else None,
            'current_period_end': user_subscription.current_period_end.isoformat() if user_subscription.current_period_end else None,
            'cancel_at_period_end': user_subscription.cancel_at_period_end
        }
    
    def create_products_and_prices(self):
        """Create Stripe products and prices for subscription plans"""
        try:
            # Free plan (no Stripe product needed)
            free_plan = SubscriptionPlan.query.filter_by(name='Free').first()
            if not free_plan:
                free_plan = SubscriptionPlan(
                    name='Free',
                    description='Track up to 3 subscriptions with basic analytics',
                    price=0.00,
                    currency='USD',
                    billing_interval='month',
                    features=[
                        'Track up to 3 subscriptions',
                        'Basic spending analytics',
                        'Monthly and yearly totals',
                        'Manual subscription management'
                    ],
                    max_subscriptions=3,
                    is_active=True
                )
                db.session.add(free_plan)
            
            # Premium plan
            premium_plan = SubscriptionPlan.query.filter_by(name='Premium').first()
            if not premium_plan:
                # Create Stripe product
                product = stripe.Product.create(
                    name='SubZero Premium',
                    description='Full access to SubZero with unlimited subscriptions and premium features'
                )
                
                # Create Stripe price
                price = stripe.Price.create(
                    product=product.id,
                    unit_amount=499,  # $4.99 in cents
                    currency='usd',
                    recurring={'interval': 'month'}
                )
                
                premium_plan = SubscriptionPlan(
                    name='Premium',
                    description='Unlimited subscriptions with premium features and alerts',
                    price=4.99,
                    currency='USD',
                    billing_interval='month',
                    stripe_price_id=price.id,
                    stripe_product_id=product.id,
                    features=[
                        'Unlimited subscription tracking',
                        'Advanced spending analytics',
                        'Payment due date alerts',
                        'Automated cancellation assistance',
                        'Spending insights and recommendations',
                        'Export data and reports',
                        'Priority customer support'
                    ],
                    max_subscriptions=None,  # Unlimited
                    is_active=True
                )
                db.session.add(premium_plan)
            
            db.session.commit()
            return {'free_plan': free_plan.to_dict(), 'premium_plan': premium_plan.to_dict()}
            
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Failed to create products and prices: {str(e)}")
            raise e

# Global instance
stripe_service = StripeService()

