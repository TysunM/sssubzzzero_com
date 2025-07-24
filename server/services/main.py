import os
import sys

from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from datetime import timedelta

# Import database and models
from models.user import db
from models.financial_account import FinancialAccount
from models.transaction import Transaction
from models.subscription import Subscription
from models.cancellation_request import CancellationRequest
from models.subscription_plan import SubscriptionPlan, UserSubscription

# Import blueprints
from routes.user import user_bp
from routes.auth import auth_bp
from routes.subscriptions import subscriptions_bp
from routes.financial_accounts import financial_accounts_bp
from routes.cancellations import cancellations_bp
from routes.billing import billing_bp

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))

# Configuration
app.config['SECRET_KEY'] = 'subzero-secret-key-change-in-production'
app.config['JWT_SECRET_KEY'] = 'jwt-secret-string-change-in-production'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=30)
app.config['STRIPE_WEBHOOK_SECRET'] = os.environ.get('STRIPE_WEBHOOK_SECRET', '')

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(os.path.dirname(__file__), 'database', 'app.db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize extensions
CORS(app, origins="*")  # Allow all origins for development
jwt = JWTManager(app)
db.init_app(app)

# Register blueprints
app.register_blueprint(user_bp, url_prefix='/api')
app.register_blueprint(auth_bp, url_prefix='/api')
app.register_blueprint(subscriptions_bp, url_prefix='/api')
app.register_blueprint(financial_accounts_bp, url_prefix='/api')
app.register_blueprint(cancellations_bp, url_prefix='/api')
app.register_blueprint(billing_bp, url_prefix='/api/billing')

# Create database tables
with app.app_context():
    db.create_all()
    
    # Initialize subscription plans if they don't exist
    try:
        from services.stripe_service import stripe_service
        if not SubscriptionPlan.query.first():
            stripe_service.create_products_and_prices()
            print("Subscription plans initialized")
    except Exception as e:
        print(f"Warning: Could not initialize subscription plans: {e}")

@app.route('/')
def index():
    return "SubZero Backend is running!"

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'SubZero Backend API',
        'version': '1.0.0'
    }), 200

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)


