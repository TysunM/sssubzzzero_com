"""
SubZero Subscription Discovery Service
Implements secure aggregation methods for finding subscriptions from bank accounts and emails.
"""

import re
import json
import logging
import os
from datetime import datetime, timedelta, date
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from decimal import Decimal

# Plaid imports
import plaid
from plaid.api import plaid_api
from plaid.model.transactions_sync_request import TransactionsSyncRequest
from plaid.model.transactions_recurring_get_request import TransactionsRecurringGetRequest
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.accounts_get_request import AccountsGetRequest
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.country_code import CountryCode
from plaid.model.products import Products

# Email API imports (Gmail)
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

@dataclass
class DetectedSubscription:
    """Data class for detected subscription information"""
    merchant_name: str
    service_name: Optional[str]
    amount: Decimal
    billing_cycle: str
    category: str
    confidence_score: float
    detection_source: str  # 'bank', 'email', 'both'
    last_transaction_date: Optional[datetime]
    next_billing_date: Optional[datetime]
    cancellation_info: Optional[Dict]
    plaid_stream_id: Optional[str] = None  # For tracking Plaid recurring streams

class SubscriptionDiscoveryService:
    """Service for discovering subscriptions through secure aggregation"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Known subscription merchants and patterns
        self.subscription_patterns = self._load_subscription_patterns()
        
        # Email patterns for subscription detection
        self.email_patterns = self._load_email_patterns()
        
        # Plaid configuration
        self.plaid_client = self._initialize_plaid_client()
    
    def _initialize_plaid_client(self):
        """Initialize Plaid API client for financial data aggregation"""
        try:
            # Get credentials from environment variables
            client_id = os.getenv('PLAID_CLIENT_ID', 'your_plaid_client_id')
            secret = os.getenv('PLAID_SECRET', 'your_plaid_secret')
            environment = os.getenv('PLAID_ENV', 'sandbox')
            
            # Set environment
            if environment == 'production':
                host = plaid.Environment.Production
            elif environment == 'development':
                host = plaid.Environment.Development
            else:
                host = plaid.Environment.Sandbox
            
            configuration = plaid.Configuration(
                host=host,
                api_key={
                    'clientId': client_id,
                    'secret': secret,
                }
            )
            
            api_client = plaid.ApiClient(configuration)
            return plaid_api.PlaidApi(api_client)
            
        except Exception as e:
            self.logger.error(f"Failed to initialize Plaid client: {e}")
            return None
    
    def _load_subscription_patterns(self) -> Dict:
        """Load known subscription service patterns and merchant names"""
        return {
            'streaming': {
                'patterns': [
                    r'netflix', r'spotify', r'apple music', r'amazon prime',
                    r'hulu', r'disney\+?', r'hbo', r'paramount', r'peacock'
                ],
                'category': 'entertainment',
                'typical_amounts': [9.99, 12.99, 15.49, 19.99]
            },
            'productivity': {
                'patterns': [
                    r'microsoft 365', r'office 365', r'adobe', r'dropbox',
                    r'google workspace', r'slack', r'zoom', r'notion'
                ],
                'category': 'productivity',
                'typical_amounts': [9.99, 19.99, 29.99, 99.99]
            },
            'cloud_storage': {
                'patterns': [
                    r'icloud', r'google drive', r'onedrive', r'dropbox',
                    r'box\.com', r'mega'
                ],
                'category': 'cloud_storage',
                'typical_amounts': [0.99, 2.99, 9.99, 19.99]
            },
            'fitness': {
                'patterns': [
                    r'peloton', r'fitbit', r'myfitnesspal', r'strava',
                    r'nike training', r'apple fitness'
                ],
                'category': 'fitness',
                'typical_amounts': [9.99, 14.99, 39.99]
            },
            'news': {
                'patterns': [
                    r'new york times', r'washington post', r'wall street journal',
                    r'the economist', r'medium', r'substack'
                ],
                'category': 'news',
                'typical_amounts': [4.99, 9.99, 19.99, 39.99]
            }
        }
    
    def _load_email_patterns(self) -> Dict:
        """Load email patterns for subscription detection"""
        return {
            'subscription_keywords': [
                'subscription', 'recurring', 'monthly', 'annual', 'billing',
                'payment confirmation', 'receipt', 'invoice', 'auto-renewal'
            ],
            'cancellation_keywords': [
                'cancel', 'unsubscribe', 'manage subscription', 'billing settings',
                'account settings', 'subscription preferences'
            ],
            'amount_patterns': [
                r'\$(\d+\.?\d*)',
                r'(\d+\.?\d*)\s*USD',
                r'total[:\s]*\$?(\d+\.?\d*)'
            ]
        }
    
    async def discover_subscriptions_from_bank(self, user_id: str, access_tokens: List[str]) -> List[DetectedSubscription]:
        """
        Discover subscriptions from bank account transactions using Plaid recurring transactions API
        
        Args:
            user_id: User identifier
            access_tokens: List of Plaid access tokens for user's accounts
            
        Returns:
            List of detected subscriptions
        """
        detected_subscriptions = []
        
        if not self.plaid_client:
            self.logger.error("Plaid client not initialized")
            return detected_subscriptions
        
        for access_token in access_tokens:
            try:
                # Use Plaid's dedicated recurring transactions endpoint
                recurring_request = TransactionsRecurringGetRequest(
                    access_token=access_token
                )
                
                recurring_response = self.plaid_client.transactions_recurring_get(recurring_request)
                
                # Process outflow streams (subscriptions are typically outflows)
                outflow_streams = recurring_response.get('outflow_streams', [])
                
                for stream in outflow_streams:
                    subscription = self._create_subscription_from_plaid_stream(stream, user_id, access_token)
                    if subscription:
                        detected_subscriptions.append(subscription)
                        
            except plaid.ApiException as e:
                error_response = json.loads(e.body)
                self.logger.error(f"Plaid API error for token {access_token}: {error_response}")
                
                # Handle specific error cases
                if error_response.get('error_code') == 'ITEM_LOGIN_REQUIRED':
                    self.logger.warning(f"Item login required for access token {access_token}")
                elif error_response.get('error_code') == 'PRODUCT_NOT_READY':
                    self.logger.info(f"Recurring transactions not ready for token {access_token}")
                
                continue
                
            except Exception as e:
                self.logger.error(f"Error processing bank account {access_token}: {e}")
                continue
        
        return detected_subscriptions
    
    def _create_subscription_from_plaid_stream(self, stream: Dict, user_id: str, access_token: str) -> Optional[DetectedSubscription]:
        """Create DetectedSubscription object from Plaid recurring stream data"""
        try:
            # Extract stream information
            stream_id = stream.get('stream_id')
            merchant_name = stream.get('merchant_name', 'Unknown Merchant')
            category = stream.get('category', ['Other'])[0] if stream.get('category') else 'Other'
            
            # Get the most recent transaction amount
            last_amount = stream.get('last_amount', {})
            amount = abs(float(last_amount.get('amount', 0)))
            
            if amount == 0:
                return None
            
            # Determine billing frequency
            frequency = stream.get('frequency', 'UNKNOWN')
            billing_cycle = self._map_plaid_frequency_to_billing_cycle(frequency)
            
            # Get dates
            last_date_str = stream.get('last_date')
            last_date = datetime.strptime(last_date_str, '%Y-%m-%d') if last_date_str else None
            
            # Calculate next billing date based on frequency
            next_date = self._calculate_next_billing_date(last_date, frequency) if last_date else None
            
            # Classify merchant and get confidence
            category_mapped, confidence = self._classify_merchant(merchant_name)
            
            # Boost confidence for Plaid-detected recurring streams
            confidence = min(confidence + 0.2, 1.0)
            
            # Get service name and cancellation info
            service_name = self._get_service_name(merchant_name)
            cancellation_info = self._get_cancellation_info(merchant_name)
            
            return DetectedSubscription(
                merchant_name=merchant_name.title(),
                service_name=service_name,
                amount=Decimal(str(amount)),
                billing_cycle=billing_cycle,
                category=category_mapped,
                confidence_score=confidence,
                detection_source='bank',
                last_transaction_date=last_date,
                next_billing_date=next_date,
                cancellation_info=cancellation_info,
                plaid_stream_id=stream_id
            )
            
        except Exception as e:
            self.logger.error(f"Error creating subscription from Plaid stream: {e}")
            return None
    
    def _map_plaid_frequency_to_billing_cycle(self, frequency: str) -> str:
        """Map Plaid frequency to billing cycle"""
        frequency_mapping = {
            'WEEKLY': 'weekly',
            'BIWEEKLY': 'biweekly',
            'MONTHLY': 'monthly',
            'QUARTERLY': 'quarterly',
            'ANNUALLY': 'annual',
            'UNKNOWN': 'monthly'  # Default to monthly
        }
        return frequency_mapping.get(frequency, 'monthly')
    
    def _calculate_next_billing_date(self, last_date: datetime, frequency: str) -> Optional[datetime]:
        """Calculate next billing date based on frequency"""
        if not last_date:
            return None
            
        frequency_days = {
            'WEEKLY': 7,
            'BIWEEKLY': 14,
            'MONTHLY': 30,
            'QUARTERLY': 90,
            'ANNUALLY': 365
        }
        
        days_to_add = frequency_days.get(frequency, 30)
        return last_date + timedelta(days=days_to_add)
    
    def exchange_public_token(self, public_token: str) -> Optional[str]:
        """Exchange Plaid public token for access token"""
        try:
            if not self.plaid_client:
                self.logger.error("Plaid client not initialized")
                return None
                
            exchange_request = ItemPublicTokenExchangeRequest(
                public_token=public_token
            )
            
            exchange_response = self.plaid_client.item_public_token_exchange(exchange_request)
            return exchange_response['access_token']
            
        except plaid.ApiException as e:
            error_response = json.loads(e.body)
            self.logger.error(f"Error exchanging public token: {error_response}")
            return None
        except Exception as e:
            self.logger.error(f"Error exchanging public token: {e}")
            return None
    
    def create_link_token(self, user_id: str, user_name: str) -> Optional[str]:
        """Create Plaid Link token for bank account connection"""
        try:
            if not self.plaid_client:
                self.logger.error("Plaid client not initialized")
                return None
                
            user = LinkTokenCreateRequestUser(client_user_id=user_id)
            
            request = LinkTokenCreateRequest(
                products=[Products('transactions')],
                client_name="SubZero Subscription Tracker",
                country_codes=[CountryCode('US')],
                language='en',
                user=user
            )
            
            response = self.plaid_client.link_token_create(request)
            return response['link_token']
            
        except plaid.ApiException as e:
            error_response = json.loads(e.body)
            self.logger.error(f"Error creating link token: {error_response}")
            return None
        except Exception as e:
            self.logger.error(f"Error creating link token: {e}")
            return None
    
    def _analyze_recurring_transactions(self, transactions: List[Dict]) -> List[Dict]:
        """Analyze transactions to identify recurring subscription payments"""
        merchant_transactions = {}
        
        # Group transactions by merchant
        for transaction in transactions:
            merchant_name = transaction.get('merchant_name', '').lower()
            if not merchant_name:
                continue
                
            amount = abs(float(transaction.get('amount', 0)))
            date = datetime.strptime(transaction['date'], '%Y-%m-%d')
            
            if merchant_name not in merchant_transactions:
                merchant_transactions[merchant_name] = []
            
            merchant_transactions[merchant_name].append({
                'amount': amount,
                'date': date,
                'transaction_id': transaction['transaction_id'],
                'account_id': transaction['account_id']
            })
        
        # Identify recurring patterns
        recurring_transactions = []
        
        for merchant, transactions_list in merchant_transactions.items():
            if len(transactions_list) < 2:
                continue
            
            # Sort by date
            transactions_list.sort(key=lambda x: x['date'])
            
            # Check for recurring patterns
            recurring_pattern = self._detect_recurring_pattern(transactions_list)
            
            if recurring_pattern:
                # Check if merchant matches known subscription patterns
                category, confidence = self._classify_merchant(merchant)
                
                if confidence > 0.7:  # High confidence threshold
                    recurring_transactions.append({
                        'merchant_name': merchant,
                        'pattern': recurring_pattern,
                        'category': category,
                        'confidence': confidence,
                        'transactions': transactions_list
                    })
        
        return recurring_transactions
    
    def _detect_recurring_pattern(self, transactions: List[Dict]) -> Optional[Dict]:
        """Detect if transactions follow a recurring pattern"""
        if len(transactions) < 2:
            return None
        
        # Check for consistent amounts
        amounts = [t['amount'] for t in transactions]
        amount_consistency = len(set(amounts)) / len(amounts)
        
        if amount_consistency > 0.3:  # Too much variation in amounts
            return None
        
        # Check for consistent intervals
        dates = [t['date'] for t in transactions]
        intervals = []
        
        for i in range(1, len(dates)):
            interval = (dates[i] - dates[i-1]).days
            intervals.append(interval)
        
        # Determine billing cycle based on intervals
        avg_interval = sum(intervals) / len(intervals)
        
        if 25 <= avg_interval <= 35:
            billing_cycle = 'monthly'
        elif 85 <= avg_interval <= 95:
            billing_cycle = 'quarterly'
        elif 350 <= avg_interval <= 375:
            billing_cycle = 'annual'
        elif 6 <= avg_interval <= 8:
            billing_cycle = 'weekly'
        else:
            return None
        
        return {
            'billing_cycle': billing_cycle,
            'average_amount': sum(amounts) / len(amounts),
            'interval_consistency': 1 - (max(intervals) - min(intervals)) / avg_interval,
            'last_transaction_date': max(dates),
            'transaction_count': len(transactions)
        }
    
    def _classify_merchant(self, merchant_name: str) -> Tuple[str, float]:
        """Classify merchant and return category with confidence score"""
        merchant_lower = merchant_name.lower()
        
        for category, data in self.subscription_patterns.items():
            for pattern in data['patterns']:
                if re.search(pattern, merchant_lower):
                    return category, 0.9
        
        # Check for generic subscription indicators
        subscription_indicators = ['subscription', 'monthly', 'premium', 'pro', 'plus']
        for indicator in subscription_indicators:
            if indicator in merchant_lower:
                return 'unknown', 0.6
        
        return 'unknown', 0.3
    
    def _create_subscription_from_transaction(self, recurring_data: Dict, user_id: str) -> Optional[DetectedSubscription]:
        """Create DetectedSubscription object from recurring transaction data"""
        try:
            pattern = recurring_data['pattern']
            
            # Calculate next billing date
            last_date = pattern['last_transaction_date']
            if pattern['billing_cycle'] == 'monthly':
                next_date = last_date + timedelta(days=30)
            elif pattern['billing_cycle'] == 'quarterly':
                next_date = last_date + timedelta(days=90)
            elif pattern['billing_cycle'] == 'annual':
                next_date = last_date + timedelta(days=365)
            elif pattern['billing_cycle'] == 'weekly':
                next_date = last_date + timedelta(days=7)
            else:
                next_date = None
            
            return DetectedSubscription(
                merchant_name=recurring_data['merchant_name'].title(),
                service_name=self._get_service_name(recurring_data['merchant_name']),
                amount=Decimal(str(pattern['average_amount'])),
                billing_cycle=pattern['billing_cycle'],
                category=recurring_data['category'],
                confidence_score=recurring_data['confidence'] * pattern['interval_consistency'],
                detection_source='bank',
                last_transaction_date=pattern['last_transaction_date'],
                next_billing_date=next_date,
                cancellation_info=self._get_cancellation_info(recurring_data['merchant_name'])
            )
        except Exception as e:
            self.logger.error(f"Error creating subscription from transaction: {e}")
            return None
    
    async def discover_subscriptions_from_email(self, user_id: str, gmail_credentials: Dict) -> List[DetectedSubscription]:
        """
        Discover subscriptions from email using Gmail API OAuth
        
        Args:
            user_id: User identifier
            gmail_credentials: OAuth credentials for Gmail access
            
        Returns:
            List of detected subscriptions from email
        """
        detected_subscriptions = []
        
        try:
            # Build Gmail service
            creds = Credentials.from_authorized_user_info(gmail_credentials)
            service = build('gmail', 'v1', credentials=creds)
            
            # Search for subscription-related emails
            subscription_emails = self._search_subscription_emails(service)
            
            # Analyze emails for subscription information
            for email_data in subscription_emails:
                subscription = self._extract_subscription_from_email(email_data, user_id)
                if subscription:
                    detected_subscriptions.append(subscription)
                    
        except HttpError as error:
            self.logger.error(f"Gmail API error: {error}")
        except Exception as e:
            self.logger.error(f"Error processing emails: {e}")
        
        return detected_subscriptions
    
    def _search_subscription_emails(self, service) -> List[Dict]:
        """Search for subscription-related emails using Gmail API"""
        subscription_emails = []
        
        # Search queries for different types of subscription emails
        search_queries = [
            'subject:(subscription OR billing OR payment OR receipt) after:2024/01/01',
            'from:(noreply OR billing OR subscriptions) after:2024/01/01',
            'subject:(netflix OR spotify OR adobe OR microsoft) after:2024/01/01'
        ]
        
        for query in search_queries:
            try:
                results = service.users().messages().list(
                    userId='me',
                    q=query,
                    maxResults=100
                ).execute()
                
                messages = results.get('messages', [])
                
                for message in messages:
                    # Get full message details
                    msg = service.users().messages().get(
                        userId='me',
                        id=message['id']
                    ).execute()
                    
                    subscription_emails.append(msg)
                    
            except Exception as e:
                self.logger.error(f"Error searching emails with query '{query}': {e}")
                continue
        
        return subscription_emails
    
    def _extract_subscription_from_email(self, email_data: Dict, user_id: str) -> Optional[DetectedSubscription]:
        """Extract subscription information from email content"""
        try:
            headers = email_data['payload'].get('headers', [])
            subject = next((h['value'] for h in headers if h['name'] == 'Subject'), '')
            sender = next((h['value'] for h in headers if h['name'] == 'From'), '')
            
            # Get email body
            body = self._extract_email_body(email_data['payload'])
            
            # Extract subscription details
            merchant_name = self._extract_merchant_from_email(sender, subject, body)
            amount = self._extract_amount_from_email(body)
            billing_cycle = self._extract_billing_cycle_from_email(body)
            
            if merchant_name and amount:
                category, confidence = self._classify_merchant(merchant_name)
                
                return DetectedSubscription(
                    merchant_name=merchant_name,
                    service_name=self._get_service_name(merchant_name),
                    amount=Decimal(str(amount)),
                    billing_cycle=billing_cycle or 'monthly',
                    category=category,
                    confidence_score=confidence * 0.8,  # Email detection is slightly less reliable
                    detection_source='email',
                    last_transaction_date=None,
                    next_billing_date=None,
                    cancellation_info=self._get_cancellation_info(merchant_name)
                )
                
        except Exception as e:
            self.logger.error(f"Error extracting subscription from email: {e}")
            
        return None
    
    def _extract_email_body(self, payload: Dict) -> str:
        """Extract text content from email payload"""
        body = ""
        
        if 'parts' in payload:
            for part in payload['parts']:
                if part['mimeType'] == 'text/plain':
                    data = part['body']['data']
                    body += self._decode_base64(data)
        elif payload['mimeType'] == 'text/plain':
            data = payload['body']['data']
            body = self._decode_base64(data)
        
        return body
    
    def _decode_base64(self, data: str) -> str:
        """Decode base64 email content"""
        import base64
        return base64.urlsafe_b64decode(data).decode('utf-8')
    
    def _extract_merchant_from_email(self, sender: str, subject: str, body: str) -> Optional[str]:
        """Extract merchant name from email content"""
        # Try to extract from sender domain
        if '@' in sender:
            domain = sender.split('@')[1].lower()
            domain_parts = domain.split('.')
            if len(domain_parts) >= 2:
                merchant = domain_parts[-2]
                if merchant not in ['gmail', 'yahoo', 'outlook', 'hotmail']:
                    return merchant.title()
        
        # Try to extract from subject
        for category_data in self.subscription_patterns.values():
            for pattern in category_data['patterns']:
                match = re.search(pattern, subject.lower())
                if match:
                    return match.group(0).title()
        
        return None
    
    def _extract_amount_from_email(self, body: str) -> Optional[float]:
        """Extract payment amount from email body"""
        for pattern in self.email_patterns['amount_patterns']:
            match = re.search(pattern, body, re.IGNORECASE)
            if match:
                try:
                    return float(match.group(1))
                except (ValueError, IndexError):
                    continue
        return None
    
    def _extract_billing_cycle_from_email(self, body: str) -> Optional[str]:
        """Extract billing cycle from email content"""
        body_lower = body.lower()
        
        if any(word in body_lower for word in ['monthly', 'month', '/mo']):
            return 'monthly'
        elif any(word in body_lower for word in ['annual', 'yearly', 'year', '/yr']):
            return 'annual'
        elif any(word in body_lower for word in ['weekly', 'week']):
            return 'weekly'
        elif any(word in body_lower for word in ['quarterly', 'quarter']):
            return 'quarterly'
        
        return None
    
    def _get_service_name(self, merchant_name: str) -> Optional[str]:
        """Get proper service name for known merchants"""
        service_names = {
            'netflix': 'Netflix',
            'spotify': 'Spotify',
            'adobe': 'Adobe Creative Cloud',
            'microsoft': 'Microsoft 365',
            'apple': 'Apple Services',
            'google': 'Google Workspace',
            'amazon': 'Amazon Prime'
        }
        
        merchant_lower = merchant_name.lower()
        for key, name in service_names.items():
            if key in merchant_lower:
                return name
        
        return None
    
    def _get_cancellation_info(self, merchant_name: str) -> Optional[Dict]:
        """Get cancellation information for known services"""
        cancellation_info = {
            'netflix': {
                'method': 'web',
                'url': 'https://www.netflix.com/account',
                'instructions': 'Sign in to your account and go to Account settings'
            },
            'spotify': {
                'method': 'web',
                'url': 'https://www.spotify.com/account/subscription/',
                'instructions': 'Log in and manage your subscription'
            },
            'adobe': {
                'method': 'web',
                'url': 'https://account.adobe.com/plans',
                'instructions': 'Sign in to Adobe account and manage plans'
            }
        }
        
        merchant_lower = merchant_name.lower()
        for key, info in cancellation_info.items():
            if key in merchant_lower:
                return info
        
        return None
    
    async def merge_detected_subscriptions(self, bank_subscriptions: List[DetectedSubscription], 
                                         email_subscriptions: List[DetectedSubscription]) -> List[DetectedSubscription]:
        """
        Merge and deduplicate subscriptions detected from different sources
        
        Args:
            bank_subscriptions: Subscriptions detected from bank transactions
            email_subscriptions: Subscriptions detected from emails
            
        Returns:
            Merged and deduplicated list of subscriptions
        """
        merged_subscriptions = []
        processed_merchants = set()
        
        # Process bank subscriptions first (higher confidence)
        for bank_sub in bank_subscriptions:
            merchant_key = bank_sub.merchant_name.lower()
            
            # Look for matching email subscription
            matching_email = None
            for email_sub in email_subscriptions:
                if email_sub.merchant_name.lower() == merchant_key:
                    matching_email = email_sub
                    break
            
            if matching_email:
                # Merge information from both sources
                merged_sub = self._merge_subscription_data(bank_sub, matching_email)
                merged_subscriptions.append(merged_sub)
            else:
                merged_subscriptions.append(bank_sub)
            
            processed_merchants.add(merchant_key)
        
        # Add email-only subscriptions
        for email_sub in email_subscriptions:
            merchant_key = email_sub.merchant_name.lower()
            if merchant_key not in processed_merchants:
                merged_subscriptions.append(email_sub)
        
        return merged_subscriptions
    
    def _merge_subscription_data(self, bank_sub: DetectedSubscription, 
                               email_sub: DetectedSubscription) -> DetectedSubscription:
        """Merge subscription data from bank and email sources"""
        return DetectedSubscription(
            merchant_name=bank_sub.merchant_name,
            service_name=email_sub.service_name or bank_sub.service_name,
            amount=bank_sub.amount,  # Bank data is more reliable for amounts
            billing_cycle=bank_sub.billing_cycle,
            category=bank_sub.category,
            confidence_score=min(bank_sub.confidence_score + 0.1, 1.0),  # Boost confidence
            detection_source='both',
            last_transaction_date=bank_sub.last_transaction_date,
            next_billing_date=bank_sub.next_billing_date,
            cancellation_info=email_sub.cancellation_info or bank_sub.cancellation_info
        )


    async def discover_subscriptions_from_email(self, user_id: str, gmail_credentials: Dict) -> List[DetectedSubscription]:
        """
        Discover subscriptions from email using Gmail API OAuth
        
        Args:
            user_id: User identifier
            gmail_credentials: Gmail OAuth credentials
            
        Returns:
            List of detected subscriptions from email analysis
        """
        detected_subscriptions = []
        
        try:
            # Build Gmail service
            service = build('gmail', 'v1', credentials=gmail_credentials)
            
            # Search for subscription-related emails
            subscription_queries = [
                'subject:(subscription OR billing OR invoice OR receipt)',
                'from:(noreply OR billing OR support) subject:(payment OR charge)',
                'subject:(trial OR premium OR upgrade OR renewal)',
                'body:(monthly OR annual OR recurring OR auto-renew)',
                'subject:(welcome OR thank you) body:(subscription OR plan)'
            ]
            
            all_messages = []
            for query in subscription_queries:
                try:
                    # Search messages with date filter (last 6 months)
                    six_months_ago = (datetime.now() - timedelta(days=180)).strftime('%Y/%m/%d')
                    full_query = f"{query} after:{six_months_ago}"
                    
                    results = service.users().messages().list(
                        userId='me',
                        q=full_query,
                        maxResults=100
                    ).execute()
                    
                    messages = results.get('messages', [])
                    all_messages.extend(messages)
                    
                except Exception as e:
                    self.logger.error(f"Error searching emails with query '{query}': {e}")
                    continue
            
            # Remove duplicates
            unique_messages = {msg['id']: msg for msg in all_messages}.values()
            
            # Analyze each message for subscription information
            for message in unique_messages:
                try:
                    subscription = await self._analyze_email_for_subscription(
                        service, message['id'], user_id
                    )
                    if subscription:
                        detected_subscriptions.append(subscription)
                        
                except Exception as e:
                    self.logger.error(f"Error analyzing email {message['id']}: {e}")
                    continue
                    
        except HttpError as e:
            self.logger.error(f"Gmail API error: {e}")
        except Exception as e:
            self.logger.error(f"Error in email discovery: {e}")
        
        return detected_subscriptions
    
    async def _analyze_email_for_subscription(self, service, message_id: str, user_id: str) -> Optional[DetectedSubscription]:
        """Analyze individual email message for subscription information"""
        try:
            # Get full message
            message = service.users().messages().get(
                userId='me',
                id=message_id,
                format='full'
            ).execute()
            
            # Extract headers
            headers = {h['name'].lower(): h['value'] for h in message['payload'].get('headers', [])}
            subject = headers.get('subject', '')
            sender = headers.get('from', '')
            date_str = headers.get('date', '')
            
            # Parse date
            message_date = None
            if date_str:
                try:
                    # Parse RFC 2822 date format
                    from email.utils import parsedate_to_datetime
                    message_date = parsedate_to_datetime(date_str)
                except:
                    pass
            
            # Extract email body
            body_text = self._extract_email_body(message['payload'])
            
            # Analyze content for subscription information
            subscription_info = self._extract_subscription_info_from_email(
                subject, sender, body_text, message_date
            )
            
            if subscription_info:
                return DetectedSubscription(
                    merchant_name=subscription_info['merchant_name'],
                    service_name=subscription_info.get('service_name'),
                    amount=subscription_info['amount'],
                    billing_cycle=subscription_info['billing_cycle'],
                    category=subscription_info['category'],
                    confidence_score=subscription_info['confidence_score'],
                    detection_source='email',
                    last_transaction_date=message_date,
                    next_billing_date=subscription_info.get('next_billing_date'),
                    cancellation_info=subscription_info.get('cancellation_info')
                )
                
        except Exception as e:
            self.logger.error(f"Error analyzing email message {message_id}: {e}")
            
        return None
    
    def _extract_email_body(self, payload: Dict) -> str:
        """Extract text content from email payload"""
        body_text = ""
        
        def extract_text_from_part(part):
            nonlocal body_text
            
            if part.get('mimeType') == 'text/plain':
                data = part.get('body', {}).get('data', '')
                if data:
                    import base64
                    decoded = base64.urlsafe_b64decode(data + '===').decode('utf-8', errors='ignore')
                    body_text += decoded + "\n"
            
            elif part.get('mimeType') == 'text/html':
                data = part.get('body', {}).get('data', '')
                if data:
                    import base64
                    from bs4 import BeautifulSoup
                    decoded = base64.urlsafe_b64decode(data + '===').decode('utf-8', errors='ignore')
                    soup = BeautifulSoup(decoded, 'html.parser')
                    body_text += soup.get_text() + "\n"
            
            # Handle multipart messages
            if 'parts' in part:
                for subpart in part['parts']:
                    extract_text_from_part(subpart)
        
        extract_text_from_part(payload)
        return body_text.strip()
    
    def _extract_subscription_info_from_email(self, subject: str, sender: str, body: str, date: Optional[datetime]) -> Optional[Dict]:
        """Extract subscription information from email content"""
        try:
            # Combine all text for analysis
            full_text = f"{subject} {sender} {body}".lower()
            
            # Extract merchant name from sender
            merchant_name = self._extract_merchant_from_sender(sender)
            if not merchant_name:
                merchant_name = self._extract_merchant_from_subject(subject)
            
            if not merchant_name:
                return None
            
            # Extract amount using regex patterns
            amount = self._extract_amount_from_text(full_text)
            if not amount:
                return None
            
            # Determine billing cycle
            billing_cycle = self._extract_billing_cycle_from_text(full_text)
            
            # Classify merchant category
            category, confidence = self._classify_merchant(merchant_name)
            
            # Boost confidence for email detection
            confidence = min(confidence + 0.1, 1.0)
            
            # Get service name and cancellation info
            service_name = self._get_service_name(merchant_name)
            cancellation_info = self._get_cancellation_info(merchant_name)
            
            # Calculate next billing date
            next_billing_date = None
            if date and billing_cycle:
                next_billing_date = self._calculate_next_billing_date_from_cycle(date, billing_cycle)
            
            return {
                'merchant_name': merchant_name.title(),
                'service_name': service_name,
                'amount': Decimal(str(amount)),
                'billing_cycle': billing_cycle,
                'category': category,
                'confidence_score': confidence,
                'next_billing_date': next_billing_date,
                'cancellation_info': cancellation_info
            }
            
        except Exception as e:
            self.logger.error(f"Error extracting subscription info from email: {e}")
            return None
    
    def _extract_merchant_from_sender(self, sender: str) -> Optional[str]:
        """Extract merchant name from email sender"""
        if not sender:
            return None
        
        # Remove email address part and clean up
        import re
        
        # Extract name before email address
        name_match = re.match(r'^([^<]+)', sender)
        if name_match:
            name = name_match.group(1).strip().strip('"')
            
            # Remove common email prefixes
            name = re.sub(r'^(no-?reply|support|billing|noreply)@?', '', name, flags=re.IGNORECASE)
            name = re.sub(r'\s+', ' ', name).strip()
            
            if len(name) > 2:
                return name
        
        # Extract domain name as fallback
        email_match = re.search(r'@([^.]+)', sender)
        if email_match:
            domain = email_match.group(1)
            # Skip generic domains
            if domain.lower() not in ['gmail', 'yahoo', 'hotmail', 'outlook', 'mail']:
                return domain.title()
        
        return None
    
    def _extract_merchant_from_subject(self, subject: str) -> Optional[str]:
        """Extract merchant name from email subject"""
        if not subject:
            return None
        
        # Look for patterns like "Your Netflix subscription" or "Spotify Premium"
        import re
        
        patterns = [
            r'your\s+([a-zA-Z]+)\s+(?:subscription|bill|invoice)',
            r'([a-zA-Z]+)\s+(?:premium|pro|plus|subscription)',
            r'thank you for choosing\s+([a-zA-Z]+)',
            r'welcome to\s+([a-zA-Z]+)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, subject, re.IGNORECASE)
            if match:
                merchant = match.group(1).strip()
                if len(merchant) > 2:
                    return merchant
        
        return None
    
    def _extract_amount_from_text(self, text: str) -> Optional[float]:
        """Extract monetary amount from text"""
        import re
        
        # Look for currency patterns
        patterns = [
            r'\$(\d+\.?\d*)',
            r'(\d+\.?\d*)\s*(?:usd|dollars?)',
            r'amount[:\s]*\$?(\d+\.?\d*)',
            r'total[:\s]*\$?(\d+\.?\d*)',
            r'charged[:\s]*\$?(\d+\.?\d*)',
            r'billed[:\s]*\$?(\d+\.?\d*)'
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                try:
                    amount = float(matches[0])
                    if 0.99 <= amount <= 999.99:  # Reasonable subscription range
                        return amount
                except ValueError:
                    continue
        
        return None
    
    def _extract_billing_cycle_from_text(self, text: str) -> str:
        """Extract billing cycle from text"""
        if any(word in text for word in ['monthly', 'month', '/mo']):
            return 'monthly'
        elif any(word in text for word in ['annual', 'yearly', 'year', '/yr']):
            return 'annual'
        elif any(word in text for word in ['weekly', 'week']):
            return 'weekly'
        elif any(word in text for word in ['quarterly', 'quarter']):
            return 'quarterly'
        else:
            return 'monthly'  # Default assumption
    
    def _calculate_next_billing_date_from_cycle(self, last_date: datetime, cycle: str) -> Optional[datetime]:
        """Calculate next billing date from cycle"""
        if not last_date:
            return None
        
        cycle_days = {
            'weekly': 7,
            'monthly': 30,
            'quarterly': 90,
            'annual': 365
        }
        
        days = cycle_days.get(cycle, 30)
        return last_date + timedelta(days=days)
    
    def setup_gmail_oauth(self, user_id: str) -> Optional[str]:
        """Setup Gmail OAuth flow and return authorization URL"""
        try:
            from google_auth_oauthlib.flow import Flow
            
            # OAuth 2.0 scopes for Gmail readonly access
            scopes = ['https://www.googleapis.com/auth/gmail.readonly']
            
            # Create flow from client secrets
            flow = Flow.from_client_config(
                {
                    "web": {
                        "client_id": os.getenv('GOOGLE_CLIENT_ID'),
                        "client_secret": os.getenv('GOOGLE_CLIENT_SECRET'),
                        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                        "token_uri": "https://oauth2.googleapis.com/token",
                        "redirect_uris": [f"{os.getenv('BASE_URL', 'http://localhost:5000')}/api/discovery/gmail/callback"]
                    }
                },
                scopes=scopes
            )
            
            flow.redirect_uri = f"{os.getenv('BASE_URL', 'http://localhost:5000')}/api/discovery/gmail/callback"
            
            # Generate authorization URL
            auth_url, state = flow.authorization_url(
                access_type='offline',
                include_granted_scopes='true',
                state=user_id
            )
            
            # Store flow for later use (in production, use Redis or database)
            self._oauth_flows = getattr(self, '_oauth_flows', {})
            self._oauth_flows[state] = flow
            
            return auth_url
            
        except Exception as e:
            self.logger.error(f"Error setting up Gmail OAuth: {e}")
            return None
    
    def complete_gmail_oauth(self, state: str, code: str) -> Optional[Credentials]:
        """Complete Gmail OAuth flow and return credentials"""
        try:
            # Retrieve stored flow
            flows = getattr(self, '_oauth_flows', {})
            flow = flows.get(state)
            
            if not flow:
                self.logger.error(f"No OAuth flow found for state: {state}")
                return None
            
            # Exchange code for credentials
            flow.fetch_token(code=code)
            credentials = flow.credentials
            
            # Clean up stored flow
            del flows[state]
            
            return credentials
            
        except Exception as e:
            self.logger.error(f"Error completing Gmail OAuth: {e}")
            return None


    async def discover_all_subscriptions(self, user_id: str, bank_access_tokens: List[str] = None, 
                                       gmail_credentials: Dict = None) -> Dict:
        """
        Main method to discover subscriptions from all available sources
        
        Args:
            user_id: User identifier
            bank_access_tokens: List of Plaid access tokens (optional)
            gmail_credentials: Gmail OAuth credentials (optional)
            
        Returns:
            Dictionary containing discovered subscriptions and analysis
        """
        self.logger.info(f"Starting subscription discovery for user {user_id}")
        
        bank_subscriptions = []
        email_subscriptions = []
        
        # Discover from bank accounts if tokens provided
        if bank_access_tokens:
            self.logger.info(f"Discovering subscriptions from {len(bank_access_tokens)} bank accounts")
            bank_subscriptions = await self.discover_subscriptions_from_bank(user_id, bank_access_tokens)
            self.logger.info(f"Found {len(bank_subscriptions)} subscriptions from bank data")
        
        # Discover from email if credentials provided
        if gmail_credentials:
            self.logger.info("Discovering subscriptions from email")
            email_subscriptions = await self.discover_subscriptions_from_email(user_id, gmail_credentials)
            self.logger.info(f"Found {len(email_subscriptions)} subscriptions from email data")
        
        # Merge and deduplicate subscriptions
        merged_subscriptions = self._merge_subscription_sources(bank_subscriptions, email_subscriptions)
        
        # Analyze spending patterns
        analysis = self._analyze_subscription_patterns(merged_subscriptions)
        
        # Generate recommendations
        recommendations = self._generate_recommendations(merged_subscriptions, analysis)
        
        return {
            'subscriptions': [self._subscription_to_dict(sub) for sub in merged_subscriptions],
            'analysis': analysis,
            'recommendations': recommendations,
            'sources': {
                'bank_count': len(bank_subscriptions),
                'email_count': len(email_subscriptions),
                'total_unique': len(merged_subscriptions)
            }
        }
    
    def _merge_subscription_sources(self, bank_subs: List[DetectedSubscription], 
                                  email_subs: List[DetectedSubscription]) -> List[DetectedSubscription]:
        """Merge and deduplicate subscriptions from different sources"""
        merged = []
        
        # Start with bank subscriptions (usually more accurate for amounts)
        for bank_sub in bank_subs:
            merged.append(bank_sub)
        
        # Add email subscriptions, checking for duplicates
        for email_sub in email_subs:
            # Check if this subscription already exists from bank data
            duplicate_found = False
            
            for i, existing_sub in enumerate(merged):
                if self._are_subscriptions_duplicate(existing_sub, email_sub):
                    # Merge information from both sources
                    merged[i] = self._merge_duplicate_subscriptions(existing_sub, email_sub)
                    duplicate_found = True
                    break
            
            if not duplicate_found:
                merged.append(email_sub)
        
        # Sort by confidence score and amount
        merged.sort(key=lambda x: (x.confidence_score, float(x.amount)), reverse=True)
        
        return merged
    
    def _are_subscriptions_duplicate(self, sub1: DetectedSubscription, sub2: DetectedSubscription) -> bool:
        """Check if two subscriptions are likely the same service"""
        # Normalize merchant names for comparison
        name1 = sub1.merchant_name.lower().strip()
        name2 = sub2.merchant_name.lower().strip()
        
        # Direct name match
        if name1 == name2:
            return True
        
        # Check if one name contains the other
        if name1 in name2 or name2 in name1:
            return True
        
        # Check for common variations
        variations = {
            'netflix': ['netflix.com', 'netflix inc'],
            'spotify': ['spotify.com', 'spotify ab'],
            'amazon': ['amazon.com', 'amzn', 'amazon prime'],
            'apple': ['apple.com', 'itunes', 'app store'],
            'google': ['google.com', 'youtube', 'google play'],
            'microsoft': ['microsoft.com', 'msft', 'office 365']
        }
        
        for base_name, variants in variations.items():
            if (base_name in name1 or any(v in name1 for v in variants)) and \
               (base_name in name2 or any(v in name2 for v in variants)):
                return True
        
        # Check if amounts are very similar (within $1)
        if abs(float(sub1.amount) - float(sub2.amount)) <= 1.0:
            # And billing cycles match
            if sub1.billing_cycle == sub2.billing_cycle:
                # And categories are similar
                if sub1.category == sub2.category:
                    return True
        
        return False
    
    def _merge_duplicate_subscriptions(self, sub1: DetectedSubscription, sub2: DetectedSubscription) -> DetectedSubscription:
        """Merge information from duplicate subscriptions"""
        # Prefer bank data for amount accuracy, email data for service details
        bank_sub = sub1 if sub1.detection_source == 'bank' else sub2
        email_sub = sub2 if sub2.detection_source == 'email' else sub1
        
        # Use bank amount if available, otherwise email
        amount = bank_sub.amount if bank_sub.detection_source == 'bank' else email_sub.amount
        
        # Use more detailed merchant name
        merchant_name = max(bank_sub.merchant_name, email_sub.merchant_name, key=len)
        
        # Combine service names
        service_name = email_sub.service_name or bank_sub.service_name
        
        # Use highest confidence score
        confidence = max(bank_sub.confidence_score, email_sub.confidence_score)
        
        # Prefer bank billing cycle if available
        billing_cycle = bank_sub.billing_cycle if bank_sub.detection_source == 'bank' else email_sub.billing_cycle
        
        # Use most recent transaction date
        last_date = max(
            bank_sub.last_transaction_date or datetime.min.replace(tzinfo=None),
            email_sub.last_transaction_date or datetime.min.replace(tzinfo=None)
        )
        if last_date == datetime.min.replace(tzinfo=None):
            last_date = None
        
        # Combine cancellation info
        cancellation_info = bank_sub.cancellation_info or email_sub.cancellation_info
        
        return DetectedSubscription(
            merchant_name=merchant_name,
            service_name=service_name,
            amount=amount,
            billing_cycle=billing_cycle,
            category=bank_sub.category,  # Prefer bank category
            confidence_score=min(confidence + 0.1, 1.0),  # Boost for multiple sources
            detection_source='both',
            last_transaction_date=last_date,
            next_billing_date=bank_sub.next_billing_date or email_sub.next_billing_date,
            cancellation_info=cancellation_info,
            plaid_stream_id=bank_sub.plaid_stream_id if bank_sub.detection_source == 'bank' else None
        )
    
    def _analyze_subscription_patterns(self, subscriptions: List[DetectedSubscription]) -> Dict:
        """Analyze subscription spending patterns and trends"""
        if not subscriptions:
            return {
                'total_monthly': 0,
                'total_annual': 0,
                'category_breakdown': {},
                'billing_cycle_breakdown': {},
                'average_subscription': 0,
                'highest_subscription': None,
                'unused_trials': []
            }
        
        # Calculate totals
        monthly_total = 0
        annual_total = 0
        
        for sub in subscriptions:
            amount = float(sub.amount)
            if sub.billing_cycle == 'monthly':
                monthly_total += amount
                annual_total += amount * 12
            elif sub.billing_cycle == 'annual':
                annual_total += amount
                monthly_total += amount / 12
            elif sub.billing_cycle == 'weekly':
                weekly_amount = amount
                monthly_total += weekly_amount * 4.33  # Average weeks per month
                annual_total += weekly_amount * 52
            elif sub.billing_cycle == 'quarterly':
                quarterly_amount = amount
                monthly_total += quarterly_amount / 3
                annual_total += quarterly_amount * 4
        
        # Category breakdown
        category_breakdown = {}
        for sub in subscriptions:
            category = sub.category
            if category not in category_breakdown:
                category_breakdown[category] = {'count': 0, 'monthly_cost': 0}
            
            category_breakdown[category]['count'] += 1
            
            # Convert to monthly cost
            amount = float(sub.amount)
            if sub.billing_cycle == 'monthly':
                monthly_cost = amount
            elif sub.billing_cycle == 'annual':
                monthly_cost = amount / 12
            elif sub.billing_cycle == 'weekly':
                monthly_cost = amount * 4.33
            elif sub.billing_cycle == 'quarterly':
                monthly_cost = amount / 3
            else:
                monthly_cost = amount  # Default to monthly
            
            category_breakdown[category]['monthly_cost'] += monthly_cost
        
        # Billing cycle breakdown
        billing_breakdown = {}
        for sub in subscriptions:
            cycle = sub.billing_cycle
            billing_breakdown[cycle] = billing_breakdown.get(cycle, 0) + 1
        
        # Find highest subscription
        highest_sub = max(subscriptions, key=lambda x: float(x.amount)) if subscriptions else None
        
        # Detect potential unused trials (low confidence, recent)
        unused_trials = [
            sub for sub in subscriptions 
            if sub.confidence_score < 0.7 and 
            sub.last_transaction_date and 
            (datetime.now() - sub.last_transaction_date).days < 30
        ]
        
        return {
            'total_monthly': round(monthly_total, 2),
            'total_annual': round(annual_total, 2),
            'category_breakdown': category_breakdown,
            'billing_cycle_breakdown': billing_breakdown,
            'average_subscription': round(monthly_total / len(subscriptions), 2) if subscriptions else 0,
            'highest_subscription': {
                'name': highest_sub.merchant_name,
                'amount': float(highest_sub.amount),
                'cycle': highest_sub.billing_cycle
            } if highest_sub else None,
            'subscription_count': len(subscriptions),
            'unused_trials': len(unused_trials)
        }
    
    def _generate_recommendations(self, subscriptions: List[DetectedSubscription], analysis: Dict) -> List[Dict]:
        """Generate recommendations for subscription management"""
        recommendations = []
        
        # High spending recommendation
        if analysis['total_monthly'] > 100:
            recommendations.append({
                'type': 'high_spending',
                'title': 'High Monthly Subscription Spending',
                'description': f"You're spending ${analysis['total_monthly']:.2f} monthly on subscriptions. Consider reviewing and canceling unused services.",
                'priority': 'high',
                'potential_savings': analysis['total_monthly'] * 0.2  # Assume 20% potential savings
            })
        
        # Duplicate services recommendation
        categories_with_multiple = {k: v for k, v in analysis['category_breakdown'].items() if v['count'] > 1}
        if categories_with_multiple:
            for category, data in categories_with_multiple.items():
                if data['count'] > 2:  # More than 2 services in same category
                    recommendations.append({
                        'type': 'duplicate_services',
                        'title': f'Multiple {category.title()} Services',
                        'description': f"You have {data['count']} {category} subscriptions costing ${data['monthly_cost']:.2f}/month. Consider consolidating.",
                        'priority': 'medium',
                        'potential_savings': data['monthly_cost'] * 0.5
                    })
        
        # Annual billing recommendation
        monthly_subs = [sub for sub in subscriptions if sub.billing_cycle == 'monthly' and float(sub.amount) > 10]
        if len(monthly_subs) >= 3:
            potential_savings = sum(float(sub.amount) * 2 for sub in monthly_subs)  # Assume 2 months savings per year
            recommendations.append({
                'type': 'annual_billing',
                'title': 'Switch to Annual Billing',
                'description': f"Consider switching {len(monthly_subs)} monthly subscriptions to annual billing for potential savings.",
                'priority': 'low',
                'potential_savings': potential_savings
            })
        
        # Unused trials recommendation
        if analysis['unused_trials'] > 0:
            recommendations.append({
                'type': 'unused_trials',
                'title': 'Potential Unused Trials',
                'description': f"You have {analysis['unused_trials']} recent subscriptions that might be free trials. Review before they convert to paid.",
                'priority': 'high',
                'potential_savings': 0  # Prevent future charges
            })
        
        # Sort by priority
        priority_order = {'high': 3, 'medium': 2, 'low': 1}
        recommendations.sort(key=lambda x: priority_order.get(x['priority'], 0), reverse=True)
        
        return recommendations
    
    def _subscription_to_dict(self, subscription: DetectedSubscription) -> Dict:
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
            'cancellation_info': subscription.cancellation_info,
            'plaid_stream_id': subscription.plaid_stream_id
        }

