#!/usr/bin/env swift

import AppKit
import Foundation
import ImageIO
import UniformTypeIdentifiers

let arguments = CommandLine.arguments

guard [5, 6].contains(arguments.count) else {
  FileHandle.standardError.write(
    Data("Usage: render-svg.swift INPUT OUTPUT WIDTH HEIGHT [opaque]\n".utf8)
  )
  exit(64)
}

let input = URL(fileURLWithPath: arguments[1])
let output = URL(fileURLWithPath: arguments[2])

guard let width = Int(arguments[3]), let height = Int(arguments[4]) else {
  FileHandle.standardError.write(Data("Width and height must be integers.\n".utf8))
  exit(64)
}

var isOpaque = false
if arguments.count == 6 {
  guard arguments[5] == "opaque" else {
    FileHandle.standardError.write(Data("The optional mode must be opaque.\n".utf8))
    exit(64)
  }

  isOpaque = true
}

guard let image = NSImage(contentsOf: input) else {
  FileHandle.standardError.write(Data("Could not read \(input.path).\n".utf8))
  exit(66)
}

var alphaInfo = CGImageAlphaInfo.premultipliedLast
if isOpaque {
  alphaInfo = .noneSkipLast
}

guard let canvas = CGContext(
  data: nil,
  width: width,
  height: height,
  bitsPerComponent: 8,
  bytesPerRow: width * 4,
  space: CGColorSpaceCreateDeviceRGB(),
  bitmapInfo: alphaInfo.rawValue
) else {
  FileHandle.standardError.write(Data("Could not create the bitmap canvas.\n".utf8))
  exit(70)
}

let context = NSGraphicsContext(cgContext: canvas, flipped: false)
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = context
context.imageInterpolation = .high
if isOpaque {
  NSColor(
    calibratedRed: 27 / 255,
    green: 22 / 255,
    blue: 19 / 255,
    alpha: 1
  ).setFill()
} else {
  NSColor.clear.setFill()
}
NSRect(x: 0, y: 0, width: width, height: height).fill()
image.draw(
  in: NSRect(x: 0, y: 0, width: width, height: height),
  from: .zero,
  operation: .sourceOver,
  fraction: 1,
  respectFlipped: true,
  hints: [.interpolation: NSImageInterpolation.high]
)
context.flushGraphics()
NSGraphicsContext.restoreGraphicsState()

guard let rendered = canvas.makeImage() else {
  FileHandle.standardError.write(Data("Could not create the rendered image.\n".utf8))
  exit(70)
}

let encoded = NSMutableData()
guard let destination = CGImageDestinationCreateWithData(
  encoded,
  UTType.png.identifier as CFString,
  1,
  nil
) else {
  FileHandle.standardError.write(Data("Could not encode the PNG.\n".utf8))
  exit(70)
}

CGImageDestinationAddImage(destination, rendered, nil)
guard CGImageDestinationFinalize(destination) else {
  FileHandle.standardError.write(Data("Could not finish encoding the PNG.\n".utf8))
  exit(70)
}

try (encoded as Data).write(to: output, options: .atomic)
