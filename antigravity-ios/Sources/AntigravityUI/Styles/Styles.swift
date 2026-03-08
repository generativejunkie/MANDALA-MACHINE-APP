import SwiftUI

struct AntigravityTheme {
    static let background = Color(red: 0.02, green: 0.02, blue: 0.05)
    static let accent = Color(red: 0.0, green: 0.8, blue: 1.0) // Cyan
    static let glow = Color(red: 0.0, green: 0.4, blue: 1.0).opacity(0.3)
    static let glass = Color.white.opacity(0.08)
    static let secondaryGlass = Color.white.opacity(0.12)
    static let textPrimary = Color.white
    static let textSecondary = Color.white.opacity(0.6)
}

struct GlassCard: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding()
            .background(AntigravityTheme.glass)
            .cornerRadius(16)
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(LinearGradient(colors: [.white.opacity(0.1), .clear], startPoint: .topLeading, endPoint: .bottomTrailing), lineWidth: 1)
            )
            .shadow(color: AntigravityTheme.glow, radius: 10, x: 0, y: 5)
    }
}

extension View {
    func glassCardStyle() -> some View {
        self.modifier(GlassCard())
    }
}

struct GlowText: View {
    var text: String
    var color: Color = AntigravityTheme.accent
    
    var body: some View {
        Text(text)
            .foregroundColor(color)
            .shadow(color: color.opacity(0.5), radius: 5)
    }
}
