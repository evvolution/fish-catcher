import CoreImage
import Foundation
import UniformTypeIdentifiers
import Vision

guard CommandLine.arguments.count == 3 else {
  FileHandle.standardError.write(Data("usage: remove-fish-background <input> <output.png>\n".utf8))
  exit(64)
}

let inputURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[2])

guard let inputImage = CIImage(contentsOf: inputURL, options: [.applyOrientationProperty: true]) else {
  FileHandle.standardError.write(Data("cannot read image: \(inputURL.path)\n".utf8))
  exit(65)
}

let request = VNGenerateForegroundInstanceMaskRequest()
let handler = VNImageRequestHandler(ciImage: inputImage)
try handler.perform([request])

guard let observation = request.results?.first, !observation.allInstances.isEmpty else {
  FileHandle.standardError.write(Data("no foreground found: \(inputURL.lastPathComponent)\n".utf8))
  exit(66)
}

let maskBuffer = try observation.generateScaledMaskForImage(
  forInstances: observation.allInstances,
  from: handler
)
let maskImage = CIImage(cvPixelBuffer: maskBuffer)
let transparentImage = CIImage(color: .clear).cropped(to: inputImage.extent)
let result = inputImage.applyingFilter(
  "CIBlendWithMask",
  parameters: [
    kCIInputBackgroundImageKey: transparentImage,
    kCIInputMaskImageKey: maskImage,
  ]
)

let context = CIContext(options: [.cacheIntermediates: false])
let colorSpace = CGColorSpace(name: CGColorSpace.sRGB) ?? CGColorSpaceCreateDeviceRGB()
try context.writePNGRepresentation(
  of: result,
  to: outputURL,
  format: .RGBA8,
  colorSpace: colorSpace
)
