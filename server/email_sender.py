#!/usr/bin/env python3

import smtplib
import sys
import json
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import argparse
import traceback

def send_email(smtp_host, smtp_port, smtp_username, smtp_password, from_email, from_name, to_email, subject, html_body, tracking_pixel_id=None):
    """
    Send email using SMTP with tracking capabilities
    """
    try:
        print(f"Setting up SMTP connection to {smtp_host}:{smtp_port}")
        
        # Create message
        msg = MIMEMultipart('alternative')
        msg['From'] = f'"{from_name}" <{from_email}>' if from_name else from_email
        msg['To'] = to_email
        msg['Subject'] = subject
        
        # Add tracking pixel if provided
        if tracking_pixel_id:
            # Get the correct domain from environment or use default
            import os
            replit_domains = os.environ.get('REPLIT_DOMAINS', 'localhost:5000')
            domain = replit_domains.split(',')[0] if ',' in replit_domains else replit_domains
            
            # Simple link replacement for tracking (basic implementation)
            tracked_html = html_body
            
            # Add tracking pixel at the end with proper domain
            if domain.startswith('localhost'):
                protocol = 'http'
            else:
                protocol = 'https'
            
            tracked_html += f'<img src="{protocol}://{domain}/api/track/pixel/{tracking_pixel_id}" width="1" height="1" style="display:none;" alt="" />'
            
            html_body = tracked_html
            print(f"Added tracking pixel: {protocol}://{domain}/api/track/pixel/{tracking_pixel_id}")
        
        # Create HTML part
        html_part = MIMEText(html_body, 'html')
        msg.attach(html_part)
        
        # Create text part (strip HTML)
        import re
        text_body = re.sub('<[^<]+?>', '', html_body)
        text_part = MIMEText(text_body, 'plain')
        msg.attach(text_part)
        
        # Setup SMTP connection
        if smtp_port == 465:
            # Use SSL
            server = smtplib.SMTP_SSL(smtp_host, smtp_port)
        else:
            # Use TLS
            server = smtplib.SMTP(smtp_host, smtp_port)
            server.starttls()
        
        # Enable debug output
        server.set_debuglevel(1)
        
        # Login
        print(f"Logging in with username: {smtp_username}")
        server.login(smtp_username, smtp_password)
        
        # Send email
        print(f"Sending email from {from_email} to {to_email}")
        server.send_message(msg)
        
        # Close connection
        server.quit()
        
        print(f"Email sent successfully to {to_email}")
        return True
        
    except Exception as e:
        print(f"Error sending email: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        return False

def main():
    parser = argparse.ArgumentParser(description='Send email via SMTP')
    parser.add_argument('--config', required=True, help='JSON config string')
    
    args = parser.parse_args()
    
    try:
        config = json.loads(args.config)
        
        result = send_email(
            smtp_host=config['smtp_host'],
            smtp_port=config['smtp_port'],
            smtp_username=config['smtp_username'],
            smtp_password=config['smtp_password'],
            from_email=config['from_email'],
            from_name=config.get('from_name', ''),
            to_email=config['to_email'],
            subject=config['subject'],
            html_body=config['html_body'],
            tracking_pixel_id=config.get('tracking_pixel_id')
        )
        
        if result:
            print("SUCCESS")
            sys.exit(0)
        else:
            print("FAILED")
            sys.exit(1)
            
    except Exception as e:
        print(f"Error parsing config or sending email: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        sys.exit(1)

if __name__ == "__main__":
    main()