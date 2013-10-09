#!/usr/bin/env python
# -*- encoding: utf-8 -*-
# Created on 2013-04-20 20:03:41

import uuid
import json
from base import *
from libs.log_file import *

log = Log('/var/log/aura')
log_stat_rooms = Log('/var/log/aura_stat')

class NewHandler(BaseHandler):
    def get(self):
        self.render('room/new.html')

class ListRoomHandler(BaseHandler):
    def get(self):
        rooms = self.room_manager.rooms
        self.render('room/list.html', rooms = rooms)

class RoomHandler(BaseHandler):
    def get(self, video):
#        room = self.room_manager.get(roomid)
#        if not room:
#            raise HTTPError(404)
#        self.render('room/index.html', room = room)
	self.render('room/index.html', video = video)

class RoomWebSocket(BaseWebSocket):
    def open(self):
        logging.debug('new socket')
	log.append('new socket\n')
        self.peerid = str(uuid.uuid4())
        self.peer = None
        self.room = None
        self.write_message({'cmd': 'peerid', 'peerid': self.peerid})

    def on_message(self, message):
        data = json.loads(message)
        logging.debug('ws: %s' % message)
	log.append('ws: %s\n' % message)

        if data.get('cmd') and callable(getattr(self, 'cmd_'+data.get('cmd', ''), None)):
            getattr(self, 'cmd_'+data.get('cmd', ''))(data)
        elif data.get('type') and data.get('target'):
            if not self.room:
                return
            target = self.room.get(data.get('target'))
            if target:
                target.ws.write_message(message)

    def on_close(self):
	logging.debug('on_close:')
	log.append('on_close:\n')
        if self.room:
            self.room.leave(self.peerid)
            if len(self.room.peers) == 0:
                self.room_manager.delete(self.room.id)

    def cmd_new_room(self, data):
	logging.debug('cmd_new_room:')
	log.append('cmd_new_room:\n')
        self.room = self.room_manager.new(data['file_meta'])
        self.peer = self.room.join(self.peerid, self)
        self.write_message({'cmd': 'file_meta', 'file_meta': self.room.meta})

    def cmd_join_room(self, data):
	logging.debug('cmd_join_room:')
	log.append('cmd_join_room:\n')
        self.room = self.room_manager.get(data['roomid'])
        if self.room:
            self.peer = self.room.join(self.peerid, self)
            self.write_message({'cmd': 'file_meta', 'file_meta': self.room.meta})

    def cmd_get_meta(self, data):
	logging.debug('cmd_get_meta:')
	log.append('cmd_get_meta:\n')
        if self.room:
            self.write_message({'cmd': 'file_meta', 'file_meta': self.room.meta})

    def cmd_get_peer_list(self, data):
	logging.debug('cmd_get_peer_list: %s' % data)
	log.append('cmd_get_peer_list: %s\n' % data)
        if self.room:
	    logging.debug('self.room.peer_list() = %s' % self.room.peer_list())
	    log.append('self.room.peer_list() = %s\n' % self.room.peer_list())
            self.write_message({'cmd': 'peer_list', 'peer_list': self.room.peer_list()})

    def cmd_update_bitmap(self, data):
	logging.debug('cmd_update_bitmap.')
	log.append('cmd_update_bitmap.\n')
        if self.peer:
            self.peer.bitmap = data['bitmap']
#	    self.write_message({'cmd': 'update_bitmap', 'status': 'OK'})

    def cmd_add_http_peer(self, data):
        if self.room:
            peer = self.room.join(data['url'], self)
            peer.bitmap = data['bitmap']
	    self.room.add_http_peer()

    def cmd_get_url(self, url):
	logging.debug('cmd_get_url: %s' % url)
	log.append('cmd_get_url: %s\n' % url)
	if self.room_manager:
    	    self.write_message({'cmd': 'find_url', 'url': self.room_manager.get_url(url['url'])})

    def cmd_send_statistics(self, str):
        stat = json.loads(str['stat'])
#	logging.debug('cmd_send_statistics: %s' % stat)
	if self.room:
    	    self.room.add_statistics(stat)

handlers = [
        (r'/room', ListRoomHandler),
        (r'/room/new', NewHandler),
        (r'/room/ws', RoomWebSocket),
#        (r'/room/(\w+)', RoomHandler),
        (r'/room/(.+)', RoomHandler),
        ]
