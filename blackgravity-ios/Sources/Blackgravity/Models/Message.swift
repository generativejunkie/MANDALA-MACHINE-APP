import Foundation

struct Message: Identifiable, Codable, Equatable {
    let id: String
    let sender: Sender
    let text: String
    let timestamp: Date
    
    enum Sender: String, Codable {
        case user = "user"
        case ai = "ai"
    }
    
    init(id: String = UUID().uuidString, sender: Sender, text: String, timestamp: Date = Date()) {
        self.id = id
        self.sender = sender
        self.text = text
        self.timestamp = timestamp
    }
}
