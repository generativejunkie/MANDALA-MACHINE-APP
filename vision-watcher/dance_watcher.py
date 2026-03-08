#!/usr/bin/env python3
"""
Dance Watcher - Full Body Tracking for Visual Control
Part of the GENERATIVE MACHINE ecosystem

Uses MediaPipe Pose to track 33 body landmarks and convert
dance movements into visual parameters for MANDALA-MACHINE.

Author: ILLEND (GENERATIVE JUNKIE)
Co-created with: Antigravity AI
"""

import cv2
import mediapipe as mp
import numpy as np
import requests
import time
import math

# === CONFIGURATION ===
BRIDGE_SERVER_URL = "http://localhost:8000"
CAMERA_INDEX = 0
SMOOTHING_FACTOR = 0.3  # Lower = smoother, higher = more responsive

# === MEDIAPIPE SETUP ===
mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils
pose = mp_pose.Pose(
    static_image_mode=False,
    model_complexity=1,
    smooth_landmarks=True,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

# === STATE ===
prev_landmarks = None
prev_time = time.time()
smoothed_params = {
    "energy": 0.0,
    "arm_spread": 0.0,
    "height": 0.5,
    "rotation": 0.0,
    "speed": 0.0
}

def calculate_movement_energy(current_landmarks, prev_landmarks, dt):
    """Calculate total body movement energy (0-1)"""
    if prev_landmarks is None or dt == 0:
        return 0.0
    
    total_movement = 0.0
    key_points = [
        mp_pose.PoseLandmark.LEFT_WRIST,
        mp_pose.PoseLandmark.RIGHT_WRIST,
        mp_pose.PoseLandmark.LEFT_ANKLE,
        mp_pose.PoseLandmark.RIGHT_ANKLE,
        mp_pose.PoseLandmark.NOSE
    ]
    
    for point in key_points:
        curr = current_landmarks.landmark[point]
        prev = prev_landmarks.landmark[point]
        dx = curr.x - prev.x
        dy = curr.y - prev.y
        dz = curr.z - prev.z
        movement = math.sqrt(dx*dx + dy*dy + dz*dz)
        total_movement += movement
    
    # Normalize to 0-1 range (velocity per second)
    velocity = total_movement / dt
    energy = min(velocity * 2.0, 1.0)  # Scale factor
    return energy

def calculate_arm_spread(landmarks):
    """Calculate how wide arms are spread (0-1)"""
    left_wrist = landmarks.landmark[mp_pose.PoseLandmark.LEFT_WRIST]
    right_wrist = landmarks.landmark[mp_pose.PoseLandmark.RIGHT_WRIST]
    left_shoulder = landmarks.landmark[mp_pose.PoseLandmark.LEFT_SHOULDER]
    right_shoulder = landmarks.landmark[mp_pose.PoseLandmark.RIGHT_SHOULDER]
    
    # Distance between wrists
    wrist_distance = abs(left_wrist.x - right_wrist.x)
    
    # Distance between shoulders (baseline)
    shoulder_distance = abs(left_shoulder.x - right_shoulder.x)
    
    # Normalize: arms at sides ≈ shoulder width, arms spread ≈ 3x shoulder width
    spread = (wrist_distance / shoulder_distance - 1.0) / 2.0
    return max(0.0, min(1.0, spread))

def calculate_body_height(landmarks):
    """Calculate body vertical position (0=low/crouched, 1=high/jumping)"""
    nose = landmarks.landmark[mp_pose.PoseLandmark.NOSE]
    left_hip = landmarks.landmark[mp_pose.PoseLandmark.LEFT_HIP]
    right_hip = landmarks.landmark[mp_pose.PoseLandmark.RIGHT_HIP]
    
    hip_y = (left_hip.y + right_hip.y) / 2
    
    # In MediaPipe, y=0 is top of frame, y=1 is bottom
    # Lower hip_y means higher position
    height = 1.0 - hip_y
    return max(0.0, min(1.0, height))

def calculate_rotation(landmarks):
    """Calculate body rotation angle (-1 to 1, left to right)"""
    left_shoulder = landmarks.landmark[mp_pose.PoseLandmark.LEFT_SHOULDER]
    right_shoulder = landmarks.landmark[mp_pose.PoseLandmark.RIGHT_SHOULDER]
    
    # Z difference indicates rotation
    z_diff = right_shoulder.z - left_shoulder.z
    rotation = z_diff * 5  # Scale factor
    return max(-1.0, min(1.0, rotation))

def smooth_value(current, target, factor):
    """Exponential smoothing"""
    return current + (target - current) * factor

def send_to_bridge(params):
    """Send dance parameters to Bridge Server"""
    try:
        response = requests.post(
            f"{BRIDGE_SERVER_URL}/dance",
            json=params,
            timeout=0.1
        )
        return response.status_code == 200
    except:
        return False

def draw_debug_info(frame, params, fps):
    """Draw debug information on frame"""
    h, w = frame.shape[:2]
    
    # Background for text
    cv2.rectangle(frame, (10, 10), (300, 180), (0, 0, 0), -1)
    cv2.rectangle(frame, (10, 10), (300, 180), (0, 255, 255), 2)
    
    # Title
    cv2.putText(frame, "DANCE VISION SYSTEM", (20, 35),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
    
    # Parameters
    y = 60
    for key, value in params.items():
        bar_width = int(value * 150) if value >= 0 else 0
        color = (0, 255, 0) if value > 0.5 else (255, 255, 0)
        
        cv2.putText(frame, f"{key}:", (20, y),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
        cv2.rectangle(frame, (100, y-10), (100 + bar_width, y), color, -1)
        cv2.putText(frame, f"{value:.2f}", (260, y),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
        y += 25
    
    # FPS
    cv2.putText(frame, f"FPS: {fps:.1f}", (20, 170),
                cv2.FONT_HERSHEY_SIMPLEX, 0.4, (128, 128, 128), 1)
    
    return frame

def main():
    global prev_landmarks, prev_time, smoothed_params
    
    print("\n" + "="*50)
    print("   🕺 DANCE VISION SYSTEM 🕺")
    print("   Control visuals with your body")
    print("="*50)
    print("\nStarting camera...")
    
    cap = cv2.VideoCapture(CAMERA_INDEX)
    if not cap.isOpened():
        print("ERROR: Cannot open camera")
        return
    
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    
    print("Camera ready!")
    print("\nControls:")
    print("  - Move your body to control visuals")
    print("  - Spread arms = Scale up")
    print("  - Crouch/Jump = Affect gravity")  
    print("  - Move fast = Increase energy")
    print("  - Rotate body = Rotate visuals")
    print("\nPress 'Q' to quit\n")
    
    fps_counter = 0
    fps_time = time.time()
    current_fps = 0
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        # Flip for mirror effect
        frame = cv2.flip(frame, 1)
        
        # Convert to RGB for MediaPipe
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Process pose
        results = pose.process(rgb_frame)
        
        current_time = time.time()
        dt = current_time - prev_time
        
        if results.pose_landmarks:
            # Draw skeleton
            mp_drawing.draw_landmarks(
                frame, 
                results.pose_landmarks, 
                mp_pose.POSE_CONNECTIONS,
                mp_drawing.DrawingSpec(color=(0, 255, 255), thickness=2, circle_radius=3),
                mp_drawing.DrawingSpec(color=(255, 0, 255), thickness=2)
            )
            
            # Calculate raw parameters
            raw_energy = calculate_movement_energy(
                results.pose_landmarks, prev_landmarks, dt
            )
            raw_arm_spread = calculate_arm_spread(results.pose_landmarks)
            raw_height = calculate_body_height(results.pose_landmarks)
            raw_rotation = calculate_rotation(results.pose_landmarks)
            
            # Smooth parameters
            smoothed_params["energy"] = smooth_value(
                smoothed_params["energy"], raw_energy, SMOOTHING_FACTOR
            )
            smoothed_params["arm_spread"] = smooth_value(
                smoothed_params["arm_spread"], raw_arm_spread, SMOOTHING_FACTOR
            )
            smoothed_params["height"] = smooth_value(
                smoothed_params["height"], raw_height, SMOOTHING_FACTOR
            )
            smoothed_params["rotation"] = smooth_value(
                smoothed_params["rotation"], raw_rotation, SMOOTHING_FACTOR
            )
            smoothed_params["speed"] = smoothed_params["energy"]  # Alias
            
            # Send to Bridge Server
            send_to_bridge(smoothed_params)
            
            # Store for next frame
            prev_landmarks = results.pose_landmarks
        
        prev_time = current_time
        
        # Calculate FPS
        fps_counter += 1
        if current_time - fps_time >= 1.0:
            current_fps = fps_counter
            fps_counter = 0
            fps_time = current_time
        
        # Draw debug info
        frame = draw_debug_info(frame, smoothed_params, current_fps)
        
        # Show frame
        cv2.imshow("Dance Vision System", frame)
        
        # Handle keyboard
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
    
    cap.release()
    cv2.destroyAllWindows()
    pose.close()
    print("\nDance Vision System closed.")

if __name__ == "__main__":
    main()
