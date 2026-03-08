import cv2
import mediapipe as mp
import time
import subprocess
import sys
import requests
import os
from dotenv import load_dotenv

load_dotenv()

# Configuration
TRIGGER_GESTURE_HOLD_TIME = 1.5  # Seconds to hold gesture
COOLDOWN_TIME = 3.0               # Seconds before next trigger
COMMAND_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "Start_Antigravity.command")
BRIDGE_SERVER_URL = "http://localhost:8000"

# MediaPipe Setup
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=1,
    min_detection_confidence=0.7,
    min_tracking_confidence=0.5
)

def is_victory_sign(landmarks):
    """Victory sign: Index + Middle up, Ring + Pinky curled."""
    index_up = landmarks[8].y < landmarks[6].y
    middle_up = landmarks[12].y < landmarks[10].y
    ring_curled = landmarks[16].y > landmarks[14].y
    pinky_curled = landmarks[20].y > landmarks[18].y
    return index_up and middle_up and ring_curled and pinky_curled

def is_thumbs_up(landmarks):
    """Thumbs up: Thumb up, all other fingers curled."""
    thumb_up = landmarks[4].y < landmarks[3].y
    index_curled = landmarks[8].y > landmarks[6].y
    middle_curled = landmarks[12].y > landmarks[10].y
    ring_curled = landmarks[16].y > landmarks[14].y
    pinky_curled = landmarks[20].y > landmarks[18].y
    return thumb_up and index_curled and middle_curled and ring_curled and pinky_curled

def is_open_palm(landmarks):
    """Open palm: All fingers extended."""
    thumb_up = landmarks[4].y < landmarks[3].y
    index_up = landmarks[8].y < landmarks[6].y
    middle_up = landmarks[12].y < landmarks[10].y
    ring_up = landmarks[16].y < landmarks[14].y
    pinky_up = landmarks[20].y < landmarks[18].y
    return thumb_up and index_up and middle_up and ring_up and pinky_up

def send_bridge_command(command):
    """Send command to Bridge Server with Authentication."""
    try:
        headers = {
            "X-Resonance-Key": os.getenv("RESONANCE_KEY", "REPLACE_ME_IN_ENV")
        }
        response = requests.post(f"{BRIDGE_SERVER_URL}/gesture", json={"command": command}, headers=headers, timeout=1)
        return response.status_code == 200
    except Exception as e:
        print(f"Bridge error: {e}")
        return False

def trigger_victory():
    print("\n>>> VICTORY (✌️): Opening Antigravity <<<")
    try:
        subprocess.Popen(["open", "http://localhost:3001"])
    except Exception as e:
        print(f"Error: {e}")

def trigger_approve():
    print("\n>>> APPROVE (👍) <<<")
    
    # Write to file for AI session
    with open("../gesture_command.txt", "w") as f:
        f.write(f"APPROVE|{time.time()}\n")
    
    # Send to Bridge Server
    if send_bridge_command("APPROVE"):
        print(">>> Sent to Bridge <<<")

def trigger_cancel():
    print("\n>>> CANCEL (✋) <<<")
    
    # Write to file for AI session
    with open("../gesture_command.txt", "w") as f:
        f.write(f"CANCEL|{time.time()}\n")
    
    # Send to Bridge Server
    if send_bridge_command("CANCEL"):
        print(">>> Sent to Bridge <<<")

def main():
    print("Vision Watcher Active")
    print("  ✌️  Victory → Start")
    print("  👍 Thumbs Up → Approve")
    print("  ✋ Open Palm → Cancel")
    
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Error: Camera not found")
        return
    
    gesture_start_time = None
    last_trigger_time = 0
    current_gesture = None
    
    try:
        while cap.isOpened():
            success, image = cap.read()
            if not success:
                continue
            
            image = cv2.flip(image, 1)
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            results = hands.process(image_rgb)
            
            detected_gesture = None
            
            if results.multi_hand_landmarks:
                for hand_landmarks in results.multi_hand_landmarks:
                    if is_victory_sign(hand_landmarks.landmark):
                        detected_gesture = "VICTORY"
                        break
                    elif is_thumbs_up(hand_landmarks.landmark):
                        detected_gesture = "APPROVE"
                        break
                    elif is_open_palm(hand_landmarks.landmark):
                        detected_gesture = "CANCEL"
                        break
            
            current_time = time.time()
            
            if detected_gesture:
                if gesture_start_time is None or current_gesture != detected_gesture:
                    gesture_start_time = current_time
                    current_gesture = detected_gesture
                    sys.stdout.write(f"\n[{detected_gesture}] ")
                    sys.stdout.flush()
                
                sys.stdout.write(".")
                sys.stdout.flush()
                
                if current_time - gesture_start_time >= TRIGGER_GESTURE_HOLD_TIME:
                    if current_time - last_trigger_time > COOLDOWN_TIME:
                        if detected_gesture == "VICTORY":
                            trigger_victory()
                        elif detected_gesture == "APPROVE":
                            trigger_approve()
                        elif detected_gesture == "CANCEL":
                            trigger_cancel()
                        
                        last_trigger_time = current_time
                        gesture_start_time = None
                        current_gesture = None
            else:
                if gesture_start_time is not None:
                    sys.stdout.write("\n")
                    gesture_start_time = None
                    current_gesture = None
            
            time.sleep(0.05)
            
    except KeyboardInterrupt:
        print("\nStopped")
    finally:
        cap.release()
        cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
