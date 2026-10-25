# You are the dungeon: builds the prototype from src/ into
#   index.html          the web version served by GitHub Pages (full screen, installable, results to Google Drive)
#   dist/artifact.html  the same game as a Claude artifact page (results to the artifact's database)
#   dist/check.js       the script alone, for `node --check dist/check.js`
# Run: python3 build.py
import json, os, re

R = os.path.dirname(os.path.abspath(__file__)) + '/'
PARTS = ['p0_head.html', 'p0b_body.html', 'p1_config.js', 'p1e_en.js', 'p2_state_map.js', 'p3_flow.js', 'p4_traps.js',
         'p5_ai.js', 'p6_loop.js', 'p7_draw.js', 'p7c_art.js', 'p8a_icons.js', 'p8b_ui.js']
src = ''.join(open(R + 'src/' + p, encoding='utf-8').read() for p in PARTS)
os.makedirs(R + 'dist', exist_ok=True)
open(R + 'dist/artifact.html', 'w', encoding='utf-8').write(src)
open(R + 'dist/check.js', 'w', encoding='utf-8').write(re.search(r'<script>(.*)</script>', src, re.S).group(1))

cfg = json.load(open(R + 'web_config.json', encoding='utf-8'))
cut = src.index('\n<div id="app">')
head, body = src[:cut], src[cut:]
web_head = ('<!doctype html><html lang="pl"><head><meta charset="utf-8">'
  '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">'
  '<meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#09090b">'
  '<meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes">'
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="apple-mobile-web-app-title" content="Dungeon">'
  '<meta name="description" content="You are the dungeon: prototyp gry mobilnej (test).">'
  '<link rel="manifest" href="manifest.webmanifest"><link rel="icon" type="image/png" href="icon-192.png"><link rel="apple-touch-icon" href="apple-touch-icon.png">'
  '<style>html,body{margin:0;padding:0}</style>'
  '<script>window.YATD_WEB=1;window.YATD_REMOTE=' + json.dumps({'url': cfg['url'], 'token': cfg['token']}) + ';'
  "if('serviceWorker' in navigator)addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){})});</script>")
open(R + 'index.html', 'w', encoding='utf-8').write(web_head + head + '</head><body>' + body + '</body></html>')
print('built: index.html (web), dist/artifact.html; em-dash:', src.count('—'), '(must be 0)')
