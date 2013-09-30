// vim: set et sw=2 ts=2 sts=2 ff=unix fenc=utf8:
// Author: Binux<i@binux.me>
//         http://binux.me
// Created on 2013-05-01 12:18:24

define(['jquery', 'utils', 'file_meta', 'underscore'], function($, utils, file_meta) {
  window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;

  var J_console = $('#J_console');

  function fileList() {
    console.debug('fileList');
    this.entries = null;
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
      requestFileSystem(window.TEMPORARY, 1*1024*1024*1024 /* 1G */, _.bind(this.oninitfs, this), this.onerror);
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

          var client = new p2p_module.Client();
          client.ishronology = false;
//          J_console.append('<li>websocket connecting...');
          client.hronology[(new Date()).getTime()] = 'Start client';

          window.onbeforeunload = function()
          {
            client.send_statistics();
          }


          client.onready = function() {
            if(client.ishronology) { client.hronology[(new Date()).getTime()] = 'Onready client'; }
//            console.debug('file_list: Onready client');

//            J_console.append('<li>connected. get peerid: '+client.peerid);
//            J_console.append('size: '+file.size);

//            J_console.append('<li>getting file meta...');
            client.roomid = file.name.split('_')[1];
            client.join_room(client.roomid);
            client.onfilemeta = function(file_meta) {
              if(client.ishronology) { client.hronology[(new Date()).getTime()] = 'Onfilemeta client'; }
//              J_console.append('<li>file: '+file_meta.filename+
//                          ' size: '+utils.format_size(file_meta.size)+
//                          ' ('+file_meta.type+')');
              client.finished_piece = _.map(client.finished_piece, function() { return 1; });
              client.create_bitmap(file, file_meta);
              client.oncreatebitmap = function() {
                client.update_bitmap(client);
                client.update_peer_list();
                setInterval(_.bind(client.update_peer_list, client), 60*1000); // 1min
                J_console.append('<li>file: '+file_meta.filename+
                          ' size: '+utils.format_size(file_meta.size)+
                          ' ('+file_meta.type+') - OK.');
              }
            };

            client.onpeerlist = function(peer_list) {
              console.debug('file_list: Onpeerlist.');
              if(client.ishronology) { client.hronology[(new Date()).getTime()] = 'Onpeerlist client'; }
              client.start_process();
            };

            client.onpeerconnect = function(peer) {
              if(client.ishronology) { client.hronology[(new Date()).getTime()] = 'Onpeerconnect client'; }
                console.debug('file_list: Onpeerconnect.');
            };

            client.onpeerdisconnect = function(peer) {
              if(client.ishronology) { client.hronology[(new Date()).getTime()] = 'Onpeerdisconnect client'; }
                console.debug('file_list: Onpeerdisconnect.');
            };

            client.onspeedreport = function(report) {
//              console.debug('file_list: Onspeedreport.');
              client.fill_info_table(report);
//              console.debug(stat);
            };

            client.onpiece = function(piece) {
              if(client.ishronology) { client.hronology[(new Date()).getTime()] = 'Onpiece client. Piece = '+piece; }
              console.debug('file_list: onpiece = '+piece);
//              $('#J_progress').text(''+(_.filter(client.finished_piece, _.identity).length / client.finished_piece.length * 100

            };

            client.onfinished = function() {
              console.debug('file_list: onfinished');
              J_console.append('<li>download completed: <a href="'+client.file.toURL()+
                       '" download="'+client.file_meta.filename+'">'+client.file_meta.filename+'</a>');
              client.speed_report();
              client.send_statistics();
            };


         };

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
            for(var i = 0; i < This.entries.length; i++) {
              This.current_entry = This.entries[i];
              if(This.current_entry.name === Window.cur_file)
              {
                console.debug('fileSystem:File '+This.current_entry.name+' is equivalent Window.cur_file.');
              }
              else
              {
                This.current_entry.file(This.onfile, This.onerror);
              }
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

