import http.server
import socketserver
import os
import sys

# Ensure we serve the directory where this script is located
os.chdir(os.path.dirname(os.path.abspath(__file__)))

PORT = 8082
Handler = http.server.SimpleHTTPRequestHandler

print(f"Attempting to serve directory: {os.getcwd()}")
print(f"Server starting on http://localhost:{PORT}")
sys.stdout.flush()

try:
    # Allow address reuse to avoid "Address already in use" errors on restart
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Serving forever at port {PORT}...")
        sys.stdout.flush()
        httpd.serve_forever()
except KeyboardInterrupt:
    print("\nServer stopped by user.")
except Exception as e:
    print(f"Error starting server: {e}")
