#!/usr/bin/env python
# -*- encoding: utf-8 -*-
# Created on 2013-10-01 10:00:00
import logging
import datetime
import time

class Log(object):
    def __init__(self, file_prefix):
        self.file_prefix = file_prefix
        self.file_desc = None
        self.cur_day = 0

    def append(self, msg):
	try:
	    now_time = datetime.datetime.now()
	    now_date = datetime.date.today()
	    day = now_date.day
#	    day = now_time.minute
	    if(day != self.cur_day):
#		print 'day='+str(day);
		self.close()
	    filename = self.file_prefix+'-'+str(now_date)+'.log'
	    msg = str(now_time)+'\t'+msg
	    if( not self.file_desc):
		self.file_desc = open(filename, "a")
		try:
    		    self.file_desc.write(msg)
		finally:
    		    self.file_desc.close()
	    else:
		self.file_desc = open(filename, "a")
		try:
    		    self.file_desc.write(msg)
		finally:
    		    self.file_desc.close()
	    self.cur_day = day;
	except IOError:
	    pass

    def close(self):
	if(self.file_desc):
	    self.file_desc.close();


if __name__ == "__main__":
    log = Log('stat')
    while True:
	log.append('11111111111\n')
	print '111111111111111'
        time.sleep(5)
    log.close()

