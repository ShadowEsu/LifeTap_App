#!/usr/bin/env python3
"""
LifeTap Raspberry Pi Service
Handles button input, GPS tracking, and backend communication
"""

import serial
import requests
import time
import json
from datetime import datetime
from threading import Thread

class LifeTapService:
    def __init__(self, config_path="/etc/lifechain/config.yaml"):
        self.device_id = "rpi-001"
        self.api_url = "http://localhost:3001/api/v1"
        self.device_token = None
        self.running = True
        
    def run(self):
        print("LifeTap Raspberry Pi Service started")
        
        # Start heartbeat thread
        heartbeat_thread = Thread(target=self.heartbeat_loop)
        heartbeat_thread.daemon = True
        heartbeat_thread.start()
        
        # Listen for alerts from Arduino
        self.listen_for_alerts()
    
    def heartbeat_loop(self):
        while self.running:
            try:
                response = requests.post(
                    f"{self.api_url}/hardware/heartbeat",
                    json={"device_id": self.device_id},
                    headers={"Authorization": f"Bearer {self.device_token}"}
                )
                print(f"Heartbeat sent: {response.status_code}")
            except Exception as e:
                print(f"Heartbeat error: {e}")
            time.sleep(30)
    
    def listen_for_alerts(self):
        try:
            # TODO: Open serial connection to Arduino
            # Listen for ALERT messages
            # Trigger alert workflow
            print("Listening for alerts...")
        except Exception as e:
            print(f"Alert listener error: {e}")
    
    def send_alert(self, lat, lon):
        try:
            response = requests.post(
                f"{self.api_url}/alerts",
                json={"lat": lat, "lon": lon},
                headers={"Authorization": f"Bearer {self.device_token}"}
            )
            print(f"Alert sent: {response.json()}")
        except Exception as e:
            print(f"Alert error: {e}")

if __name__ == "__main__":
    service = LifeTapService()
    service.run()
