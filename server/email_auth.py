import smtplib
import sys
import json
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_verification_email(smtp_config, to_email, verification_link, user_name=""):
    """Send email verification email using SMTP configuration"""
    try:
        # Create message
        msg = MIMEMultipart('alternative')
        msg['From'] = smtp_config['from_email']
        msg['To'] = to_email
        msg['Subject'] = "Verify Your Email Address"
        
        # HTML email content
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Email Verification</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #333; font-size: 24px;">Verify Your Email Address</h1>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
                <p style="color: #333; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
                    Hello {user_name if user_name else 'there'},
                </p>
                
                <p style="color: #333; font-size: 16px; line-height: 1.5; margin-bottom: 30px;">
                    Thanks for signing up! To complete your registration and start using our email marketing platform, 
                    please verify your email address by clicking the button below:
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{verification_link}" 
                       style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; 
                              border-radius: 5px; font-weight: bold; display: inline-block;">
                        Verify Email Address
                    </a>
                </div>
                
                <p style="color: #666; font-size: 14px; line-height: 1.5; margin-top: 30px;">
                    If the button above doesn't work, copy and paste this link into your browser:
                    <br>
                    <a href="{verification_link}" style="color: #007bff; word-break: break-all;">{verification_link}</a>
                </p>
                
                <p style="color: #666; font-size: 14px; line-height: 1.5; margin-top: 20px;">
                    This verification link will expire in 24 hours for security reasons.
                </p>
            </div>
            
            <div style="text-align: center; color: #666; font-size: 12px; margin-top: 30px;">
                <p>If you didn't create an account, you can safely ignore this email.</p>
            </div>
        </body>
        </html>
        """
        
        # Attach HTML content
        html_part = MIMEText(html_content, 'html')
        msg.attach(html_part)
        
        # Connect to SMTP server and send
        server = smtplib.SMTP(smtp_config['smtp_host'], smtp_config['smtp_port'])
        server.starttls()
        server.login(smtp_config['smtp_username'], smtp_config['smtp_password'])
        
        result = server.sendmail(smtp_config['from_email'], [to_email], msg.as_string())
        server.quit()
        
        print(f"✓ Verification email sent successfully to {to_email}")
        return True
        
    except Exception as e:
        print(f"✗ Failed to send verification email: {str(e)}")
        return False

def send_password_reset_email(smtp_config, to_email, reset_link, user_name=""):
    """Send password reset email using SMTP configuration"""
    try:
        # Create message
        msg = MIMEMultipart('alternative')
        msg['From'] = smtp_config['from_email']
        msg['To'] = to_email
        msg['Subject'] = "Reset Your Password"
        
        # HTML email content
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Password Reset</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #333; font-size: 24px;">Reset Your Password</h1>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
                <p style="color: #333; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
                    Hello {user_name if user_name else 'there'},
                </p>
                
                <p style="color: #333; font-size: 16px; line-height: 1.5; margin-bottom: 30px;">
                    We received a request to reset your password for your account. 
                    Click the button below to create a new password:
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_link}" 
                       style="background-color: #dc3545; color: white; padding: 12px 30px; text-decoration: none; 
                              border-radius: 5px; font-weight: bold; display: inline-block;">
                        Reset Password
                    </a>
                </div>
                
                <p style="color: #666; font-size: 14px; line-height: 1.5; margin-top: 30px;">
                    If the button above doesn't work, copy and paste this link into your browser:
                    <br>
                    <a href="{reset_link}" style="color: #dc3545; word-break: break-all;">{reset_link}</a>
                </p>
                
                <p style="color: #666; font-size: 14px; line-height: 1.5; margin-top: 20px;">
                    This password reset link will expire in 1 hour for security reasons.
                </p>
            </div>
            
            <div style="text-align: center; color: #666; font-size: 12px; margin-top: 30px;">
                <p>If you didn't request a password reset, you can safely ignore this email.</p>
            </div>
        </body>
        </html>
        """
        
        # Attach HTML content
        html_part = MIMEText(html_content, 'html')
        msg.attach(html_part)
        
        # Connect to SMTP server and send
        server = smtplib.SMTP(smtp_config['smtp_host'], smtp_config['smtp_port'])
        server.starttls()
        server.login(smtp_config['smtp_username'], smtp_config['smtp_password'])
        
        result = server.sendmail(smtp_config['from_email'], [to_email], msg.as_string())
        server.quit()
        
        print(f"✓ Password reset email sent successfully to {to_email}")
        return True
        
    except Exception as e:
        print(f"✗ Failed to send password reset email: {str(e)}")
        return False

