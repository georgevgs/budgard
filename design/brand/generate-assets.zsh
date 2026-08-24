#!/bin/zsh

set -euo pipefail

script_directory=${0:A:h}
repository_root=${script_directory:h:h}
renderer="${TMPDIR:-/tmp}/budgard-render-svg"
module_cache="${TMPDIR:-/tmp}/budgard-swift-module-cache"

mkdir -p "$module_cache"
swiftc -module-cache-path "$module_cache" "$script_directory/render-svg.swift" -o "$renderer"

"$renderer" "$repository_root/public/brand/app-icon.svg" "$repository_root/public/apple-touch-icon.png" 180 180 opaque
"$renderer" "$repository_root/public/brand/app-icon.svg" "$repository_root/public/icon-192x192.png" 192 192 opaque
"$renderer" "$repository_root/public/brand/app-icon.svg" "$repository_root/public/icon-512x512.png" 512 512 opaque
"$renderer" "$repository_root/public/brand/app-icon-maskable.svg" "$repository_root/public/icon-192x192-maskable.png" 192 192 opaque
"$renderer" "$repository_root/public/brand/app-icon-maskable.svg" "$repository_root/public/icon-512x512-maskable.png" 512 512 opaque
"$renderer" "$repository_root/public/brand/budgard-mark.svg" "$repository_root/public/notification-badge.png" 96 96
"$renderer" "$repository_root/public/favicon.svg" /tmp/budgard-favicon.png 64 64
"$renderer" "$repository_root/public/og-image.svg" "$repository_root/public/og-image.png" 1200 630 opaque

sips -s format ico /tmp/budgard-favicon.png --out "$repository_root/public/favicon.ico" >/dev/null

for light_file in "$repository_root"/public/splash/apple-splash-*.jpg; do
  if [[ "$light_file" == *-dark.jpg ]]; then
    continue
  fi

  name=${light_file:t:r}
  dimensions=${name#apple-splash-}
  pixel_width=${dimensions%-*}
  pixel_height=${dimensions#*-}
  dark_file="${light_file%.jpg}-dark.jpg"
  light_png="/tmp/budgard-launch-light-${pixel_width}-${pixel_height}.png"
  dark_png="/tmp/budgard-launch-dark-${pixel_width}-${pixel_height}.png"

  "$renderer" "$script_directory/launch-light.svg" "$light_png" "$pixel_width" "$pixel_height" opaque
  "$renderer" "$script_directory/launch-dark.svg" "$dark_png" "$pixel_width" "$pixel_height" opaque
  sips -s format jpeg -s formatOptions 95 "$light_png" --out "$light_file" >/dev/null
  sips -s format jpeg -s formatOptions 95 "$dark_png" --out "$dark_file" >/dev/null
done
