import pymongo
import json

conn = pymongo.Connection()
db = conn.stat
coll_stat = db.mycoll

coll_stat.remove({})


