from flask import Blueprint, request, jsonify, session, redirect, url_for
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
import os
import json
import re
import base64
from datetime import datetime, timedelta
from email.mime.text import MIMEText
import pickle

gmail_bp = Blueprint('gmail', __name__)

# Gmail API scopes
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

# OAuth2 configuration
CLIENT_CONFIG = {
    "web": {
        "client_id": os.environ.get('GOOGLE_CLIENT_ID', 'your-client-id'),
        "client_secret": os.environ.get('GOOGLE_CLIENT_SECRET', 'your-client-secret'),
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "redirect_uris": ["http://localhost:5000/api/gmail/callback"]
    }
}

def get_gmail_service(credentials):
    """Build and return Gmail service object."""
    return build('gmail', 'v1', credentials=credentials)

def extract_subscription_info(email_content, subject, sender):
    """Extract subscription information from email content."""
    subscription_patterns = [
        # Common subscription keywords
        r'subscription|recurring|monthly|yearly|annual|billing|payment|invoice|receipt',
        # Price patterns
        r'\$\d+\.?\d*|\d+\.?\d*\s*USD|USD\s*\d+\.?\d*',
        # Service names
        r'netflix|spotify|amazon|apple|google|microsoft|adobe|dropbox|zoom|slack'
    ]
    
    # Extract price
    price_match = re.search(r'\$(\d+\.?\d*)', email_content + subject)
    price = float(price_match.group(1)) if price_match else 0.0
    
    # Extract service name from sender or subject
    service_name = sender.split('@')[0] if '@' in sender else sender
    service_name = re.sub(r'[^a-zA-Z0-9\s]', '', service_name).strip()
    
    # Check if it's likely a subscription
    is_subscription = any(re.search(pattern, email_content + subject, re.IGNORECASE) 
                         for pattern in subscription_patterns)
    
    if is_subscription and price > 0:
        return {
            'service_name': service_name,
            'price': price,
            'billing_cycle': 'monthly',  # Default, could be improved with better parsing
            'last_charged': datetime.now().isoformat(),
            'status': 'active',
            'category': 'entertainment'  # Default category
        }
    return None

@gmail_bp.route('/auth')
def gmail_auth():
    """Initiate Gmail OAuth flow."""
    flow = Flow.from_client_config(
        CLIENT_CONFIG,
        scopes=SCOPES,
        redirect_uri=url_for('gmail.gmail_callback', _external=True)
    )
    
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true'
    )
    
    session['state'] = state
    return jsonify({'auth_url': authorization_url})

@gmail_bp.route('/callback')
def gmail_callback():
    """Handle Gmail OAuth callback."""
    state = session.get('state')
    
    flow = Flow.from_client_config(
        CLIENT_CONFIG,
        scopes=SCOPES,
        state=state,
        redirect_uri=url_for('gmail.gmail_callback', _external=True)
    )
    
    flow.fetch_token(authorization_response=request.url)
    
    credentials = flow.credentials
    session['credentials'] = {
        'token': credentials.token,
        'refresh_token': credentials.refresh_token,
        'token_uri': credentials.token_uri,
        'client_id': credentials.client_id,
        'client_secret': credentials.client_secret,
        'scopes': credentials.scopes
    }
    
    return redirect('/?auth=success')

@gmail_bp.route('/scan')
def scan_subscriptions():
    """Scan Gmail for subscription emails."""
    if 'credentials' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    try:
        credentials = Credentials(**session['credentials'])
        
        if credentials.expired and credentials.refresh_token:
            credentials.refresh(Request())
            session['credentials'] = {
                'token': credentials.token,
                'refresh_token': credentials.refresh_token,
                'token_uri': credentials.token_uri,
                'client_id': credentials.client_id,
                'client_secret': credentials.client_secret,
                'scopes': credentials.scopes
            }
        
        service = get_gmail_service(credentials)
        
        # Search for subscription-related emails
        query = 'subject:(subscription OR billing OR payment OR invoice OR receipt) OR from:(noreply OR billing OR payments)'
        
        # Get emails from the last 6 months
        results = service.users().messages().list(
            userId='me',
            q=query,
            maxResults=100
        ).execute()
        
        messages = results.get('messages', [])
        subscriptions = []
        seen_services = set()
        
        for message in messages[:50]:  # Limit to 50 emails for performance
            msg = service.users().messages().get(
                userId='me',
                id=message['id'],
                format='full'
            ).execute()
            
            # Extract email details
            headers = msg['payload'].get('headers', [])
            subject = next((h['value'] for h in headers if h['name'] == 'Subject'), '')
            sender = next((h['value'] for h in headers if h['name'] == 'From'), '')
            
            # Get email body
            body = ''
            if 'parts' in msg['payload']:
                for part in msg['payload']['parts']:
                    if part['mimeType'] == 'text/plain':
                        data = part['body']['data']
                        body = base64.urlsafe_b64decode(data).decode('utf-8')
                        break
            elif msg['payload']['body'].get('data'):
                body = base64.urlsafe_b64decode(
                    msg['payload']['body']['data']
                ).decode('utf-8')
            
            # Extract subscription info
            subscription = extract_subscription_info(body, subject, sender)
            if subscription and subscription['service_name'] not in seen_services:
                subscriptions.append(subscription)
                seen_services.add(subscription['service_name'])
        
        return jsonify({
            'subscriptions': subscriptions,
            'total_found': len(subscriptions),
            'monthly_total': sum(s['price'] for s in subscriptions if s['billing_cycle'] == 'monthly')
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@gmail_bp.route('/status')
def auth_status():
    """Check authentication status."""
    return jsonify({
        'authenticated': 'credentials' in session,
        'user_email': session.get('user_email', None)
    })

@gmail_bp.route('/logout')
def logout():
    """Logout and clear session."""
    session.clear()
    return jsonify({'message': 'Logged out successfully'})

