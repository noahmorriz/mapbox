/**
 * Note: When using the Node.JS APIs, the config file
 * doesn't apply. Instead, pass options directly to the APIs.
 *
 * All configuration options: https://remotion.dev/docs/config
 */

import { Config } from "@remotion/cli/config";
import { enableTailwind } from '@remotion/tailwind-v4';

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// Set this to swiftshader when rendering on Lambda
Config.setChromiumOpenGlRenderer('angle');
Config.overrideWebpackConfig(enableTailwind);

// Increase timeouts for slow internet connections and map rendering
// Config.setChromiumTimeout(60 * 1000); // Deprecated in Remotion v4
Config.setConcurrency(4); // Reduce from 8 to 4 concurrent headless browsers for better performance on slow connections
Config.setMaxTimelineTracks(32); // Increase from default for complex animations

// Increase the time allowed for each frame to render
Config.setDelayRenderTimeoutInMilliseconds(60000); // Increased to 60 seconds (from 30s) for map initialization

// Add some time at the start of a render session to initialize resources
// Config.setPuppeteerTimeout(30000); // Deprecated in Remotion v4
