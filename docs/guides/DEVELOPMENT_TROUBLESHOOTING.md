# DamInspect Development Troubleshooting Guide

## Common Issues and Solutions

### 1. HTML Element Errors (span, div, etc.)
**Symptoms**: "View config getter callback for component 'span' must be a function"
**Root Cause**: Corrupted node_modules or cached JavaScript bundles
**Solution**: Complete clean rebuild
```bash
npm run clean:full
```

### 2. Mapbox PointAnnotation Errors
**Symptoms**: "PointAnnotation supports max 1 subview other than a callout"
**Root Cause**: Multiple child elements in PointAnnotation components
**Solution**: Ensure only one direct child element per PointAnnotation

### 3. Metro Bundler Port Conflicts
**Symptoms**: "address already in use :::8081"
**Solution**: Kill existing Metro processes
```bash
pkill -f "metro"
lsof -ti:8081 | xargs kill -9
```

### 4. iOS Build Issues
**Symptoms**: Various Xcode compilation errors
**Solution**: Clean iOS build
```bash
cd ios && rm -rf build DerivedData && pod install
```

## Prevention Scripts

Use these npm scripts to maintain a clean development environment:

- `npm run clean` - Clean Metro, Watchman, and iOS build folders
- `npm run clean:full` - Complete clean rebuild (use when experiencing persistent errors)
- `npm run dev` - Start Metro with reset cache

## Development Best Practices

1. **Regular Cache Clearing**: Run `npm run clean` weekly
2. **Version Control**: Always commit package-lock.json
3. **Clean Rebuilds**: Use `npm run clean:full` when switching branches with package changes
4. **Console Warnings**: Address warnings promptly before they become errors

## Error Response Protocol

When encountering persistent errors:

1. Try hot reload first (`r` in Metro terminal)
2. If error persists, run `npm run clean`
3. If still failing, run `npm run clean:full`
4. Check this guide for specific error patterns
5. If issue continues, check React Native and dependency versions for compatibility