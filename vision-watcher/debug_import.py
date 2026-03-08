try:
    import mediapipe as mp
    print("Imported mediapipe")
    try:
        print(f"mp.solutions: {mp.solutions}")
    except AttributeError:
        print("mp.solutions NOT FOUND")

    import mediapipe.python.solutions as solutions
    print("Imported mediapipe.python.solutions")
    print(f"solutions.hands: {solutions.hands}")

except Exception as e:
    print(f"Error: {e}")
