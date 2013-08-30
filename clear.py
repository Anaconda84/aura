import pymongo
import json

conn = pymongo.Connection()
db = conn.mydb
coll = db.mycoll

coll.remove({})


