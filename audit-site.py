from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
import json
r=Path(__file__).parent
class Links(HTMLParser):
 def __init__(self):super().__init__();self.urls=[];self.ids=set()
 def handle_starttag(self,t,attrs):
  a=dict(attrs)
  if 'id'in a:self.ids.add(a['id'])
  if t in ('a','link','script','img'):
   for k in ('href','src'):
    if a.get(k):self.urls.append(a[k])
errors=[];pages=list(r.glob('*.html'))+list((r/'people').glob('*.html'))
for p in pages:
 parser=Links();parser.feed(p.read_text())
 for u in parser.urls:
  z=urlsplit(u)
  if z.scheme or z.netloc:continue
  target=(p.parent/unquote(z.path)).resolve() if z.path else p.resolve()
  if not target.exists():errors.append((str(p),u))
  if z.fragment and target.suffix=='.html' and target.exists():
   b=Links();b.feed(target.read_text())
   if unquote(z.fragment) not in b.ids:errors.append((str(p),'missing anchor '+u))
assert not errors,errors[:20]
data=json.loads((r/'data/catalog.json').read_text());assert len(data)==537 and len(list((r/'people').glob('*.html')))==537
for p in data:assert (r/'people'/f"{p['id']}.html").exists()
for im in json.loads((r/'data/images.json').read_text()):assert(r/im['file']).exists()
print('PASS:',len(pages),'HTML pages; all local links and anchors; 537 person records; all image references')
