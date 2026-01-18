#!/usr/bin/env python3
"""
ESP32 Simulator for mmWave Smart Switch Dashboard
Simulates sensor data and sends it to the Flask backend
"""

import requests
import random
import time
import logging
from datetime import datetime
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configuration
BACKEND_URL = os.environ.get('SIMULATOR_BACKEND_URL', 'http://localhost:8001/api')
POLL_INTERVAL = 2  # seconds

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - ESP32-SIM - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ESP32Simulator:
    def __init__(self):
        self.current_mode = "fall"
        self.relay_state = False
        self.presence = False
        self.activity_level = 0
        self.fall_detected = False
        
        # Sleep mode variables
        self.respiration_rate = 14
        self.movement_index = 2
        self.sleep_state = "light"
        
    def generate_fall_mode_data(self):
        """Generate realistic fall detection mode sensor data"""
        # Simulate presence detection (80% chance of presence)
        self.presence = random.random() < 0.8
        
        if self.presence:
            # Activity level varies between 5-50 when person is present
            self.activity_level = random.randint(5, 50)
            
            # Very small chance of fall detection (2%)
            if random.random() < 0.02 and not self.fall_detected:
                self.fall_detected = True
                logger.warning("🚨 FALL DETECTED!")
            elif self.fall_detected and random.random() < 0.3:
                # 30% chance to clear fall detection
                self.fall_detected = False
                logger.info("✅ Fall cleared")
        else:
            # No presence, low activity
            self.activity_level = random.randint(0, 5)
            self.fall_detected = False
        
        return {
            "presence": self.presence,
            "activity": self.activity_level,
            "fall_detected": self.fall_detected,
            "sleep": None,
            "relay": self.relay_state
        }
    
    def generate_sleep_mode_data(self):
        """Generate realistic sleep tracking sensor data"""
        # Presence is usually true in sleep mode
        self.presence = random.random() < 0.95
        
        if self.presence:
            # Respiration rate: 12-18 breaths per minute
            self.respiration_rate = random.randint(12, 18)
            
            # Movement index: 0-10 (lower is more still)
            self.movement_index = random.randint(0, 10)
            
            # Sleep state transitions
            if self.sleep_state == "awake":
                if random.random() < 0.3:
                    self.sleep_state = "light"
            elif self.sleep_state == "light":
                if random.random() < 0.2:
                    self.sleep_state = "deep"
                elif random.random() < 0.1:
                    self.sleep_state = "awake"
            elif self.sleep_state == "deep":
                if random.random() < 0.15:
                    self.sleep_state = "light"
            
            sleep_data = {
                "respiration": self.respiration_rate,
                "movement": self.movement_index,
                "sleep_state": self.sleep_state
            }
        else:
            # No presence detected
            sleep_data = {
                "respiration": 0,
                "movement": 0,
                "sleep_state": "awake"
            }
        
        return {
            "presence": self.presence,
            "activity": random.randint(0, 5),
            "fall_detected": False,
            "sleep": sleep_data,
            "relay": self.relay_state
        }
    
    def send_sensor_data(self):
        """Send sensor data to backend"""
        try:
            if self.current_mode == "fall":
                data = self.generate_fall_mode_data()
            else:
                data = self.generate_sleep_mode_data()
            
            response = requests.post(
                f"{BACKEND_URL}/data",
                json=data,
                timeout=5
            )
            
            if response.status_code == 200:
                logger.info(f"📤 Data sent - Mode: {self.current_mode}, Presence: {data['presence']}, Activity: {data['activity']}")
            else:
                logger.error(f"Failed to send data: {response.status_code}")
        
        except requests.exceptions.RequestException as e:
            logger.error(f"Connection error: {e}")
    
    def poll_commands(self):
        """Poll backend for mode and relay commands"""
        try:
            response = requests.get(
                f"{BACKEND_URL}/command",
                timeout=5
            )
            
            if response.status_code == 200:
                command = response.json()
                
                # Update mode if changed
                if command["mode"] != self.current_mode:
                    self.current_mode = command["mode"]
                    logger.info(f"🔄 Mode changed to: {self.current_mode}")
                
                # Update relay if changed
                if command["relay"] != self.relay_state:
                    self.relay_state = command["relay"]
                    logger.info(f"💡 Relay {'ON' if self.relay_state else 'OFF'}")
        
        except requests.exceptions.RequestException as e:
            logger.error(f"Error polling commands: {e}")
    
    def run(self):
        """Main simulation loop"""
        logger.info("🚀 ESP32 Simulator started")
        logger.info(f"📡 Backend URL: {BACKEND_URL}")
        logger.info(f"⏱️  Poll interval: {POLL_INTERVAL}s")
        
        while True:
            try:
                self.poll_commands()
                self.send_sensor_data()
                time.sleep(POLL_INTERVAL)
            except KeyboardInterrupt:
                logger.info("\n👋 Simulator stopped")
                break
            except Exception as e:
                logger.error(f"Unexpected error: {e}")
                time.sleep(POLL_INTERVAL)

if __name__ == "__main__":
    simulator = ESP32Simulator()
    simulator.run()