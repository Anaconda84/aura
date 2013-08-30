// vim: set et sw=2 ts=2 sts=2 ff=unix fenc=utf8:
// Author: Binux<i@binux.me>
//         http://binux.me
// Created on 2013-05-01 12:18:24

define(['jquery', 'file_meta', 'underscore'], function($, file_meta) {
  window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;

  function fileList(client) {
    console.debug('fileList');
    this.entries = null;
    this.client = client;
    this.init();
  }

  fileList.prototype = {

    toURL: function() {
      console.debug('fileList:toURL');
      return this.file_entry.toURL();
    },

    // private
    init: function() {
      console.debug('fileSystem:init');
      requestFileSystem(window.TEMPORARY, 5*1024*1024*1024 /* 5G */, _.bind(this.oninitfs, this), this.onerror);
    },

    onerror: function(e) {
      console.log(e);
      switch (e.code) {
        case FileError.QUOTA_EXCEEDED_ERR:
          alert('Error writing file, is your harddrive almost full?');
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

    onfile: function(file) {
      if(file.size)
      {
          var This = this;
          J_console.append('<li>connected. get peerid: '+this.This.client.peerid);


          J_console.append('size: '+file.size);
          var builder = file_meta.build(file);
          builder.onload = function(result) {
            $('#J_hash').text(result.hash);

            J_console.append('<li>sending file meta...');
            This.client.new_room(result);
          };
          builder.onprogress = function(data) {
            $('#J_hash').text(''+(data.done/data.total*100).toFixed(2)+'%');
          };
          J_console.append('<li>calculating sha1 hash: <span id=J_hash>0%</span>');

          This.client.onfilemeta = function(file_meta) {
            This.client.piece_queue = [];
            This.client.finished_piece = _.map(This.client.finished_piece, function() { return 1; });
            This.client.update_bitmap(This.client);
            J_console.append('<li>room created: <a href="/room/'+file_meta.hash+'" target=_blank>'+
                           location.href.replace(/room\/new.*$/i, 'room/'+file_meta.hash)+'</a>');
            J_console.append('<li><dl class=info>'+
                            '<dt>health</dt> <dd id=J_health>100%</dd>'+
                            '<dt>peers</dt> <dd id=J_peers>1</dd>'+
                            '<dt>connected</dt> <dd id=J_conn>0</dd>'+
                            '<dt>upload</dt> <dd id=J_ups>0B/s</dd> <dd id=J_up>0B</dd>'+
                            '<dt>download</dt> <dd id=J_dls>0B/s</dd> <dd id=J_dl>0B</dd>'+
                           '</dl> <button id=J_refresh_peer_list>refresh</button>');

            $('#J_refresh_peer_list').on('click', function() {
              _.bind(This.client.update_peer_list, This.client)();
            });
            This.client.update_peer_list();
            setInterval(_.bind(This.client.update_peer_list, This.client), 60*1000); // 1min

          }

      }
    },

    oninitfs: function(fs) {
      console.debug('fileSystem:ListFiles');
      var dirReader = fs.root.createReader();
      var entries = [];

      // Call the reader.readEntries() until no more results are returned.
      This = this;
      var readEntries = function() {
         dirReader.readEntries (function(results) {
          if (!results.length) {
            This.entries = entries;
//            for (var This.current_entry in This.entries) {
            for(var i = 0; i < This.entries.length; i++) {
              This.current_entry = This.entries[i];
//              This.current_entry.getMetadata(This.onmetafile, This.onerror);
              This.current_entry.file(This.onfile, This.onerror);
            }
          } else {
            entries = entries.concat(toArray(results));
            readEntries();
          }
        }, this.onerror);
      };

      readEntries(); // Start reading dirs.
    }
  };

  return {
    List: fileList
  };
});

////// function //////////////
function toArray(list) {
  return Array.prototype.slice.call(list || [], 0);
}

