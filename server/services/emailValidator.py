#!/usr/bin/env python3
"""
Enhanced Email Validation Service
Provides comprehensive email validation using:
1. Syntax validation (RFC 5322)
2. DNS MX record verification
3. SMTP server connectivity check
"""

import re
import dns.resolver
import smtplib
import socket
import sys
import json
from typing import Dict, List, Any
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

class EmailValidator:
    def __init__(self):
        self.timeout = 10  # SMTP timeout in seconds
        
    def validate_syntax(self, email: str) -> bool:
        """Validate email syntax using RFC 5322 compliant regex"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))
    
    def check_dns_mx(self, domain: str) -> Dict[str, Any]:
        """Check if domain has valid MX records"""
        try:
            mx_records = dns.resolver.resolve(domain, 'MX')
            mx_list = []
            for mx in mx_records:
                mx_list.append({
                    'priority': mx.preference,
                    'exchange': str(mx.exchange).rstrip('.')
                })
            return {
                'valid': True,
                'mx_records': sorted(mx_list, key=lambda x: x['priority'])
            }
        except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer, Exception):
            return {'valid': False, 'mx_records': []}
    
    def check_smtp_deliverability(self, email: str, mx_records: List[Dict]) -> Dict[str, Any]:
        """Check SMTP server connectivity and email deliverability"""
        if not mx_records:
            return {'valid': False, 'reason': 'No MX records found'}
        
        domain = email.split('@')[1]
        
        for mx_record in mx_records:
            mx_server = mx_record['exchange']
            
            try:
                # Connect to SMTP server
                server = smtplib.SMTP(timeout=self.timeout)
                server.set_debuglevel(0)  # Disable debug output
                
                # Connect and say hello
                server.connect(mx_server, 25)
                server.helo('emailvalidator.com')  # Use a generic domain
                
                # Check if server accepts mail for this domain
                code, message = server.mail('test@emailvalidator.com')
                if code != 250:
                    server.quit()
                    continue
                
                # Check specific email address
                code, message = server.rcpt(email)
                server.quit()
                
                if code == 250:
                    return {
                        'valid': True,
                        'mx_server': mx_server,
                        'smtp_response': message.decode() if isinstance(message, bytes) else str(message)
                    }
                elif code == 550:
                    return {
                        'valid': False,
                        'reason': 'Email address does not exist',
                        'mx_server': mx_server,
                        'smtp_code': code
                    }
                elif code == 451 or code == 452:
                    return {
                        'valid': True,  # Temporary failure, assume valid
                        'reason': 'Temporary server issue',
                        'mx_server': mx_server,
                        'smtp_code': code
                    }
                else:
                    continue  # Try next MX server
                    
            except (smtplib.SMTPException, socket.error, TimeoutError) as e:
                continue  # Try next MX server
        
        return {
            'valid': False,
            'reason': 'Unable to connect to any SMTP server'
        }
    
    def validate_email(self, email: str) -> Dict[str, Any]:
        """Comprehensive email validation"""
        email = email.strip().lower()
        
        result = {
            'email': email,
            'valid': False,
            'checks': {
                'syntax': False,
                'dns': False,
                'smtp': False
            },
            'details': {}
        }
        
        # 1. Syntax validation
        if not self.validate_syntax(email):
            result['details']['syntax_error'] = 'Invalid email format'
            return result
        
        result['checks']['syntax'] = True
        
        # 2. Extract domain and check DNS
        domain = email.split('@')[1]
        dns_result = self.check_dns_mx(domain)
        
        if not dns_result['valid']:
            result['details']['dns_error'] = 'No MX records found for domain'
            return result
        
        result['checks']['dns'] = True
        result['details']['mx_records'] = dns_result['mx_records']
        
        # 3. SMTP deliverability check
        smtp_result = self.check_smtp_deliverability(email, dns_result['mx_records'])
        
        if smtp_result['valid']:
            result['checks']['smtp'] = True
            result['valid'] = True
            result['details']['smtp'] = smtp_result
        else:
            result['details']['smtp_error'] = smtp_result.get('reason', 'SMTP check failed')
            result['details']['smtp'] = smtp_result
        
        return result
    
    def validate_bulk(self, emails: List[str]) -> List[Dict[str, Any]]:
        """Validate multiple emails"""
        results = []
        for email in emails:
            results.append(self.validate_email(email))
        return results

def main():
    """Command line interface for email validation"""
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No email provided"}))
        sys.exit(1)
    
    # Parse arguments
    if sys.argv[1] == '--bulk':
        # Bulk validation mode
        emails = sys.argv[2:]
        validator = EmailValidator()
        results = validator.validate_bulk(emails)
        print(json.dumps(results, indent=2))
    else:
        # Single email validation
        email = sys.argv[1]
        validator = EmailValidator()
        result = validator.validate_email(email)
        print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()