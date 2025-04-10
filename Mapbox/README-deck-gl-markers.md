# Deck.gl Markers for Mapbox Animation

This project uses deck.gl to render markers on a Mapbox GL map in a Remotion animation. The implementation provides frame-synchronized, deterministic marker rendering that eliminates flickering during animation.

## Key Components

### DeckMarkerOverlay

This component renders markers using deck.gl's ScatterplotLayer. It:

1. Gets the current frame from Remotion's `useCurrentFrame()` hook
2. Computes animated values (opacity, scale) using Remotion's `interpolate()` function
3. Synchronizes with the Mapbox camera using the MapContext
4. Creates a GPU-accelerated overlay that stays in sync with the map

The markers are fully data-driven, allowing for deterministic updates based on the current frame.

## Marker Configuration

Markers can be configured through the ConfigContext:

- `iconType`: Determines the marker color (options: 'marker', 'pin', 'flag', 'skull', 'star', 'info')
- `iconSize`: Controls the base size of the markers

## Usage

```jsx
// Basic usage with marker
<MapboxAnimation 
  countryCode="USA" 
  iconType="flag" 
  theme="dark" 
/>

// Without marker
<MapboxAnimation 
  countryCode="USA" 
  iconType="none" 
  theme="dark" 
/>
```

## Animation Parameters

Marker animations are controlled through the settings provided to the ConfigContext:

```jsx
const additionalSettings = {
  settings: {
    general: {
      labelDelayFrames: 30,    // When markers fade in
      labelFadeDuration: 15    // How many frames the fade-in takes
    }
  }
};
```

## Advanced Customization

For more advanced marker customization:

1. Modify the `getMarkerColor` function in DeckMarkerOverlay.tsx
2. Adjust the ScatterplotLayer parameters for different visual styles
3. Replace ScatterplotLayer with other deck.gl layers as needed

## Benefits Over Previous Implementation

- **Deterministic rendering**: All marker properties are computed based on the current frame
- **GPU-accelerated**: Rendering is handled by WebGL through deck.gl
- **No DOM manipulation**: Avoids asynchronous DOM updates that caused flickering
- **Frame-synchronized**: Markers stay perfectly in sync with map rotation and motion 