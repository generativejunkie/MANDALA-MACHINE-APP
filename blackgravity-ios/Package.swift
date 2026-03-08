// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "Blackgravity",
    platforms: [.iOS(.v17)],
    products: [
        .library(name: "Blackgravity", targets: ["Blackgravity"])
    ],
    targets: [
        .target(name: "Blackgravity", path: "Sources/Blackgravity")
    ]
)
