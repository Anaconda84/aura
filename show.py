import pymongo
import json

conn = pymongo.Connection()
db = conn.mydb
coll = db.mycoll

for men in coll.find():
    print '--- ',men


