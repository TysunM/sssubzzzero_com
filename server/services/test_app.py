#!/usr/bin/env python3
"""
Test script for SubZero Flask application
"""

import os
import sys
from flask import Flask
from flask_cors import CORS

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def create_test_app():
    """Create a test Flask application"""
    app = Flask(__name__)
    
    # Basic configuration
    app.config['SECRET_KEY'] = 'test-secret-key-for-subzero'
    app.config['JWT_SECRET_KEY'] = 'test-jwt-secret-key'
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///test_subzero.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Enable CORS
    CORS(app, origins="*")
    
    # Test route
    @app.route('/api/health', methods=['GET'])
    def health_check():
        return {'status': 'healthy', 'service': 'SubZero API'}
    
    @app.route('/api/test', methods=['GET'])
    def test_route():
        return {
            'message': 'SubZero API is working!',
            'features': [
                'Subscription Discovery',
                'Bank Account Integration',
                'Email Scanning',
                'Privacy Protection'
            ]
        }
    
    # Import and register blueprints (if they exist)
    try:
        from subscription_discovery import discovery_bp
        app.register_blueprint(discovery_bp, url_prefix='/api/discovery')
        print("✓ Registered discovery blueprint")
    except ImportError as e:
        print(f"⚠ Could not import discovery blueprint: {e}")
    
    try:
        from auth import auth_bp
        app.register_blueprint(auth_bp, url_prefix='/api/auth')
        print("✓ Registered auth blueprint")
    except ImportError as e:
        print(f"⚠ Could not import auth blueprint: {e}")
    
    try:
        from subscriptions import subscriptions_bp
        app.register_blueprint(subscriptions_bp, url_prefix='/api/subscriptions')
        print("✓ Registered subscriptions blueprint")
    except ImportError as e:
        print(f"⚠ Could not import subscriptions blueprint: {e}")
    
    return app

if __name__ == '__main__':
    print("🚀 Starting SubZero Test Server...")
    
    app = create_test_app()
    
    print("\n📋 Available routes:")
    for rule in app.url_map.iter_rules():
        print(f"  {rule.methods} {rule.rule}")
    
    print(f"\n🌐 Server starting on http://0.0.0.0:5000")
    print("📱 Frontend should connect to this URL")
    print("🔍 Test the API at http://localhost:5000/api/health")
    
    app.run(host='0.0.0.0', port=5000, debug=True)

