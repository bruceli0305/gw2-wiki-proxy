export const config = {
  runtime: 'edge',
};

export default async function (request) {
  const url = new URL(request.url);
  // 构造目标官网地址
  const targetUrl = new URL(url.pathname + url.search, 'https://wiki.guildwars2.com');

  // 1. 深度克隆并清理头部
  const headers = new Headers();
  headers.set('Host', 'wiki.guildwars2.com');
  headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
  headers.set('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8');
  headers.set('Accept-Language', 'zh-CN,zh;q=0.9,en;q=0.8');
  headers.set('Referer', 'https://wiki.guildwars2.com/');

  // 2. 发起脱敏请求
  const response = await fetch(targetUrl.toString(), {
    method: request.method,
    headers: headers,
    redirect: 'follow',
  });

  // 3. 如果依然 403，尝试处理
  if (response.status === 403) {
    return new Response("官网屏蔽了该边缘节点，请尝试在 Vercel 重新部署以更换 IP。", { status: 403 });
  }

  // 4. 处理域名替换（把官网链接换成你的）
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('text/html')) {
    let text = await response.text();
    // 替换所有官网链接为你的域名
    text = text.替换(/wiki\.guildwars2\.com/g, 'wiki.gw2.org.cn');
    return new Response(text, {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }

  // 5. 其他资源（图片、CSS）直接返回
  return response;
}
