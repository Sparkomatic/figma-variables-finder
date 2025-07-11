#!/bin/bash

# Package Figma plugin for publishing
echo "Packaging Figma plugin..."

# Create a clean package directory
rm -rf package
mkdir package

# Copy required files
cp manifest.json package/
cp code.js package/
cp ui.html package/

# Create ZIP file
zip -r "broken-variable-reference-checker.zip" package/

# Clean up
rm -rf package

echo "Plugin packaged as: broken-variable-reference-checker.zip"
echo "Ready for upload to Figma Plugin Publisher!" 