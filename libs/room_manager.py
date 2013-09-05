#!/usr/bin/env python
# -*- encoding: utf-8 -*-
# vim: set et sw=4 ts=4 sts=4 ff=unix fenc=utf8:
# Author: Binux<i@binux.me>
#         http://binux.me
# Created on 2013-04-22 16:15:32
import logging
import cPickle
import base64
import pymongo
import copy

class RoomManager(object):
    def __init__(self):
        self.rooms = {}
	self.rooms = get_from_base()

    def new(self, meta):
        if meta['hash'] in self.rooms:
            if self.rooms[meta['hash']].sha1_array == meta['sha1_array']:
		logging.debug('get: %s' % self.rooms)
                return self.rooms[meta['hash']]
            else:
                return None
        else:
            self.rooms[meta['hash']] = Room(meta['hash'], meta)
	    logging.debug('new: %s' % self.rooms)
            return self.rooms[meta['hash']]

    def delete(self, roomid):
	logging.debug('delete: %s' % roomid)
        if roomid in self.rooms:
            del self.rooms[roomid]

    def get(self, roomid):
	logging.debug('get: %s' % roomid)
        return self.rooms.get(roomid)

    def keys(self):
	logging.debug('keys: %s' % self.rooms.keys())
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
	return None

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
        self.peers[peerid] = Peer(peerid, ws)
        return self.peers[peerid]

    def leave(self, peerid):
	logging.debug('Room.leave: %s' % peerid)
        if peerid in self.peers:
            del self.peers[peerid]

    def get(self, peerid):
	logging.debug('Room.get: %s' % peerid)
        return self.peers.get(peerid)

    def peer_list(self):
	logging.debug('Room.peer_list: %s' % self.peers)
        result = {}
        for each in self.peers.itervalues():
            result[each.peerid] = {
                    'bitmap': each.bitmap,
                    }
        return result

    def add_http_peer(self):
	class_to_base(self, self.id)


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
	    coll.update({'hash': roomid}, doc)
	    logging.debug('update room to database: %s' % doc)
    else:
        coll.save(doc)
        logging.debug('new room to database: %s' % doc)
    conn.close()

def base_to_class(roomid):
    conn = pymongo.Connection()
    db = conn.mydb
    coll = db.mycoll

    result = None
    if coll.find({'hash': roomid}).count() > 0:
        record = coll.find({'hash': roomid})[0]
        if record:
            logging.debug('get room from database: %s' % record['room'])
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
