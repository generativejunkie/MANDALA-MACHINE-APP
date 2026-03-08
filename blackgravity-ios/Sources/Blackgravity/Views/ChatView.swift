import SwiftUI
import CoreHaptics

struct ChatView: View {
    @StateObject private var chatService = ChatService()
    @State private var inputText: String = ""
    @State private var engine: CHHapticEngine?
    @FocusState private var isInputFocused: Bool
    
    var body: some View {
        ZStack {
            // Background: Pure OLED Black
            Color.black.ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Header
                headerView
                
                // Messages
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            ForEach(chatService.messages) { message in
                                MessageBubble(message: message)
                                    .id(message.id)
                            }
                            
                            if chatService.isLoading {
                                HStack {
                                    TypingIndicator()
                                    Spacer()
                                }
                                .padding(.horizontal, 16)
                            }
                        }
                        .padding(.vertical, 16)
                    }
                    .onChange(of: chatService.messages.count) { _, _ in
                        if let lastMessage = chatService.messages.last {
                            withAnimation {
                                proxy.scrollTo(lastMessage.id, anchor: .bottom)
                            }
                        }
                    }
                }
                
                // Input Area
                inputView
            }
        }
        .onAppear {
            prepareHaptics()
        }
    }
    
    // MARK: - Header
    private var headerView: some View {
        HStack {
            // Status Indicator
            Circle()
                .fill(chatService.isConnected ? Color.green : Color.red)
                .frame(width: 8, height: 8)
            
            VStack(alignment: .leading, spacing: 2) {
                Text("BLACKGRAVITY")
                    .font(.system(size: 14, weight: .bold, design: .monospaced))
                    .foregroundColor(.white)
                
                Text(chatService.isConnected ? "Connected" : "Offline")
                    .font(.system(size: 10, design: .monospaced))
                    .foregroundColor(.gray)
            }
            
            Spacer()
            
            // Floating A Icon
            Image(systemName: "triangle")
                .font(.system(size: 20, weight: .ultraLight))
                .foregroundColor(.white.opacity(0.6))
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 16)
        .background(Color.black)
    }
    
    // MARK: - Input
    private var inputView: some View {
        HStack(spacing: 12) {
            TextField("Message...", text: $inputText)
                .padding(12)
                .background(Color.white.opacity(0.08))
                .cornerRadius(20)
                .foregroundColor(.white)
                .font(.system(size: 16))
                .focused($isInputFocused)
                .submitLabel(.send)
                .onSubmit {
                    sendMessage()
                }
            
            Button(action: sendMessage) {
                Image(systemName: "arrow.up.circle.fill")
                    .font(.system(size: 32))
                    .foregroundColor(inputText.isEmpty ? .gray : .white)
            }
            .disabled(inputText.isEmpty)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Color.black)
    }
    
    // MARK: - Actions
    private func sendMessage() {
        guard !inputText.isEmpty else { return }
        triggerHaptic()
        chatService.sendMessage(inputText)
        inputText = ""
    }
    
    // MARK: - Haptics
    private func prepareHaptics() {
        guard CHHapticEngine.capabilitiesForHardware().supportsHaptics else { return }
        do {
            engine = try CHHapticEngine()
            try engine?.start()
        } catch {
            print("Haptics Error: \(error.localizedDescription)")
        }
    }
    
    private func triggerHaptic() {
        guard CHHapticEngine.capabilitiesForHardware().supportsHaptics else { return }
        
        let intensity = CHHapticEventParameter(parameterID: .hapticIntensity, value: 0.8)
        let sharpness = CHHapticEventParameter(parameterID: .hapticSharpness, value: 0.4)
        let event = CHHapticEvent(eventType: .hapticTransient, parameters: [intensity, sharpness], relativeTime: 0)
        
        do {
            let pattern = try CHHapticPattern(events: [event], parameters: [])
            let player = try engine?.makePlayer(with: pattern)
            try player?.start(atTime: 0)
        } catch {
            print("Haptic Error: \(error.localizedDescription)")
        }
    }
}

// MARK: - Message Bubble
struct MessageBubble: View {
    let message: Message
    
    var body: some View {
        HStack {
            if message.sender == .user { Spacer(minLength: 60) }
            
            Text(message.text)
                .font(.system(size: 15))
                .foregroundColor(message.sender == .user ? .black : .white)
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(
                    message.sender == .user
                        ? Color.white
                        : Color.white.opacity(0.12)
                )
                .cornerRadius(18)
            
            if message.sender == .ai { Spacer(minLength: 60) }
        }
        .padding(.horizontal, 16)
    }
}

// MARK: - Typing Indicator
struct TypingIndicator: View {
    @State private var animating = false
    
    var body: some View {
        HStack(spacing: 4) {
            ForEach(0..<3) { index in
                Circle()
                    .fill(Color.white.opacity(0.5))
                    .frame(width: 8, height: 8)
                    .scaleEffect(animating ? 1.0 : 0.5)
                    .animation(
                        Animation.easeInOut(duration: 0.6)
                            .repeatForever()
                            .delay(Double(index) * 0.2),
                        value: animating
                    )
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(Color.white.opacity(0.12))
        .cornerRadius(18)
        .onAppear { animating = true }
    }
}

#Preview {
    ChatView()
}
