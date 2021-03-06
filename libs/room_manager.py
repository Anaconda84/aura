#!/usr/bin/env python
# -*- encoding: utf-8 -*-
# Created on 2013-10-01 10:00:00
import logging
import cPickle
import base64
import pymongo
import copy
from handlers.room import log
from handlers.room import log_stat_rooms

class RoomManager(object):
    def __init__(self):
	logging.debug('Starting logging file.')
        self.rooms = {}
	self.rooms = get_from_base()

    def new(self, meta):
        if meta['hash'] in self.rooms:
            if self.rooms[meta['hash']].sha1_array == meta['sha1_array']:
		logging.debug('get: %s' % self.rooms)
		log.append('get: %s\n' % self.rooms)
                return self.rooms[meta['hash']]
            else:
                return None
        else:
            self.rooms[meta['hash']] = Room(meta['hash'], meta)
	    logging.debug('new: %s' % self.rooms)
	    log.append('new: %s\n' % self.rooms)
            return self.rooms[meta['hash']]

    def delete(self, roomid):
	logging.debug('delete: %s' % roomid)
	log.append('delete: %s\n' % roomid)
        if roomid in self.rooms:
            del self.rooms[roomid]

    def get(self, roomid):
	logging.debug('get: %s' % roomid)
	log.append('get: %s\n' % roomid)
	out = 'rooms='+str(len(self.rooms))
	for each in self.rooms.values():
	    out = out + '\tfilename='+each.filename+'\tpeers='+str(len(each.peers))
        log_stat_rooms.append(out+'\n')

        return self.rooms.get(roomid)

    def keys(self):
	logging.debug('keys: %s' % self.rooms.keys())
	log.append('keys: %s\n' % self.rooms.keys())
        return self.rooms.keys()

    def get_url(self, url):
	conn = pymongo.Connection()
	db_site_id = conn.site_id_db
	coll_site_id = db_site_id.mycoll
	if url:
	    if coll_site_id.find({'url': url}).count() > 0:
    		record = coll_site_id.find({'url': url})[0]
    		if record:
		    return record['roomid']
		    conn.close()
	conn.close()
	return url

class Room(object):
    def __init__(self, id, meta):
        for each in ('hash', 'sha1_array', 'filename', 'piece_size', 'block_size', 'size', 'type'):
            setattr(self, each, meta[each])

        self.id = id
        self.meta = meta
        self.title = self.filename
        self.peers = {}

    def join(self, peerid, ws):
	logging.debug('Room.join: %s' % peerid)
	log.append('Room.join: %s\n' % peerid)
        self.peers[peerid] = Peer(peerid, ws)
        return self.peers[peerid]

    def leave(self, peerid):
	logging.debug('Room.leave: %s' % peerid)
	log.append('Room.leave: %s\n' % peerid)
        if peerid in self.peers:
            del self.peers[peerid]

    def get(self, peerid):
	logging.debug('Room.get: %s' % peerid)
	log.append('Room.get: %s\n' % peerid)
        return self.peers.get(peerid)

    def peer_list(self):
	logging.debug('Room.peer_list: %s' % self.peers)
	log.append('Room.peer_list: %s\n' % self.peers)
        result = {}
        for each in self.peers.itervalues():
            result[each.peerid] = {
                    'bitmap': each.bitmap,
                    }
        return result

    def add_http_peer(self):
	class_to_base(self, self.id)

    def add_statistics(self, stat):
#	logging.debug('Room.add_statistics: %s' % stat)
	conn = pymongo.Connection()
	db = conn.stat
	coll_stat = db.mycoll
	doc = {}
	doc = {'peerid': stat['peerid'] ,'stat': stat}

	if doc:
	    if coll_stat.find({'peerid': doc['peerid']}).count() > 0:
    		record = coll_stat.find({'peerid': doc['peerid']})[0]
    		if record:
		    coll_stat.update({'peerid': doc['peerid']}, doc)
	    else:
		coll_stat.save(doc)

class Peer(object):
    def __init__(self, peerid, ws):
        self.ws = ws
        self.peerid = peerid
        self.bitmap = ''


#########################################################
def class_to_base(obj_class, roomid):
    conn = pymongo.Connection()
    db = conn.mydb
    coll = db.mycoll
    db_site_id = conn.site_id_db
    coll_site_id = db_site_id.mycoll

    ws_save = {}
    for peerid in obj_class.peers:
	ws_save[peerid] = obj_class.peers[peerid].ws
	obj_class.peers[peerid].ws = None

    obj_tmp = copy.deepcopy(obj_class)

    for peerid in obj_class.peers:
	obj_class.peers[peerid].ws = ws_save[peerid]

    doc = {}
    for peerid in obj_class.peers:
	if peerid and peerid.find('http') < 0:
    	    del obj_tmp.peers[peerid]
	else:
	    doc = {'url': peerid ,'roomid': roomid}

    if doc:
	if coll_site_id.find({'url': doc['url']}).count() > 0:
    	    record = coll_site_id.find({'url': doc['url']})[0]
    	    if record:
		coll_site_id.update({'url': doc['url']}, doc)
	else:
	    coll_site_id.save(doc)

    s = cPickle.dumps(obj_tmp, cPickle.HIGHEST_PROTOCOL)

    encoded = base64.b64encode(s)
    doc = {'hash': roomid, 'room': encoded}

    if coll.find({'hash': roomid}).count() > 0:
        record = coll.find({'hash': roomid})[0]
        if record:
	    logging.debug('room exist: %s' % record['room'])
	    log.append('room exist: %s\n' % record['room'])
	    coll.update({'hash': roomid}, doc)
	    logging.debug('update room to database: %s' % doc)
	    log.append('update room to database: %s\n' % doc)
    else:
        coll.save(doc)
        logging.debug('new room to database: %s' % doc)
	log.append('new room to database: %s\n' % doc)

def base_to_class(roomid):
    conn = pymongo.Connection()
    db = conn.mydb
    coll = db.mycoll

    result = None
    if coll.find({'hash': roomid}).count() > 0:
        record = coll.find({'hash': roomid})[0]
        if record:
            logging.debug('get room from database: %s' % record['room'])
	    log.append('get room from database: %s\n' % record['room'])
	    decoded=base64.b64decode(record['room'])
            result = cPickle.loads(decoded)

    conn.close()
    return result

def get_from_base():
    conn = pymongo.Connection()
    db = conn.mydb
    coll = db.mycoll
    result = {}

    records = coll.find()
    for record in records:
        decoded=base64.b64decode(record['room'])
        result[record['hash']] = cPickle.loads(decoded)
    return result
