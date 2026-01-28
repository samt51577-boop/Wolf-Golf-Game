import http.server
import socketserver

PORT = 8085

Handler = http.server.SimpleHTTPRequestHandler

try:
    with socketserver.TCPServer(("0.0.0.0", PORT), Handler) as httpd:
        print(f"Serving at port {PORT}")
        httpd.serve_forever()
except Exception as e:
    print(f"Failed to start server: {e}")

