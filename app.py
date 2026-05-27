import webview
import imaplib
import smtplib
import email
from email.message import EmailMessage
from email.header import decode_header
import sys
import os

class AppState:
    def __init__(self):
        self.email_address = None
        self.password = None
        self.imap_server = None

state = AppState()

class MailApi:
    def login(self, email_addr, pwd):
        if not email_addr or not pwd:
            return {'success': False, 'message': 'Missing credentials'}
            
        try:
            imap = imaplib.IMAP4_SSL("imap.gmail.com")
            imap.login(email_addr, pwd)
            
            state.email_address = email_addr
            state.password = pwd
            state.imap_server = imap
            
            return {'success': True}
        except imaplib.IMAP4.error:
            return {'success': False, 'message': 'Login failed. Check credentials.'}
        except Exception as e:
            return {'success': False, 'message': str(e)}

    def get_emails(self):
        if not state.imap_server:
            return {'success': False, 'message': 'Not logged in'}
            
        try:
            try:
                state.imap_server.noop()
            except:
                state.imap_server = imaplib.IMAP4_SSL("imap.gmail.com")
                state.imap_server.login(state.email_address, state.password)
                
            state.imap_server.select("inbox")
            status, messages = state.imap_server.search(None, "ALL")
            
            if status == "OK":
                mail_ids = messages[0].split()
                latest_ids = mail_ids[-20:]
                
                parsed_emails = []
                for num in reversed(latest_ids):
                    res, data = state.imap_server.fetch(num, "(RFC822)")
                    for response_part in data:
                        if isinstance(response_part, tuple):
                            msg = email.message_from_bytes(response_part[1])
                            
                            subject, encoding = decode_header(msg.get("Subject", ""))[0]
                            if isinstance(subject, bytes):
                                subject = subject.decode(encoding if encoding else "utf-8", errors="ignore")
                                
                            from_, encoding = decode_header(msg.get("From", ""))[0]
                            if isinstance(from_, bytes):
                                from_ = from_.decode(encoding if encoding else "utf-8", errors="ignore")
                                
                            date_ = msg.get("Date", "")
                            
                            html_body = ""
                            plain_body = ""
                            
                            if msg.is_multipart():
                                for part in msg.walk():
                                    content_type = part.get_content_type()
                                    if content_type == "text/html":
                                        payload = part.get_payload(decode=True)
                                        if payload:
                                            html_body += payload.decode("utf-8", errors="ignore")
                                    elif content_type == "text/plain":
                                        payload = part.get_payload(decode=True)
                                        if payload:
                                            plain_body += payload.decode("utf-8", errors="ignore")
                            else:
                                payload = msg.get_payload(decode=True)
                                if payload:
                                    if msg.get_content_type() == "text/html":
                                        html_body = payload.decode("utf-8", errors="ignore")
                                    else:
                                        plain_body = payload.decode("utf-8", errors="ignore")
                                        
                            body = html_body if html_body else f"<pre style='font-family: inherit; white-space: pre-wrap;'>{plain_body}</pre>"
                                    
                            parsed_emails.append({
                                "id": num.decode(),
                                "from": from_,
                                "subject": subject if subject else "(No Subject)",
                                "date": date_,
                                "body": body
                            })
                            
                return {'success': True, 'emails': parsed_emails}
        except Exception as e:
            return {'success': False, 'message': str(e)}

    def send_email(self, to_addr, subj, body):
        if not state.email_address:
            return {'success': False, 'message': 'Not logged in'}
            
        if not to_addr or not body:
            return {'success': False, 'message': 'Recipient and Body are required.'}
            
        try:
            msg = EmailMessage()
            msg.set_content(body)
            msg["Subject"] = subj
            msg["From"] = state.email_address
            msg["To"] = to_addr
            
            with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
                server.login(state.email_address, state.password)
                server.send_message(msg)
                
            return {'success': True}
        except Exception as e:
            return {'success': False, 'message': str(e)}

    def delete_email(self, email_id):
        if not state.imap_server:
            return {'success': False, 'message': 'Not logged in'}
            
        if not email_id:
            return {'success': False, 'message': 'Email ID is required.'}
            
        try:
            state.imap_server.select("inbox")
            state.imap_server.store(email_id.encode(), '+FLAGS', '\\Deleted')
            state.imap_server.expunge()
            return {'success': True}
        except Exception as e:
            return {'success': False, 'message': str(e)}

    def logout(self):
        try:
            if state.imap_server:
                state.imap_server.logout()
        except:
            pass
        finally:
            state.imap_server = None
            state.email_address = None
            state.password = None
        return {'success': True}

if __name__ == '__main__':
    if getattr(sys, 'frozen', False):
        base_dir = sys._MEIPASS
    else:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        
    index_path = os.path.join(base_dir, 'templates', 'index.html')
    
    # We replace backslashes to ensure the file:// URI works smoothly on Windows
    index_uri = index_path.replace('\\', '/')
    
    api = MailApi()
    
    webview.create_window('Mail Client', url=f'file:///{index_uri}', js_api=api, width=1100, height=750, min_size=(800, 600))
    webview.start()
