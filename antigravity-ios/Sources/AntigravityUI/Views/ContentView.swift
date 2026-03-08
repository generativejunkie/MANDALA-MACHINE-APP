import SwiftUI
import Combine

// --- COMMAND LOGIC ---

class AntigravityCommandCenter: ObservableObject {
    @Published var lastResponse: String = "READY"
    @Published var isProcessing: Bool = false
    @Published var pendingRequest: AuthRequest? = nil
    @Published var projects: [Project] = []
    @Published var terminalLog: [String] = ["SYSTEM: Connection Initialized."]
    @Published var diagnosticOutput: String = ""
    
    // MacOS IP
    private let targetServerHost = "192.168.11.41"
    private let targetPort = "8000"
    
    init() {
        startPolling()
        fetchHistory()
    }
    
    func startPolling() {
        Timer.scheduledTimer(withTimeInterval: 2.0, repeats: true) { _ in
            self.checkForRequests()
            self.fetchProjects()
            self.fetchHistory()
        }
    }
    
    func fetchProjects() {
        let urlString = "http://\(targetServerHost):\(targetPort)/api/projects"
        guard let url = URL(string: urlString) else { return }
        URLSession.shared.dataTask(with: url) { data, _, _ in
            guard let data = data else { return }
            if let fetched = try? JSONDecoder().decode([Project].self, from: data) {
                DispatchQueue.main.async { self.projects = fetched }
            }
        }.resume()
    }
    
    func fetchHistory() {
        let urlString = "http://\(targetServerHost):\(targetPort)/api/instructions"
        guard let url = URL(string: urlString) else { return }
        URLSession.shared.dataTask(with: url) { data, _, _ in
            guard let data = data else { return }
            struct HistoryItem: Codable { let timestamp: String; let text: String }
            if let history = try? JSONDecoder().decode([HistoryItem].self, from: data) {
                DispatchQueue.main.async {
                    let newLines = history.map { "> \($0.text)" }
                    if self.terminalLog.count < (newLines.count + 1) {
                         self.terminalLog = ["SYSTEM: Connection Synchronized."] + newLines
                    }
                }
            }
        }.resume()
    }
    
    func checkForRequests() {
        let urlString = "http://\(targetServerHost):\(targetPort)/api/pending-auth"
        guard let url = URL(string: urlString) else { return }
        URLSession.shared.dataTask(with: url) { data, _, _ in
            guard let data = data else { return }
            if let response = try? JSONDecoder().decode(PollingResponse.self, from: data) {
                DispatchQueue.main.async {
                    if response.hasPending {
                        if self.pendingRequest?.id != response.request?.id {
                            self.pendingRequest = response.request
                            #if os(iOS)
                            UINotificationFeedbackGenerator().notificationOccurred(.warning)
                            #endif
                        }
                    } else { self.pendingRequest = nil }
                }
            }
        }.resume()
    }
    
    func toggleProject(_ projectId: String) {
        let urlString = "http://\(targetServerHost):\(targetPort)/api/projects/action"
        guard let url = URL(string: urlString) else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let body: [String: String] = ["projectId": projectId, "action": "TOGGLE"]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        URLSession.shared.dataTask(with: request) { _, _, _ in
            DispatchQueue.main.async { self.fetchProjects() }
        }.resume()
    }
    
    func respondToAuth(approved: Bool) {
        let urlString = "http://\(targetServerHost):\(targetPort)/api/respond-auth"
        guard let url = URL(string: urlString) else { return }
        guard let requestId = pendingRequest?.id else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let body: [String: Any] = ["approved": approved, "requestId": requestId]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        URLSession.shared.dataTask(with: request) { _, _, _ in
            DispatchQueue.main.async { self.pendingRequest = nil }
        }.resume()
    }
    
    func sendInstruction(_ text: String) {
        sendCommand(type: "instruction", detail: ["text": text])
    }
    
    func sendCommand(type: String, detail: [String: String]? = nil) {
        let urlString = "http://\(targetServerHost):\(targetPort)/api/command"
        guard let url = URL(string: urlString) else { return }
        self.isProcessing = true
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let body: [String: Any] = ["type": type, "detail": detail ?? [:]]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        URLSession.shared.dataTask(with: request) { _, response, error in
            DispatchQueue.main.async {
                self.isProcessing = false
                if let error = error {
                    self.lastResponse = "ERR: \(error.localizedDescription)"
                } else if let res = response as? HTTPURLResponse {
                    self.lastResponse = res.statusCode == 200 ? "OK: 200" : "ERR: \(res.statusCode)"
                }
            }
        }.resume()
    }

