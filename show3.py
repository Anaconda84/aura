import pymongo
import json

conn = pymongo.Connection()
db = conn.stat
coll_stat = db.mycoll

for men in coll_stat.find():
    print '--- ',men


