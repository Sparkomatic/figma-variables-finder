# Figma Variables Finder

A Figma plugin that helps you find variables in your design system with search capabilities and comprehensive variable reference or raw value information display.

## What it Does

- **🔍 Search**: Find variables by typing a partial string across all collections
- **📊 Organized Results**: Variables grouped by collection for easy navigation
- **🎨 Theme Awareness**: See which themes/modes each variable is available in
- **🔄 Reference Resolution**: Follow variable reference chains to see final values
- **🌐 Universal Compatibility**: Works with any variable naming convention

## How to Use

1. Install the plugin in Figma
2. Run it in any document with variables
3. Type to search for variables by name
4. Browse results organized by collection

## Example Output

```
Collection: Design Tokens
Variable Name: button/primary/background
Value: button/primary/background → colors/primary/500 → #007AFF
Theme: Light
Type: Color
```

## Development

```bash
npm install
npm run watch    # Development
npm run build    # Production
```

## Disclaimer

This plugin is provided "as is" without warranty of any kind. The plugin is read-only and will not modify your Figma files. Always backup your work before using any plugin. The author is not responsible for any data loss or issues that may arise from using this plugin.

## License

MIT License 