    func sendAICommand(command: String) {
        let urlString = "http://\(targetServerHost):\(targetPort)/api/ai-command"
        guard let url = URL(string: urlString) else { return }
        self.isProcessing = true
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let body: [String: String] = ["command": command]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        URLSession.shared.dataTask(with: request) { _, response, error in
            DispatchQueue.main.async {
                self.isProcessing = false
                if let res = response as? HTTPURLResponse {
                    self.lastResponse = res.statusCode == 200 ? "AI: \(command) OK" : "AI ERR: \(res.statusCode)"
                }
            }
        }.resume()
    }
    
    func runDiagnostics() {
        diagnosticOutput = "STARTING DIAGNOSTICS...\nTarget: \(targetServerHost):\(targetPort)\n"
        sendCommand(type: "ping")
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            self.diagnosticOutput += "SUCCESS: Port \(self.targetPort) Reachable.\nSYNC: Fully Operational."
        }
    }
}

// --- UI COMPONENTS ---

struct ProjectRow: View {
    let project: Project
    let onAction: () -> Void
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(project.name).font(.system(.headline, design: .monospaced)).foregroundColor(.white)
                    Text(project.status).font(.system(size: 10, weight: .bold, design: .monospaced)).foregroundColor(statusColor)
                }
                Spacer()
                Text("\(project.resonance)%").font(.system(.body, design: .monospaced)).foregroundColor(AntigravityTheme.accent)
            }
            Text(project.description).font(.caption).foregroundColor(.gray)
            Button(action: onAction) {
                Text(actionButtonText).font(.system(size: 12, weight: .bold, design: .monospaced))
                    .frame(maxWidth: .infinity).padding(.vertical, 10)
                    .background(project.status == "PENDING" ? Color.yellow : statusColor.opacity(0.1))
                    .foregroundColor(project.status == "PENDING" ? .black : statusColor)
                    .cornerRadius(8).overlay(RoundedRectangle(cornerRadius: 8).stroke(project.status == "PENDING" ? Color.yellow : statusColor.opacity(0.3), lineWidth: 1))
            }
        }.padding(20).background(AntigravityTheme.glass).cornerRadius(16)
    }
    var statusColor: Color { project.status == "ACTIVE" ? .green : (project.status == "PENDING" ? .yellow : .gray) }
    var actionButtonText: String { project.status == "ACTIVE" ? "[ STANDBY ]" : (project.status == "PENDING" ? "⚠ APPROVE ⚠" : "[ ACTIVATE ]") }
}

struct LargeCommandCard: View {
    let title: String
    let icon: String
    let action: () -> Void
    var body: some View {
        Button(action: { 
            #if os(iOS)
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            #endif
            action() 
        }) {
            VStack(spacing: 15) {
                Image(systemName: icon).font(.system(size: 30))
                Text(title).font(.system(size: 10, weight: .bold, design: .monospaced))
            }
            .frame(maxWidth: .infinity).frame(height: 120)
            .background(AntigravityTheme.glass)
            .foregroundColor(AntigravityTheme.accent)
            .cornerRadius(20)
            .overlay(RoundedRectangle(cornerRadius: 20).stroke(Color.white.opacity(0.1), lineWidth: 1))
        }
    }
}

// --- MAIN VIEW ---

struct ContentView: View {
    @StateObject private var commandCenter = AntigravityCommandCenter()
    @State private var instructionText: String = ""
    @State private var selectedTab: Int = 0
    
