var CACHE_NAME='drone-war-offline-v7-realistic-arena';
var CORE=[
  '/',
  '/manifest.webmanifest',
  '/icon.svg',
  '/game.part1.txt',
  '/game.part2.txt',
  '/game.part3.txt',
  '/game.part4.txt',
  '/game.part5.txt',
  '/game.part6.txt',
  '/game.part7.txt'
];

self.addEventListener('install',function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(CORE);
    }).then(function(){
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate',function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(key){
        if(key.indexOf('drone-war-offline-')===0 && key!==CACHE_NAME)return caches.delete(key);
      }));
    }).then(function(){
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch',function(event){
  if(event.request.method!=='GET')return;
  var url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;

  if(event.request.mode==='navigate'){
    event.respondWith(
      fetch(event.request).then(function(response){
        if(response && response.ok){
          var copy=response.clone();
          caches.open(CACHE_NAME).then(function(cache){cache.put('/',copy);});
        }
        return response;
      }).catch(function(){
        return caches.match('/').then(function(cached){
          return cached || new Response(
            '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="background:#06111d;color:white;font-family:system-ui;text-align:center;padding:40px"><h2>Drone War</h2><p>Offline dosyası bulunamadı. İnterneti açıp oyunu bir kez tamamen yükle.</p></body>',
            {headers:{'Content-Type':'text/html; charset=utf-8'}}
          );
        });
      })
    );
    return;
  }

  if(/^\/game\.part\d+\.txt$/.test(url.pathname)){
    event.respondWith(
      fetch(event.request).then(function(response){
        if(response && response.ok){
          var copy=response.clone();
          caches.open(CACHE_NAME).then(function(cache){cache.put(event.request,copy);});
        }
        return response;
      }).catch(function(){
        return caches.match(event.request);
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function(cached){
      if(cached)return cached;
      return fetch(event.request).then(function(response){
        if(response && response.ok){
          var copy=response.clone();
          caches.open(CACHE_NAME).then(function(cache){cache.put(event.request,copy);});
        }
        return response;
      });
    })
  );
});