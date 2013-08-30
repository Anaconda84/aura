import pymongo
import json
from collections import namedtuple

class Peer(object):
    def __init__(self):
        self.id = 'kos'
        self.peerid = 'dvdsvds'
        self.bitmap = '11111'


conn = pymongo.Connection()
db = conn.mydb
coll = db.mycoll
doc = {"name":"kos", "surname":"Shilow", 'qwerty': {"111": "aaa", "222": "bbb"}}
coll.save(doc)
#print json.dumps(cls=Peer)
#data = json.dumps(Peer().__dict__)
#x = json.loads(data, object_hook=lambda d: namedtuple('X', d.keys())(*d.values()))
#print x
#coll.update({"name":"kos"}, Peer())
#coll.save()

for men in coll.find():
  print men


