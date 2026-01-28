import socket
import sys

def check_port(port):
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(2)
    result = sock.connect_ex(('127.0.0.1', port))
    if result == 0:
        return f"Port {port} is OPEN"
    else:
        return f"Port {port} is CLOSED (Code: {result})"
    sock.close()

with open("port_check.log", "w") as f:
    f.write(check_port(8080) + "\n")
    f.write(check_port(8081) + "\n")
    f.write(check_port(8082) + "\n")
    f.write(check_port(8085) + "\n")