def send_login_verification_email(smtp_config, to_email, verification_code, user_name="", ip_address="", location=""):
    """Send login verification email with code for new IP addresses"""
    try:
        # Create message
        msg = MIMEMultipart('alternative')
        msg['From'] = smtp_config['from_email']
        msg['To'] = to_email
        msg['Subject'] = "New Device Login Verification"
        
        # HTML email content
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Login Verification</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #333; font-size: 24px;">🔐 New Device Login Detected</h1>
            </div>
            
            <div style="background-color: #fff3cd; padding: 30px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ffc107;">
                <p style="color: #333; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
                    Hello {user_name if user_name else 'there'},
                </p>
                
                <p style="color: #333; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
                    We detected a login attempt from a new device or location:
                </p>
                
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                    <p style="color: #666; font-size: 14px; line-height: 1.5; margin: 5px 0;">
                        <strong>IP Address:</strong> {ip_address}
                    </p>
                    <p style="color: #666; font-size: 14px; line-height: 1.5; margin: 5px 0;">
                        <strong>Location:</strong> {location}
                    </p>
                </div>
                
                <p style="color: #333; font-size: 16px; line-height: 1.5; margin-bottom: 30px;">
                    To complete your login, please use the verification code below:
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <div style="background-color: #007bff; color: white; padding: 20px 30px; text-decoration: none; 
                                border-radius: 8px; font-weight: bold; display: inline-block; font-size: 32px; 
                                letter-spacing: 3px; font-family: monospace;">
                        {verification_code}
                    </div>
                </div>
                
                <p style="color: #666; font-size: 14px; line-height: 1.5; margin-top: 30px;">
                    This verification code will expire in 15 minutes for security reasons.
                </p>
            </div>
            
            <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #dc3545;">
                <p style="color: #721c24; font-size: 14px; line-height: 1.5; margin: 0;">
                    <strong>Security Notice:</strong> If this wasn't you, please secure your account immediately 
                    by changing your password and enabling two-factor authentication.
                </p>
            </div>
            
            <div style="text-align: center; color: #666; font-size: 12px; margin-top: 30px;">
                <p>This is an automated security email from our platform.</p>
            </div>
        </body>
        </html>
        """
        
        # Attach HTML content
        html_part = MIMEText(html_content, 'html')
        msg.attach(html_part)
        
        # Connect to SMTP server and send
        server = smtplib.SMTP(smtp_config['smtp_host'], smtp_config['smtp_port'])
        server.starttls()
        server.login(smtp_config['smtp_username'], smtp_config['smtp_password'])
        
        result = server.sendmail(smtp_config['from_email'], [to_email], msg.as_string())
        server.quit()
        
        print(f"✓ Login verification email sent successfully to {to_email}")
        return True
        
    except Exception as e:
        print(f"✗ Failed to send login verification email: {str(e)}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python email_auth.py <verification|reset|login_verification> <config_json>")
        sys.exit(1)
    
    email_type = sys.argv[1]
    config_json = sys.argv[2]
    
    try:
        config = json.loads(config_json)
        
        if email_type == "verification":
            success = send_verification_email(
                config['smtp_config'],
                config['to_email'],
                config['verification_link'],
                config.get('user_name', '')
            )
        elif email_type == "reset":
            success = send_password_reset_email(
                config['smtp_config'],
                config['to_email'],
                config['reset_link'],
                config.get('user_name', '')
            )
        elif email_type == "login_verification":
            success = send_login_verification_email(
                config['smtp_config'],
                config['to_email'],
                config['verification_code'],
                config.get('user_name', ''),
                config.get('ip_address', ''),
                config.get('location', '')
            )
        else:
            print(f"Unknown email type: {email_type}")
            sys.exit(1)
        
        sys.exit(0 if success else 1)
        
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)