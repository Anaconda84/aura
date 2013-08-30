import json
from collections import namedtuple
import inspect

class Peer(object):
    def __init__(self):
        self.id = 'kos'
        self.peerid = PPP()
        self.bitmap = '11111'
	
class PPP(object):
    def __init__(self):
        self.pid = 'kos'
#        self.room = Peer()

class Work(object):
    def __init__(self):
        self.obj_list = []

    def recur(self, obj):
	obj.room = Peer()
#	import pdb; pdb.set_trace()
	if obj not in self.obj_list:
	    self.obj_list.append(obj)
	    result = {}
	    for each in obj.__dict__:
		result[each] = getattr(obj, each)
		if not (isinstance(result[each], int) or isinstance(result[each], str)):
		    self.recur(result[each])
		else:
		    print each+' - '+result[each]
	    return result

#work = Work()
record = Work().recur(Peer())
#print record

