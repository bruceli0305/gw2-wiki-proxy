export const config = {
  runtime: 'edge',
};

export default async function (request) {
  const url = new URL(request.url);
  const targetUrl = new URL(url.pathname + url.search, 'https://wiki.guildwars2.com');

  const headers = new Headers();
  headers.set('Host', 'wiki.guildwars2.com');
  headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
  headers.set('Accept-Language', 'en-US,en;q=0.9');
  headers.set('Referer', 'https://wiki.guildwars2.com/');

  try {
    const response = await fetch(targetUrl.toString(), {
      method: request.method,
      headers: headers,
      redirect: 'manual', 
    });

    // 拦截重定向
    if ([301, 302, 307, 308].includes(response.status)) {
      const location = response.headers.get('Location');
      if (location) {
        const newLocation = location.replace('https://wiki.guildwars2.com', `https://${url.hostname}`);
        return new Response(null, {
          status: response.status,
          headers: { 'Location': newLocation }
        });
      }
    }

    const contentType = response.headers.get('content-type') || '';
    let newResponse = response;

    // --- 核心优化：缓存控制 ---
    const newHeaders = new Headers(response.headers);
    if (contentType.includes('image/') || contentType.includes('text/css') || contentType.includes('application/javascript')) {
      // 静态资源缓存 7 天，极大节省流量
      newHeaders.set('Cache-Control', 'public, max-age=604800, s-maxage=604800');
    } else if (contentType.includes('text/html')) {
      // HTML 页面缓存 1 小时，保证内容更新不会太迟缓
      newHeaders.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    }

    if (contentType.includes('text/html')) {
      let text = await response.text();
      text = text.replace(/wiki\.guildwars2\.com/g, url.hostname);
      newResponse = new Response(text, { headers: newHeaders });
    } else {
      newResponse = new Response(response.body, { headers: newHeaders });
    }

    return newResponse;
  } catch (e) {
    return new Response("Proxy Error: " + e.message, { status: 500 });
  }
}
