# LG webOS Camera Wall

A separate full-screen camera dashboard for rooted LG webOS TVs. It shows four Home Assistant cameras at a time, with paging and a single-camera view. It does not modify `ha-lg-webos-pip`.

## TV app

Build with `cd tv-app && npm run package` (requires the webOS `ares-package` CLI). Install the resulting `dist/io.github.lukeshepp.camera-wall_0.1.0_all.ipk` on the TV using your normal root/Homebrew method.

Open **Camera Wall** once from the TV app list. It asks for the HA URL and a long-lived access token, unless the HA companion has sent them. The app never embeds a token in the IPK. Its app ID is `io.github.lukeshepp.camera-wall`.

The app defaults to MJPEG and falls back to one snapshot per second if a camera cannot supply MJPEG. HLS is selectable, but several simultaneous hardware video streams may exceed the TV's decoder capacity.

Remote controls: Left/Right change pages, Up/Down choose a tile, OK enlarges or restores it, Back leaves the enlarged view or exits, and Yellow opens settings. The Magic Remote pointer can also select a tile and the Settings/Refresh buttons.

## Home Assistant companion

Copy `custom_components/lg_webos_camera_wall` into your HA `config/custom_components/` directory and restart HA. Add **LG webOS Camera Wall** under **Settings → Devices & services**. Choose your LG TV, HA URL and token, and the camera entities you want. Leaving the selection empty shows all cameras.

After setup, press **Send setup to TV** once. That pairs the TV app and opens it. **Open Camera Wall** sends the current camera selection without resending the token. If you later change the URL or token, press **Send setup to TV** again. If you change the camera selection, press **Open Camera Wall** once to sync it; future direct launches from the TV app list use the saved selection.

The token is stored in HA's integration options and in the TV app's local storage. It is sent through the TV launch API only when **Send setup to TV** is pressed. Use a dedicated HA user with access to the cameras you want to display.

## Button remapping

The dashboard works independently of button remapping. Once it works from the app list, map a spare remote button to launch `io.github.lukeshepp.camera-wall` with a rooted-TV input remapper such as LG Input Hook. Discover the actual button ID on this TV rather than assuming a Netflix key code.

## Credits

The HA WebSocket client and camera player were adapted from the MIT-licensed [ha-lg-webos-pip](https://github.com/Luke-Shepp/ha-lg-webos-pip). Their original license is in `THIRD_PARTY/ha-lg-webos-pip.LICENSE`. HLS playback bundles hls.js under its Apache 2.0 license in `tv-app/app/lib/HLS-LICENSE.txt`.
