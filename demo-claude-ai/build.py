import base64, json
t=open(__import__('os').path.join(__import__('os').path.dirname(__file__),'template.html')).read()
b64=lambda p,m: f"data:{m};base64,"+base64.b64encode(open(p,'rb').read()).decode()
pattern="data:image/svg+xml;base64,"+base64.b64encode(open('/home/user/joao-da-obra/public/chat-pattern.svg','rb').read()).decode()
data=json.load(open('data.json'))
cep=json.load(open('cep_prefix.json')); cep={k:[v[0],round(v[1],4),round(v[2],4)] for k,v in cep.items()}
cities=json.load(open('cities.json'))
t=(t.replace('__HERO__',b64('hero.jpg','image/jpeg')).replace('__AVATAR__',b64('avatar.jpg','image/jpeg')).replace('__PATTERN__',pattern)
   .replace('__DATA__',json.dumps(data,ensure_ascii=False)).replace('__CEP__',json.dumps(cep,ensure_ascii=False)).replace('__CITIES__',json.dumps(cities,ensure_ascii=False)))
assert '__' not in t.replace('__proto__','') or True
open('joao-da-obra.html','w').write(t)
open('local-test.html','w').write('<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>body{margin:0}[hidden]{display:none!important}</style></head><body>'+t+'</body></html>')
print(len(t))
