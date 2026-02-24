export const config = {
  runtime: 'edge',
};

export default async function (request) {
  const url = new URL(request.url);
  // 构造目标官网地址
  const targetUrl = new URL(url.pathname + url.search, 'https://wiki.guildwars2.com');

  const headers = new Headers(request.headers);
  headers.set('Host', 'wiki.guildwars2.com');
  headers.set('Referer', 'https://wiki.guildwars2.com/');
  // 抹除可能导致重定向的 Vercel 特征
  headers.delete('x-vercel-id');
  headers.delete('x-forwarded-for');

  const response = await fetch(targetUrl.toString(), {
    method: request.method,
    headers: headers,
    redirect: 'manual', // 【关键】手动处理重定向，不让它自动跳走
  });

  // 1. 拦截官方的重定向指令 (301/302)
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

  // 2. 如果是 403，说明 IP 还是被 AWS 盯上了
  if (response.status === 403) {
    return new Response("触发了官网 AWS 的深度拦截，请尝试在 Vercel 重新部署以获得新 IP。", { status: 403 });
  }

  // 3. 处理 HTML 里的链接替换
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('text/html')) {
    let text = await response.text();
    // 替换所有官方域名为当前访问的域名
    text = text.replace(/wiki\.guildwars2\.com/g, url.hostname);
    return new Response(text, {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }

  // 4. 图片、JS、CSS 等静态资源正常返回
  return response;
}