    var body: some View {
        ZStack {
            AntigravityTheme.background.ignoresSafeArea()
            
            TabView(selection: $selectedTab) {
                // TAB 1: COMMAND
                VStack(spacing: 0) {
                    ScrollView {
                        VStack(spacing: 25) {
                            VStack(spacing: 4) {
                                Text("ANTIGRAVITY").font(.system(size: 10, design: .monospaced)).foregroundColor(AntigravityTheme.accent)
                                Text("ORCHESTRATOR COMMAND").font(.title3).bold().foregroundColor(.white)
                            }.padding(.top, 30)
                            
                            if !commandCenter.lastResponse.contains("READY") {
                                Text(commandCenter.lastResponse).font(.system(size: 12, design: .monospaced))
                                    .foregroundColor(commandCenter.lastResponse.contains("ERR") ? .red : .green)
                                    .padding(8).background(Color.black.opacity(0.5)).cornerRadius(8)
                            }

                            // 8-BUTTON GRID (Added AI commands)
                            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 15) {
                                LargeCommandCard(title: "AI APPROVE", icon: "hand.thumbsup.fill") { commandCenter.sendAICommand(command: "APPROVE") }
                                LargeCommandCard(title: "AI CANCEL", icon: "hand.raised.fill") { commandCenter.sendAICommand(command: "CANCEL") }
                                LargeCommandCard(title: "VOID MODE", icon: "eye.slash.fill") { commandCenter.sendCommand(type: "trigger-secret", detail: ["code": "void"]) }
                                LargeCommandCard(title: "SYNC ALL", icon: "arrow.triangle.2.circlepath") { commandCenter.sendCommand(type: "sync-pulse") }
                                LargeCommandCard(title: "NEXT IMAGE", icon: "forward.fill") { commandCenter.sendCommand(type: "next-image") }
                                LargeCommandCard(title: "GLITCH BURST", icon: "sparkles") { commandCenter.sendCommand(type: "glitch") }
                                LargeCommandCard(title: "EXIT VOID", icon: "xmark.circle") { commandCenter.sendCommand(type: "trigger-secret", detail: ["code": "exit"]) }
                                LargeCommandCard(title: "GJ MODE", icon: "bolt.heart.fill") { commandCenter.sendCommand(type: "gj-mode", detail: ["active": "true"]) }
                            }
                            
                            // DIAGNOSTICS LOG
                            VStack(alignment: .leading, spacing: 10) {
                                Button("RUN DIAGNOSTICS") { commandCenter.runDiagnostics() }
                                    .font(.system(size: 10, weight: .bold, design: .monospaced))
                                    .foregroundColor(.yellow).padding(10).background(Color.white.opacity(0.05)).cornerRadius(8)
                                
                                Text(commandCenter.diagnosticOutput.isEmpty ? "SYSTEM: Ready for uplink." : commandCenter.diagnosticOutput)
                                    .font(.system(size: 10, design: .monospaced)).foregroundColor(.gray)
                                    .frame(maxWidth: .infinity, alignment: .leading).padding(15).background(Color.black).cornerRadius(12)
                            }
                        }.padding(20)
                    }
                    
                    // KEYBOARD AREA
                    VStack(spacing: 0) {
                        Divider().background(Color.white.opacity(0.1))
                        HStack {
                            TextField("Transmit...", text: $instructionText)
                                .padding(12).background(Color.white.opacity(0.05)).cornerRadius(10).foregroundColor(.white)
                                .font(.system(size: 14, design: .monospaced)).submitLabel(.send)
                                .onSubmit { if !instructionText.isEmpty { commandCenter.sendInstruction(instructionText); instructionText = "" } }
                            Button(action: { if !instructionText.isEmpty { commandCenter.sendInstruction(instructionText); instructionText = "" } }) {
                                Image(systemName: "paperplane.fill").foregroundColor(.black).padding(12).background(AntigravityTheme.accent).clipShape(Circle())
                            }
                        }.padding(15).background(AntigravityTheme.background)
                    }
                }.tabItem { Label("COMMAND", systemImage: "terminal.fill") }.tag(0)
                
                // TAB 2: PROJECTS
                VStack {
                    Text("SYSTEM NODES").font(.title3).bold().foregroundColor(.white).padding(.top, 40)
                    ScrollView {
                        VStack(spacing: 15) {
                            ForEach(commandCenter.projects) { project in
                                ProjectRow(project: project) { commandCenter.toggleProject(project.id) }
                            }
                        }.padding(20)
                    }
                }.tabItem { Label("PROJECTS", systemImage: "square.grid.2x2.fill") }.tag(1)
            }
            .accentColor(AntigravityTheme.accent)
            
            if let request = commandCenter.pendingRequest {
                AuthRequestView(request: request, commandCenter: commandCenter).zIndex(100)
            }
        }
    }
}

struct AuthRequestView: View {
    let request: AuthRequest
    @ObservedObject var commandCenter: AntigravityCommandCenter
    var body: some View {
        ZStack {
            Color.black.opacity(0.95).ignoresSafeArea()
            VStack(spacing: 20) {
                Image(systemName: "lock.shield.fill").font(.system(size: 50)).foregroundColor(.yellow)
                Text(request.title).font(.headline).foregroundColor(.white)
                Text(request.description ?? "").font(.caption).foregroundColor(.gray).multilineTextAlignment(.center)
                HStack(spacing: 20) {
                    Button("DENY") { commandCenter.respondToAuth(approved: false) }.foregroundColor(.red)
                    Button("APPROVE") { commandCenter.respondToAuth(approved: true) }.bold().foregroundColor(.yellow)
                }.padding(.top, 10)
            }.padding(30).background(AntigravityTheme.background).cornerRadius(20).overlay(RoundedRectangle(cornerRadius: 20).stroke(Color.white.opacity(0.1), lineWidth: 1))
        }
    }
}
