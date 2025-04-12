import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

// Register the root component
registerRoot(RemotionRoot);

// Export the main component
export { MapboxAnimation } from './components/MapboxAnimation';
export { Composition } from './Composition';

// Export types from core
export * from './core/mapboxTypes';
export * from './core/animationModel';

// Export subcomponents
export { Map } from './components/Map';
// export { CountryLayer } from './components/CountryLayer';
export { DeckMarkerOverlay } from './components/DeckMarkerOverlay';
