// @ts-expect-error
import module from "@takumi-rs/wasm/takumi_wasm_bg.wasm";
import { initSync, Renderer } from "@takumi-rs/wasm";
import { container } from "@takumi-rs/helpers";
import { waitUntil } from "cloudflare:workers";

initSync({ module });

function isValidHexColor(color: string): boolean {
  const hexColorRegex = /^[0-9A-Fa-f]{6}$/i;
  return hexColorRegex.test(color);
}

function createOpenGraphImage(bgColor: string) {
  const colorValue = parseInt(bgColor, 16);
  return container({
    style: {
      width: 1200,
      height: 630,
      backgroundColor: colorValue,
    },
  });
}

export default {
  async fetch(request): Promise<Response> {
    const url = new URL(request.url);

    // Construct the cache key from the cache URL
    const cacheKey = new Request(url.toString(), request);
    const cache = caches.default;
    let response = await cache.match(cacheKey);

    if (!response) {
      const bgColor = url.pathname.slice(1);
      if (!isValidHexColor(bgColor)) {
        return new Response("Invalid format", {
          status: 400,
          headers: {
            "Content-Type": "text/plain",
          },
        });
      }

      const renderer = new Renderer();
      const arrayBuffer = renderer.render(
        createOpenGraphImage(bgColor.toUpperCase()),
        1200,
        630,
      );
      response = new Response(arrayBuffer, {
        headers: {
          "Content-Type": "image/webp",
          "Cache-Control": "s-maxage=86400",
        },
      });
      waitUntil(cache.put(cacheKey, response.clone()));
    }
    return response;
  },
} satisfies ExportedHandler<Env>;
