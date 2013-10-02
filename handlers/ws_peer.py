#!/usr/bin/env python
# -*- encoding: utf-8 -*-
# Created on 2013-05-03 17:03:10

import os
import json
from base import *

class FileWebSocket(BaseWebSocket):
    def open(self, hash):
        logging.debug('ws_peer: new connect')
	log.append('ws_peer: new connect\n')
        print options.file_path+', '+hash
        if os.path.exists(os.path.join(options.file_path, hash)):
            self.file = open(os.path.join(options.file_path, hash))
        else:
            self.close()

    def on_message(self, message):
        logging.debug('ws_peer: %s' % message)
	log.append('ws_peer: %s\n' % message)
        data = json.loads(message)

        self.write_message({'cmd': 'start', 'piece': data['piece'], 'block': data['block']})

        pos = data['start']
        self.file.seek(data['start'])
        while pos < data['end']:
            to_read = data['end'] - pos
            if to_read > 1 << 16:  # 64k
                to_read = 1 << 16
            block = self.file.read(to_read)
            self.write_message(block, True)
            pos += to_read

        self.write_message({'cmd': 'end', 'piece': data['piece'], 'block': data['block']})

    def on_close(self):
        pass

handlers = [
        (r'/file/(\w+)', FileWebSocket),
        ]
