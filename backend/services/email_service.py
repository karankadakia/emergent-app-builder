from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from config import settings
from utils.logger import setup_logger
from utils.retry import retry_async

logger = setup_logger(__name__)


class EmailService:
    """Email service using SendGrid"""
    
    def __init__(self):
        self.api_key = settings.sendgrid_api_key
        self.sender_email = settings.sender_email
    
    @retry_async(max_attempts=3, delay=1.0, exceptions=(Exception,))
    async def send_approval_notification(self, recipient_email: str, file_name: str, org_name: str, approver_name: str, status: str) -> bool:
        """Send approval notification email"""
        if not self.api_key:
            logger.warning("SendGrid API key not configured. Email not sent.")
            return False
        
        try:
            subject = f"Data Conversion Approval {status.upper()}: {file_name}"
            
            html_content = f"""
            <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                        <h2 style="color: #0284C7; border-bottom: 2px solid #0284C7; padding-bottom: 10px;">Azure Data Transformer</h2>
                        
                        <p>Hello,</p>
                        
                        <p>The data conversion request for <strong>{file_name}</strong> has been <strong>{status}</strong>.</p>
                        
                        <div style="background-color: #f8fafc; padding: 15px; border-left: 4px solid #0284C7; margin: 20px 0;">
                            <p style="margin: 5px 0;"><strong>Organization:</strong> {org_name}</p>
                            <p style="margin: 5px 0;"><strong>File:</strong> {file_name}</p>
                            <p style="margin: 5px 0;"><strong>Status:</strong> {status.upper()}</p>
                            <p style="margin: 5px 0;"><strong>Reviewed By:</strong> {approver_name}</p>
                        </div>
                        
                        <p>Please log in to the Azure Data Transformer platform to view details.</p>
                        
                        <p style="margin-top: 30px; font-size: 12px; color: #64748b;">
                            This is an automated notification from Azure Data Transformer.
                        </p>
                    </div>
                </body>
            </html>
            """
            
            message = Mail(
                from_email=self.sender_email,
                to_emails=recipient_email,
                subject=subject,
                html_content=html_content
            )
            
            sg = SendGridAPIClient(self.api_key)
            response = sg.send(message)
            
            logger.info(f"Approval email sent to {recipient_email}. Status: {response.status_code}")
            return response.status_code == 202
            
        except Exception as e:
            logger.error(f"Failed to send email to {recipient_email}: {str(e)}")
            raise
    
    async def send_user_invitation(self, recipient_email: str, org_name: str, invited_by: str, temp_password: str) -> bool:
        """Send user invitation email"""
        if not self.api_key:
            logger.warning("SendGrid API key not configured. Email not sent.")
            return False
        
        try:
            subject = f"Invitation to join {org_name} on Azure Data Transformer"
            
            html_content = f"""
            <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                        <h2 style="color: #0284C7;">Welcome to Azure Data Transformer</h2>
                        
                        <p>You have been invited to join <strong>{org_name}</strong> by {invited_by}.</p>
                        
                        <div style="background-color: #f8fafc; padding: 15px; border-radius: 4px; margin: 20px 0;">
                            <p style="margin: 5px 0;"><strong>Email:</strong> {recipient_email}</p>
                            <p style="margin: 5px 0;"><strong>Temporary Password:</strong> <code style="background-color: #e2e8f0; padding: 2px 6px; border-radius: 3px;">{temp_password}</code></p>
                        </div>
                        
                        <p>Please log in and change your password immediately.</p>
                        
                        <p style="margin-top: 30px; font-size: 12px; color: #64748b;">
                            This is an automated invitation from Azure Data Transformer.
                        </p>
                    </div>
                </body>
            </html>
            """
            
            message = Mail(
                from_email=self.sender_email,
                to_emails=recipient_email,
                subject=subject,
                html_content=html_content
            )
            
            sg = SendGridAPIClient(self.api_key)
            response = sg.send(message)
            
            logger.info(f"Invitation email sent to {recipient_email}. Status: {response.status_code}")
            return response.status_code == 202
            
        except Exception as e:
            logger.error(f"Failed to send invitation to {recipient_email}: {str(e)}")
            return False


email_service = EmailService()
