# Field Dex

A free, Pokédex-style birding app for iPhone. It runs as a web app you add to your Home Screen.

- **Tap the ball** and describe the bird out loud. Tap anywhere to finish.
- **Swipe the ball up** to record a bird singing. BirdNET names it.
- **Photo** and **Pick from list** are on the capture screen.
- **Dex** shows only birds you've caught. **Nearby** is the treasure hunt for birds reported around you.

## Setup on your phone
1. Open the app's link in Safari, tap Share → Add to Home Screen.
2. Open it from the Home Screen and allow Location and Microphone when asked.
3. Tap NEARBY and paste your free eBird key from https://ebird.org/api/keygen.

## Where things come from
- Sightings, hotspots and regional lists: eBird API 2.0 (Cornell Lab of Ornithology).
- Photos, sounds and descriptions: iNaturalist (each photo shows its photographer's credit).
- Sound ID: BirdNET V2.4 model (K. Lisa Yang Center for Conservation Bioacoustics, Cornell Lab, and TU Chemnitz), licensed CC BY-NC-SA 4.0. Used here for personal, non-commercial birding. Model file taken from the birdnetlib package.
- Model runtime: LiteRT.js (`@litertjs/core` 2.5.3, Apache-2.0), bundled in `vendor/litert/`.

Everything you catch is stored on your phone only. Use Settings → Save backup now and then.
