export const config = {
  runtime: 'edge',
};

export default async function (request) {
  const url = new URL(request.url);
  // 直接构造英文官网目标地址
  const targetUrl = new URL(url.pathname + url.search, 'https://wiki.guildwars2.com');

  const headers = new Headers();
  headers.set('Host', 'wiki.guildwars2.com');
  // 模拟纯正的北美/欧洲 Chrome 浏览器
  headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
  headers.set('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8');
  headers.set('Accept-Language', 'en-US,en;q=0.9');
  headers.set('Referer', 'https://wiki.guildwars2.com/');

  try {
    const response = await fetch(targetUrl.toString(), {
      method: request.method,
      headers: headers,
      redirect: 'manual', 
    });

    // 1. 拦截重定向，防止跳回官方域名
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

    // 2. 处理 HTML 文本替换
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      let text = await response.text();
      // 将页面中所有的官方链接改为你的域名，确保点击后不跳出
      text = text.replace(/wiki\.guildwars2\.com/g, url.hostname);
      return new Response(text, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // 3. 其他静态资源直接返回
    return response;
  } catch (e) {
    return new Response("Proxy Error: " + e.message, { status: 500 });
  }
}
