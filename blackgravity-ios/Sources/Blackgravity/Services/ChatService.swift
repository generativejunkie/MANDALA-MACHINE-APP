import Foundation
import Combine

class ChatService: ObservableObject {
    @Published var messages: [Message] = []
    @Published var isConnected: Bool = false
    @Published var isLoading: Bool = false
    
    private let serverHost: String
    private let serverPort: String
    private var pollingTimer: Timer?
    
    private let resonanceKey = "REPLACED_BY_ENV"
    
    init(host: String = "192.168.11.9", port: String = "8000") {
        self.serverHost = host
        self.serverPort = port
        startPolling()
    }
    
    private var baseURL: String {
        "http://\(serverHost):\(serverPort)"
    }
    
    // MARK: - Send Message
    func sendMessage(_ text: String) {
        let userMessage = Message(sender: .user, text: text)
        messages.append(userMessage)
        
        guard let url = URL(string: "\(baseURL)/api/chat/send") else { return }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(resonanceKey, forHTTPHeaderField: "X-Resonance-Key")
        
        let body: [String: Any] = [
            "text": text,
            "timestamp": ISO8601DateFormatter().string(from: Date())
        ]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        isLoading = true
        
        URLSession.shared.dataTask(with: request) { [weak self] _, response, error in
            DispatchQueue.main.async {
                self?.isLoading = false
                if let httpResponse = response as? HTTPURLResponse {
                    self?.isConnected = httpResponse.statusCode == 200
                }
            }
        }.resume()
    }
    
    // MARK: - Poll for AI Responses
    func startPolling() {
        pollingTimer = Timer.scheduledTimer(withTimeInterval: 2.0, repeats: true) { [weak self] _ in
            self?.fetchMessages()
        }
    }
    
    func fetchMessages() {
        guard let url = URL(string: "\(baseURL)/api/chat/messages") else { return }
        
        URLSession.shared.dataTask(with: url) { [weak self] data, response, _ in
            guard let data = data else { return }
            
            DispatchQueue.main.async {
                if let httpResponse = response as? HTTPURLResponse {
                    self?.isConnected = httpResponse.statusCode == 200
                }
                
                let decoder = JSONDecoder()
                decoder.dateDecodingStrategy = .iso8601
                
                if let fetched = try? decoder.decode([Message].self, from: data) {
                    // Only add new AI messages
                    let newAIMessages = fetched.filter { msg in
                        msg.sender == .ai && !(self?.messages.contains(msg) ?? false)
                    }
                    self?.messages.append(contentsOf: newAIMessages)
                }
            }
        }.resume()
    }
    
    deinit {
        pollingTimer?.invalidate()
    }
}
