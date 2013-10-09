from slimit import minify
import re
import os
import sys


fileList = []
rootdir = sys.argv[1]
for root, subFolders, files in os.walk(rootdir):
    for file in files:
	match = re.search( ur".js$", file )
	if(match):
	    print os.path.join(root,file)
	    f = open(os.path.join(root,file), 'r')
	    text = f.read()
	    f.close();
	    f = open(os.path.join(root,file), 'w')
	    f.write( minify(text, mangle=True))
	    f.close();

