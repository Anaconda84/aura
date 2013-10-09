// vim: set et sw=2 ts=2 sts=2 ff=unix fenc=utf8:
// Author: Binux<i@binux.me>
//         http://binux.me
// Created on 2013-04-24 15:11:35

define(['jquery', 'p2p', 'utils', 'underscore'], function($, p2p, utils) {
  p2p_module = p2p;
  stat_traf = {};
  var J_console = $('#J_console');

  // feature detect
  var feature = ['JSON', 'WebSocket', 'URL', 'ArrayBuffer', 'Uint8Array', 'Blob',
    'File', 'requestFileSystem', 'FileError', 'RTCPeerConnection', 'RTCIceCandidate',
    'RTCSessionDescription'];
  var miss_feature = false;
  _.each(feature, function(f) {
    if (!window[f]) {
      miss_feature = true;
      J_console.append('<li><span class=error>Need Feature: '+f+'</span>');
    }
  });
  if (miss_feature) return;

  if (!miss_feature) {

    // find 'p2p_' in attribute id in document
//    var ref = $('[id ^= "p2p:"]')
    var ref = $('video', '[id ^= "p2p:"]');
    for (var i = 0; i < ref.length; i++)
    {
      var video =ref.get(i);
//      video.controls = false;

      var client = new p2p.Client();
      J_console.append('<li>websocket connecting...');
      client.hronology[(new Date()).getTime()] = 'Start client';

      window.onbeforeunload = function()
      {
         client.send_statistics();
      }


      client.onready = function() {
        client.hronology[(new Date()).getTime()] = 'Onready client';
        client.get_url(video.src);
        client.ongeturl = function(roomid) {
          client.hronology[(new Date()).getTime()] = 'Ongeturl client';
          client.roomid = roomid;
          J_console.append('<li>connected. get peerid: '+client.peerid);
          J_console.append('<li>getting file meta...');
          client.join_room(client.roomid);
          client.onfilemeta = function(file_meta) {
            console.debug('Onfilemeta.');
            client.hronology[(new Date()).getTime()] = 'Onfilemeta client';
            J_console.append('<li>file: '+file_meta.filename+
                          ' size: '+utils.format_size(file_meta.size)+
                          ' ('+file_meta.type+')');
//            J_console.append('<li><button id=J_refresh_peer_list>refresh</button>');

//            $('#J_refresh_peer_list').on('click', function() {
//              _.bind(client.update_peer_list, client)();
//            });
            client.update_peer_list();
            setInterval(_.bind(client.update_peer_list, client), 60*1000); // 1min
            Window.cur_file = 'file_'+file_meta.hash;
//            client.update_file_list();
          };

          client.onpeerlist = function(peer_list) {
            client.hronology[(new Date()).getTime()] = 'Onpeerlist client';
            var info_table = $('#infoTable')[0];
            if(info_table)
            {
              info_table.rows[1].cells[0].innerHTML = (_.size(peer_list)-1).toString();
            }
            client.start_process();
          };

          client.onpeerconnect = function(peer) {
            client.hronology[(new Date()).getTime()] = 'Onpeerconnect client';
          };

          client.onpeerdisconnect = function(peer) {
            client.hronology[(new Date()).getTime()] = 'Onpeerdisconnect client';
          };

          client.onspeedreport = function(report) {
            client.fill_info_table(report);
          };

          var create_video = _.once(function(url) {
            client.hronology[(new Date()).getTime()] = 'Create video client';
            console.debug('Create video client');
//            video.attr('disabled', false);
//            J_console.append('<li><div id=J_video_wrap><video id=J_video>video not supported</video></div>');
//            var video = $('#J_video').get(0);
            start_video = video.currentTime;
            console.debug('video: start_video='+start_video);
            var video_pre_seek = 8;
            var on_error_time = 0;
            video.src = url;
            video.preload = 'metadata';
            video.autoplay = false;
            video.controls = false;

            video.addEventListener('canplay', function() {
              client.hronology[(new Date()).getTime()] = 'Canplay video client';
              console.debug('video: canplay');
              video.controls = false;
              $('#J_video_wrap').width($(video).width()); // hold video width
              $('#J_video_wrap').height($(video).height());
              console.debug('video: canplay start_video='+start_video);
              if(start_video) {
                console.debug('video: set time video start_video='+start_video);
                video.currentTime = start_video;
              }
              if (on_error_time) {
                video.currentTime = on_error_time;
                video.play();
              }
            });
            video.addEventListener('error', function() {
              client.hronology[(new Date()).getTime()] = 'Error video client';
              console.debug('video: error - '+video.error);
              on_error_time = Math.max(0, video.currentTime);
              console.debug('video: play error on '+on_error_time+', retry in 5s.');
              setTimeout(function() {
                $('#J_video_wrap').width($(video).width()); // hold video width
                $('#J_video_wrap').height($(video).height());
                video.currentTime = on_error_time;
                video.load();
              }, 5000);
            });
            video.addEventListener('seeking', _.throttle(function(evt) {
              if(!client.seeking)
              {
                client.seeking = true;
                console.debug('seeking time = '+video.currentTime);
//                video.pause();
                var seektime = Math.max(0, video.currentTime);
                if (seektime == on_error_time) {
                  return ;
                }
                client.hronology[(new Date()).getTime()] = 'Seeking viteo client. Seektime = '+seektime;
                on_error_time = seektime;
                var piece = Math.floor(seektime / video.duration * client.file_meta.piece_cnt);

                var new_queue = [], pre_seek_l = [], pre_seek_g = [], other = [];
                for (var i=0; i<client.piece_queue.length; i++) {
                  var p = client.piece_queue[i];
                  if (piece - video_pre_seek < p && p < piece)
                    pre_seek_l.push(p);
                  else if (piece <= p && p < piece + video_pre_seek)
                    pre_seek_g.push(p);
                  else if (p > piece)
                    new_queue.push(p);
                  else
                    other.push(p);
                }
                pre_seek_l.sort().reverse();
                pre_seek_g.sort();
                new_queue.sort();
                other.sort();
                while (pre_seek_l.length + pre_seek_g.length > 0) {
                  if (pre_seek_g.length > 0)
                    new_queue.unshift(pre_seek_g.pop());
                  if (pre_seek_l.length > 0)
                    new_queue.unshift(pre_seek_l.pop());
                }
                client.piece_queue = new_queue.concat(other);
                client.start_process();
                video.currentTime = seektime;
//                video.play();

                console.debug('seeking to '+seektime+', move piece '+piece+' to top.', client.piece_queue);
              }
            }, 500));
          });

          client.onpiece = function(piece) {
            client.hronology[(new Date()).getTime()] = 'Onpiece client. Piece = '+piece;
            console.debug('onpiece = '+piece);
            $('#J_progress').text(''+(_.filter(client.finished_piece, _.identity).length / client.finished_piece.length * 100).toFixed(2)+'%');

            if (piece === 0 && 'video/ogg,video/mp4,video/webm,audio/ogg'.indexOf(client.file_meta.type) != -1) {
              create_video(client.file.toURL());
              client.update_file_list();
            }
            client.seeking = false;
          };

          client.onfinished = function() {
            console.debug('onfinished');
            J_console.append('<li>download completed: <a href="'+client.file.toURL()+
                       '" download="'+client.file_meta.filename+'">'+client.file_meta.filename+'</a>');
            client.speed_report();
            client.send_statistics();
          };
        };
      };
    }
  }

  return {
    client: client
  };
});
