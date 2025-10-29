// Локальный CORS-прокси для запросов к ЦБ РФ
// Запуск: node proxy.js
// Эндпоинт: http://localhost:8787/cbr?date_req1=DD/MM/YYYY&date_req2=DD/MM/YYYY&VAL_NM_RQ=R01235

const http = require("http");
const https = require("https");
const PORT = process.env.PORT ? Number(process.env.PORT) : 8787;

function forward(path, clientRes) {
  const url = `https://www.cbr.ru/scripts/XML_dynamic.asp${path}`;
  https
    .get(url, (res) => {
      clientRes.statusCode = res.statusCode || 200;
      clientRes.setHeader("Access-Control-Allow-Origin", "*");
      clientRes.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
      clientRes.setHeader("Access-Control-Allow-Headers", "*");
      clientRes.setHeader("Content-Type", res.headers["content-type"] || "text/xml; charset=windows-1251");
      res.pipe(clientRes);
    })
    .on("error", (err) => {
      clientRes.statusCode = 502;
      clientRes.setHeader("Access-Control-Allow-Origin", "*");
      clientRes.end("Proxy error: " + err.message);
    });
}

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.end();
    return;
  }

  if (req.url.startsWith("/cbr")) {
    const idx = req.url.indexOf("?");
    const query = idx >= 0 ? req.url.slice(idx) : "";
    forward(query, res);
    return;
  }

  res.statusCode = 404;
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`CBR proxy running at http://localhost:${PORT}`);
});

