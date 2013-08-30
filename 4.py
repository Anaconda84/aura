# coding: utf-8

import cPickle
import base64
import pymongo

class Peer(object):
    def __init__(self):
        self.id = 'kos'
        self.peerid = PPP()
        self.bitmap = '11111'

class PPP(object):
    def __init__(self):
        self.pid = 'kos'
        self.room = Peer()
#####################################################

def class_to_base(obj_class):
    conn = pymongo.Connection()
    db = conn.mydb
    coll = db.mycoll
    s = cPickle.dumps(obj_class, cPickle.HIGHEST_PROTOCOL)
#    encoded = base64.b64encode(s)
#    doc = {"123456": encoded}
#    coll.save(doc)

def base_to_class():
    conn = pymongo.Connection()
    db = conn.mydb
    coll = db.mycoll
    encoded=coll.find()[0]['123456']
    import pdb; pdb.set_trace()
    decoded=base64.b64decode(encoded)
    return cPickle.loads(decoded)

class_to_base(Peer())
#peer = base_to_class()

print peer.id


