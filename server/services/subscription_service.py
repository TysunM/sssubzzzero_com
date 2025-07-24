from flask import current_app
from models.subscription import Subscription
from models.subscription_plan import SubscriptionPlan, UserSubscription
from models.user import User
from database import db
from datetime import datetime, timedelta

class SubscriptionService:
    
    def __init__(self):
        pass
    
    def get_user_plan(self, user_id):
        """Get the current subscription plan for a user"""
        user_subscription = UserSubscription.query.filter_by(
            user_id=user_id,
            status='active'
        ).first()
        
        if user_subscription and user_subscription.plan:
            return user_subscription.plan
        
        # Default to free plan if no active subscription
        free_plan = SubscriptionPlan.query.filter_by(name='Free').first()
        return free_plan
    
    def can_add_subscription(self, user_id):
        """Check if user can add more subscriptions based on their plan"""
        user_plan = self.get_user_plan(user_id)
        
        if not user_plan:
            return False, "No subscription plan found"
        
        # Premium users have unlimited subscriptions
        if user_plan.max_subscriptions is None:
            return True, "Unlimited subscriptions allowed"
        
        # Count current subscriptions
        current_count = Subscription.query.filter_by(
            user_id=user_id,
            status='active'
        ).count()
        
        if current_count >= user_plan.max_subscriptions:
            return False, f"Subscription limit reached. Upgrade to Premium for unlimited subscriptions."
        
        return True, f"Can add {user_plan.max_subscriptions - current_count} more subscriptions"
    
    def get_subscription_analytics(self, user_id):
        """Get subscription analytics with plan-based features"""
        user_plan = self.get_user_plan(user_id)
        
        # Get basic analytics
        subscriptions = Subscription.query.filter_by(
            user_id=user_id,
            status='active'
        ).all()
        
        total_monthly = sum(
            sub.amount for sub in subscriptions 
            if sub.billing_cycle == 'monthly'
        )
        
        total_annual = sum(
            sub.amount * 12 for sub in subscriptions 
            if sub.billing_cycle == 'monthly'
        ) + sum(
            sub.amount for sub in subscriptions 
            if sub.billing_cycle == 'yearly'
        )
        
        # Basic analytics for all users
        analytics = {
            'total_monthly_spend': float(total_monthly),
            'total_annual_spend': float(total_annual),
            'subscription_count': len(subscriptions),
            'plan_name': user_plan.name if user_plan else 'Free',
            'plan_features': user_plan.features if user_plan else []
        }
        
        # Premium features
        if user_plan and user_plan.name == 'Premium':
            # Add upcoming bills with alerts
            upcoming_bills = []
            for sub in subscriptions:
                if sub.next_billing_date:
                    days_until = (sub.next_billing_date - datetime.now().date()).days
                    upcoming_bills.append({
                        'subscription_id': sub.id,
                        'service_name': sub.service_name,
                        'amount': float(sub.amount),
                        'billing_date': sub.next_billing_date.isoformat(),
                        'days_until': days_until
                    })
            
            # Sort by billing date
            upcoming_bills.sort(key=lambda x: x['days_until'])
            
            # Category breakdown
            category_breakdown = {}
            for sub in subscriptions:
                category = sub.category or 'other'
                if category not in category_breakdown:
                    category_breakdown[category] = {'amount': 0, 'count': 0}
                category_breakdown[category]['amount'] += float(sub.amount)
                category_breakdown[category]['count'] += 1
            
            # Potential savings (example calculation)
            potential_savings = sum(
                sub.amount for sub in subscriptions 
                if sub.category == 'entertainment' and sub.amount > 10
            ) * 0.3  # 30% potential savings on expensive entertainment subscriptions
            
            analytics.update({
                'upcoming_bills': upcoming_bills,
                'category_breakdown': category_breakdown,
                'potential_savings': float(potential_savings),
                'premium_features_enabled': True
            })
        else:
            # Limited features for free users
            analytics.update({
                'upcoming_bills': [],  # No alerts for free users
                'category_breakdown': {},  # No detailed breakdown
                'potential_savings': 0,
                'premium_features_enabled': False,
                'upgrade_message': 'Upgrade to Premium for payment alerts and detailed analytics'
            })
        
        return analytics
    
    def get_user_subscription_limits(self, user_id):
        """Get subscription limits and usage for a user"""
        user_plan = self.get_user_plan(user_id)
        current_count = Subscription.query.filter_by(
            user_id=user_id,
            status='active'
        ).count()
        
        return {
            'plan_name': user_plan.name if user_plan else 'Free',
            'max_subscriptions': user_plan.max_subscriptions if user_plan else 3,
            'current_subscriptions': current_count,
            'can_add_more': current_count < (user_plan.max_subscriptions or float('inf')) if user_plan else False,
            'is_premium': user_plan.name == 'Premium' if user_plan else False
        }
    
    def should_show_upgrade_prompt(self, user_id):
        """Determine if user should see upgrade prompts"""
        user_plan = self.get_user_plan(user_id)
        
        if not user_plan or user_plan.name == 'Premium':
            return False
        
        # Show upgrade prompt if user is near limit
        current_count = Subscription.query.filter_by(
            user_id=user_id,
            status='active'
        ).count()
        
        max_subs = user_plan.max_subscriptions or 3
        return current_count >= max_subs - 1  # Show when 1 away from limit
    
    def get_feature_access(self, user_id):
        """Get feature access permissions for a user"""
        user_plan = self.get_user_plan(user_id)
        is_premium = user_plan and user_plan.name == 'Premium'
        
        return {
            'unlimited_subscriptions': is_premium,
            'payment_alerts': is_premium,
            'detailed_analytics': is_premium,
            'export_data': is_premium,
            'cancellation_assistance': is_premium,
            'priority_support': is_premium,
            'spending_insights': is_premium
        }

# Global instance
subscription_service = SubscriptionService()

