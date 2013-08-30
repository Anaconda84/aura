import pymongo
import json

conn = pymongo.Connection()
db = conn.mydb
coll = db.mycoll

doc = {"111":"aaa", "222":"bbb"}
coll.save(doc)

