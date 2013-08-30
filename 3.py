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
#        self.room = Peer()

conn = pymongo.Connection()
db = conn.mydb
coll = db.mycoll

#data = ['Test data', {'Structure':'Any'} ]
#print data

# dump
s = cPickle.dumps(Peer(), cPickle.HIGHEST_PROTOCOL)
#s = cPickle.dumps(Peer())
print 'source=',s
encoded = base64.b64encode(s)
print 'encoded=',encoded

doc = {"123456": encoded}
coll.save(doc)

encoded=coll.find()[0]['123456']
print 'encoded from base=',encoded

decoded=base64.b64decode(encoded)
print 'decoded=',decoded

# load
#data = cPickle.loads(s)
#print data.id


