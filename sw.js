/* Кэш приложения. Поменяйте номер версии, если загрузили новый index.html
   и хотите, чтобы телефоны гарантированно забрали свежую версию. */
var CACHE = "spisok-v8";
var ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(ASSETS); }).then(function(){ return self.skipWaiting(); }));
});

self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.map(function(k){ return k === CACHE ? null : caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});

self.addEventListener("fetch", function(e){
  var req = e.request;
  if(req.method !== "GET") return;

  /* Страница: сначала сеть — чтобы обновления приходили сразу, кэш как запасной вариант офлайн */
  if(req.mode === "navigate"){
    e.respondWith(
      fetch(req).then(function(res){
        var copy = res.clone();
        caches.open(CACHE).then(function(c){ c.put("./index.html", copy); });
        return res;
      }).catch(function(){
        return caches.match("./index.html").then(function(r){ return r || caches.match("./"); });
      })
    );
    return;
  }

  /* Остальное (иконки, библиотека mqtt): сначала кэш, потом сеть */
  e.respondWith(
    caches.match(req).then(function(hit){
      if(hit) return hit;
      return fetch(req).then(function(res){
        if(res && (res.ok || res.type === "opaque")){
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copy); });
        }
        return res;
      });
    })
  );
});

/* нажатие на уведомление возвращает в приложение */
self.addEventListener("notificationclick", function(e){
  e.notification.close();
  e.waitUntil(clients.matchAll({ type:"window", includeUncontrolled:true }).then(function(list){
    for(var i = 0; i < list.length; i++){
      if(list[i].url.indexOf(self.registration.scope) === 0 && "focus" in list[i]) return list[i].focus();
    }
    if(clients.openWindow) return clients.openWindow("./");
  }));
});
