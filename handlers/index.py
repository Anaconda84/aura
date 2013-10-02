#!/usr/bin/env python
# -*- encoding: utf-8 -*-
# Created on 2013-04-20 13:30:18

from base import *

class IndexHandler(BaseHandler):
    def get(self):
        self.render('index.html')

handlers = [
        (r'/', IndexHandler),
        ]
