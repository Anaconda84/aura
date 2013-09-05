import pymongo
import json

conn = pymongo.Connection()
db_site_id = conn.site_id_db
coll_site_id = db_site_id.mycoll

for men in coll_site_id.find():
    print '--- ',men


