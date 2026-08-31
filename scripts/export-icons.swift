// macOS asset export only. No image generation or artwork changes.
// Run from the repository root: swift scripts/export-icons.swift
import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let sourceURL = root.appendingPathComponent("assets/branding/kronofrise-tahoe-source.png")
guard let source = CGImageSourceCreateWithURL(sourceURL as CFURL, nil),
      let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
    fatalError("Cannot read icon source")
}
let fm = FileManager.default
let desktop = root.appendingPathComponent("assets/branding/tauri")
let web = root.appendingPathComponent("public/icons")
let iconset = fm.temporaryDirectory.appendingPathComponent("KronoFrise-\(UUID().uuidString).iconset")
for folder in [desktop, web, iconset] {
    try fm.createDirectory(at: folder, withIntermediateDirectories: true)
}
defer { try? fm.removeItem(at: iconset) }

// Explicit sRGB RGBA output, including for the opaque source, for Tauri.
func png(_ size: Int, _ destination: URL) throws {
    let colorSpace = CGColorSpace(name: CGColorSpace.sRGB)!
    let context = CGContext(data: nil, width: size, height: size,
        bitsPerComponent: 8, bytesPerRow: size * 4, space: colorSpace,
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    context.interpolationQuality = .high
    context.draw(image, in: CGRect(x: 0, y: 0, width: size, height: size))
    let output = CGImageDestinationCreateWithURL(destination as CFURL,
        UTType.png.identifier as CFString, 1, nil)!
    CGImageDestinationAddImage(output, context.makeImage()!, nil)
    guard CGImageDestinationFinalize(output) else { fatalError("PNG export failed") }
}

try png(1024, root.appendingPathComponent("assets/branding/kronofrise-1024.png"))
for size in [16, 32, 48, 192, 512] {
    try png(size, web.appendingPathComponent("icon-\(size).png"))
}
try png(180, root.appendingPathComponent("public/apple-touch-icon.png"))
for (name, size) in [("32x32", 32), ("128x128", 128), ("128x128@2x", 256), ("icon", 512)] {
    try png(size, desktop.appendingPathComponent("\(name).png"))
}
for size in [16, 32, 128, 256, 512] {
    try png(size, iconset.appendingPathComponent("icon_\(size)x\(size).png"))
    try png(size * 2, iconset.appendingPathComponent("icon_\(size)x\(size)@2x.png"))
}
// Standard ICNS container with PNG representations, including Retina sizes.
// Writing the container directly also works in sandboxed macOS environments.
func bigEndian(_ value: UInt32) -> Data {
    var value = value.bigEndian
    return withUnsafeBytes(of: &value) { Data($0) }
}
let representations = [
    ("icp4", "16x16"), ("icp5", "32x32"),
    ("ic07", "128x128"), ("ic08", "256x256"), ("ic09", "512x512"),
    ("ic10", "512x512@2x"), ("ic11", "16x16@2x"),
    ("ic12", "32x32@2x"), ("ic13", "128x128@2x"), ("ic14", "256x256@2x")
]
var chunks = Data()
for (type, name) in representations {
    let data = try Data(contentsOf: iconset.appendingPathComponent("icon_\(name).png"))
    chunks.append(Data(type.utf8))
    chunks.append(bigEndian(UInt32(data.count + 8)))
    chunks.append(data)
}
var icns = Data("icns".utf8)
icns.append(bigEndian(UInt32(chunks.count + 8)))
icns.append(chunks)
try icns.write(to: desktop.appendingPathComponent("icon.icns"))

// ICO directory with lossless PNG payloads for modern browsers.
func littleEndian<T: FixedWidthInteger>(_ value: T) -> Data {
    var value = value.littleEndian
    return withUnsafeBytes(of: &value) { Data($0) }
}
let sizes = [16, 32, 48]
let images = try sizes.map { try Data(contentsOf: web.appendingPathComponent("icon-\($0).png")) }
var ico = Data([0, 0, 1, 0, 3, 0])
var offset = 6 + 16 * sizes.count
for (size, data) in zip(sizes, images) {
    ico.append(contentsOf: [UInt8(size), UInt8(size), 0, 0])
    ico.append(littleEndian(UInt16(1)))
    ico.append(littleEndian(UInt16(32)))
    ico.append(littleEndian(UInt32(data.count)))
    ico.append(littleEndian(UInt32(offset)))
    offset += data.count
}
for data in images { ico.append(data) }
try ico.write(to: root.appendingPathComponent("public/favicon.ico"))
print("Exported RGBA PNG, favicon ICO, Apple touch icon, PWA sizes and macOS ICNS.")
