// swift-tools-version: 5.10

import PackageDescription

let package = Package(
    name: "Antigravity",
    platforms: [
        .iOS(.v17),
        .macOS(.v13)
    ],
    products: [
        .library(
            name: "AntigravityUI",
            targets: ["AntigravityUI"]
        )
    ],
    targets: [
        .target(
            name: "AntigravityUI",
            path: "Sources/AntigravityUI",
            exclude: ["Info.plist"]
        )
    ]
)
