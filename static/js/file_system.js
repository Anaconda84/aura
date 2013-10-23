// vim: set et sw=2 ts=2 sts=2 ff=unix fenc=utf8:
// Author: Binux<i@binux.me>
//         http://binux.me
// Created on 2013-05-01 12:18:24

define(['underscore'], function() {
//  if (window.webkitRequestFileSystem) {
//    window.requestFileSystem = window.webkitRequestFileSystem;
//  }
  window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;

  function fileSystemFile(file_meta, callback) {
    this.size = file_meta.size;
    this.file_meta = file_meta;
    this.callback = callback;

//    this.filename = _.uniqueId('file_'+file_meta.hash+'_'+_.random(3721));
    this.filename = 'file_'+file_meta.hash;
    this.fs = null;
    this.file_entry = null;

    this.init();
  }

  fileSystemFile.prototype = {
    // public
    write: function(blob, offset, callback) {
      console.debug('fileSystem:write');
      if (!this.file_entry) {
        throw 'file entry is not setted';
      }
      offset = offset || 0;
      this.file_entry.createWriter(function(fw) {
        if (!blob.size) {
          blob= new Blob([blob]);
        }
        fw.seek(offset);
        fw.write(blob);
        if (_.isFunction(callback)) {
          fw.onwriteend = callback;
        }
      });
    },

    readAsBlob: function(start, end, callback) {
      console.debug('fileSystem:readAsBlob');
      this.file_entry.file(function(file) {
        callback(file.slice(start, end));
      });
    },
    
    readAsBinaryString: function(start, end, callback) {
      console.debug('fileSystem:readAsBinaryString');
      this.readAsBlob(start, end, function(blob) {
        var reader = new FileReader();
        reader.onload = function(evt) {
          callback(evt.target.result);
        };
        reader.readAsBinaryString(blob);
      });
    },

    toURL: function() {
      console.debug('fileSystem:toURL');
      return this.file_entry.toURL();
    },

    // private
    init: function() {
      console.debug('fileSystem:init');
      this.This = this;
      requestFileSystem(window.TEMPORARY, 1*1024*1024*1024 /* 1G */, _.bind(this.oninitfs, this), this.onerror);
//      window.addEventListener('beforeunload', _.bind(function() {
//        if (this.file_entry) {
////          this.file_entry.remove(function() {}, this.onerror);
//        }
//      }, this));
    },

    onerror: function(e) {
      console.log(e);
      switch (e.code) {
        case FileError.QUOTA_EXCEEDED_ERR:
          alert('Error writing file, is your harddrive almost full?');
          this.This.clear();
          console.debug('fileSystem:init');
//          debugger;
          requestFileSystem(window.TEMPORARY, 1*1024*1024*1024 /* 1G */, _.bind(this.This.oninitfs, this.This), this.This.onerror);
          break;
        case FileError.NOT_FOUND_ERR:
          alert('NOT_FOUND_ERR');
          break;
        case FileError.SECURITY_ERR:
          alert('SECURITY_ERR');
          break;
        case FileError.INVALID_MODIFICATION_ERR:
          alert('INVALID_MODIFICATION_ERR');
          break;
        case FileError.INVALID_STATE_ERR:
          alert('INVALID_STATE_ERROR');
          break;
        default:
          alert('webkitRequestFileSystem failed as ' + e.code);
      }
    },

    clear: function () {
        console.debug('fileSystem:clear');
        console.debug("request to clear file system");
        var fs= requestFileSystem(TEMPORARY, 1024,
        function(fs) {
          var dirReader = fs.root.createReader();
          console.debug("writer initialized");

          dirReader.readEntries(function(entries) { //function not firing

            console.debug("reading entries in file system"); 
            for (var i = 0, entry; entry = entries[i]; ++i) {
              if (entry.isDirectory) {
                entry.removeRecursively(function() {}, this.onerror);
              } else {
                entry.remove(function() {}, this.onerror);
              }
            }
            console.debug("file system cleared");
          }, this.onerror);
        }, this.onerror);
    },

    // step 1
    oninitfs: function(fs) {
      console.debug('fileSystem:oninitfs');
      this.fs = fs;
      this.check_exist();
    },

    // step 2
    check_exist: function () {
        This = this;
        this.fs.root.getFile(this.filename, {create : false}, function(file_entry) {
           console.debug('fileSystem:Exist file: '+This.filename);
           This.file_entry = file_entry;
           This.callback();
        }, function() {
           console.debug('fileSystem:Not exist file: '+This.filename);
           This.create_file();
        });
    },

    // step 3
    create_file: function() {
      console.debug('fileSystem:create_file');
      var This = this;
      this.fs.root.getFile(this.filename, {create: true, exclusive: false}, function(file_entry) {
        This.file_entry = file_entry;
        _.bind(This.alloc, This)(This.size);
      }, this.onerror);
    },

    // step 4
    alloc: function(size) {
      console.debug('fileSystem:alloc');
      var This = this;
      this.file_entry.createWriter(function(fw) {
        function write() {
          if (size > 0) {
            var write_size = size > (1 << 26) ? (1 << 26) : size; /* 64M */
            fw.write(new Blob([new Uint8Array(write_size)]));
            size -= write_size;
          } else if (_.isFunction(This.callback)) {
            This.callback();
          }
        }

        fw.onwriteend = function() {
          write();
        };
        write();
      });
    }
  };

  return {
    File: fileSystemFile
  };
});

