# Mapbox Animation Component for Remotion

<p align="center">
  <a href="https://github.com/remotion-dev/logo">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://github.com/remotion-dev/logo/raw/main/animated-logo-banner-dark.gif">
      <img alt="Animated Remotion Logo" src="https://github.com/remotion-dev/logo/raw/main/animated-logo-banner-light.gif">
    </picture>
  </a>
</p>

A reusable component for creating country-focused map animations with Remotion and Mapbox GL.

## Features

- Highlight countries with customizable animations
- Multiple motion styles (rotateAndPitch, northToRotate)
- Theme support (light/dark)
- Various marker and icon types
- Text labels and information display
- Configurable animation settings
- Clean component architecture with context providers

## Installation

```console
npm i
```

## Usage

### Basic Usage

```jsx
import { MapboxAnimation } from './src';

// Basic usage with default settings
<MapboxAnimation countryCode="USA" />

// Customized example
<MapboxAnimation 
  countryCode="JPN" 
  theme="dark"
  iconType="flag"
  showText={true}
  highlightColor="#ff5500"
/>
```

### Advanced Usage with Compound Components

```jsx
import { MapboxAnimation } from './src';

// Using compound components for more control
<MapboxAnimation 
  countryCode="FRA" 
  theme="light"
  motion="rotateAndPitch"
>
  <MapboxAnimation.Marker iconType="flag" />
  <MapboxAnimation.InfoBox>Population: 67 million</MapboxAnimation.InfoBox>
</MapboxAnimation>
```

## Component Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `countryCode` | string | "KOR" | ISO 3166-1 alpha-3 country code |
| `customText` | string | country name | Custom text to display |
| `iconType` | string | "marker" | Type of icon to display |
| `theme` | "light" \| "dark" | "light" | Map theme |
| `motion` | "rotateAndPitch" \| "northToRotate" | "northToRotate" | Animation motion style |
| `showIcon` | boolean | true | Whether to show the icon |
| `showText` | boolean | false | Whether to show text label |
| `disableFallbackIcon` | boolean | false | Disable fallback icon when no icon/text |
| `enableIconDropShadow` | boolean | true | Enable drop shadow on icon |
| `iconSettings` | object | | Customize icon appearance |
| `textSettings` | object | | Customize text appearance |
| `infoSettings` | object | | Customize info box appearance |
| `backgroundColor` | string | | Custom background color |
| `highlightColor` | string | | Custom highlight color |
| `additionalInfo` | string | | Additional info text to display |
| `settings` | object | | Advanced animation settings |

## Available Icon Types

- **Basic mapping icons**: "marker", "pin", "marker-alt", "location", "location-fill", "compass", "arrow", "gps"
- **Information icons**: "info", "warning", "cross", "star"
- **Special icons**: "flag", "skull", "death-skull", "target"
- **Other**: "none" (no icon)

## Project Structure

The component uses a clean architecture with:

- `core/`: Domain models and types
- `services/`: Specialized services for map, animation, and markers
- `contexts/`: Context providers for state management
- `components/`: Reusable React components

## Commands

**Start Preview**

```console
npm run dev
```

**Render video**

```console
npx remotion render
```

## License

Note that for some entities a company license is needed. [Read the terms here](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md).
