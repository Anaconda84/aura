// vim: set et sw=2 ts=2 sts=2 ff=unix fenc=utf8:
// Author: Binux<i@binux.me>
//         http://binux.me
// Created on 2013-04-22 17:20:48

define(['peer', 'file_meta', 'utils', 'http_peer', 'ws_peer', 'file_system', 'file_list', 'underscore', 'lib/sha1.min'], function(peer, file_meta, utils, hpeer, ws_peer, FileSystem, FileList) {
  var J_console = $('#J_console');
  function sum(list) {
    return _.reduce(list, function(memo, num){ return memo + num; }, 0);
  }

  function now() {
    return (new Date()).getTime();
  }

  function Client() {
    this.block_per_connect = 1;
    this.connect_limit = 20;
    this.check_pending_interval = 10*1000; // 10s

    this.init();
  }

  Client.prototype = {
    init: function() {
      console.debug('p2p:init');
      this.roomid = null;
      this.peerid = null;
      this.file_meta = null;
      this.file = null;
      this.ws = null;
      this.peers = {};
      this.ready = false;
      this.seeking = false;

      this.hronology = {};
      this.inuse_peer = {};
      this.bad_peer = {};
      this.blocked_peer = {};

      this.piece_queue = [];
      this.finished_piece = [];
      this.finished_block = {};
      this.pending_block = {};
      this.block_chunks = {};
      this.stat = {};

      this.ishronology = true;

      this._sended = 0;
      this._recved = 0;
      this._htsended = 0;
      this._htrecved = 0;
      this.peer_trans = {};
      this.last_speed_report = now();
      var speed_report_interval = setInterval(_.bind(this.speed_report, this), 1000);

      this.ws = new WebSocket(
        (location.protocol == 'https:' ? 'wss://' : 'ws://')+location.host+'/room/ws');
      this.ws.onopen = _.bind(this.onwsopen, this);
      this.ws.onmessage = _.bind(this.onwsmessage, this);

    },

    new_room: function(file_meta, callback) {
      if(this.ishronology) { this.hronology[(new Date()).getTime()] = 'New room'; }
      console.debug('p2p:new_room');
      this.ws.send(JSON.stringify({cmd: 'new_room', file_meta: file_meta}));
    },

    join_room: function(room_id) {
      if(this.ishronology) { this.hronology[(new Date()).getTime()] = 'Join room'; }
      console.debug('p2p:join_room');
      this.ws.send(JSON.stringify({cmd: 'join_room', roomid: room_id}));
    },

    add_http_peer: function(url) {
      if(this.ishronology) { this.hronology[(new Date()).getTime()] = 'Add http peer'; }
      console.debug('p2p:add_http_peer');
      this.ws.send(JSON.stringify({cmd: 'add_http_peer', url: url,
                                   bitmap: client.finished_piece.join('')}));
    },

    update_peer_list: function() {
      if(this.ishronology) { this.hronology[(new Date()).getTime()] = 'Update peer list'; }
      console.debug('p2p:update_peer_list');
      this.ws.send(JSON.stringify({cmd: 'get_peer_list'}));
    },

    update_file_list: function() {
      if(this.ishronology) { this.hronology[(new Date()).getTime()] = 'Update file list'; }
      console.debug('p2p:update_file_list');
      this.list_files = new FileList.List();
    },

    update_bitmap: function(client) {
      if(this.ishronology) { this.hronology[(new Date()).getTime()] = 'Update bitmap'; }
      console.debug('p2p:update_bitmap');
      this.ws.send(JSON.stringify({cmd: 'update_bitmap', bitmap: client.finished_piece.join('')}));
    },

    create_bitmap: function(file, fm) {
      if(this.ishronology) { this.hronology[(new Date()).getTime()] = 'Create bitmap'; }
      console.debug('p2p:create_bitmap');

      this.fm = fm;
      this.finished_piece = [];
      for(i=0; i<this.fm.sha1_array.length; i++) { this.finished_piece[i] = 0; }
      This = this;
      var builder = file_meta.build(file);
      builder.onload = function(result) {
        for(i=0; i<This.finished_piece.length; i++)
        {
          if(This.fm.sha1_array[i] && result.sha1_array[i] && This.fm.sha1_array[i] === result.sha1_array[i]) { This.finished_piece[i] = 1; This.piece_queue.splice(This.piece_queue.indexOf(i), 1); }
        }
        $('#J_hash').text(result.hash);
        console.debug('p2p:bitmap',  This.finished_piece);
        This.oncreatebitmap();
      };

      builder.onprogress = function(data) {
        $('#J_hash').text(''+(data.done/data.total*100).toFixed(2)+'%');
      };
      J_console.append('<li>calculating sha1 hash: <span id=J_hash>0%</span>');

    },

    get_url: function(url) {
      if(this.ishronology) { this.hronology[(new Date()).getTime()] = 'Get url'; }
      console.debug('p2p:get_url');
      this.ws.send(JSON.stringify({cmd: 'get_url', url: url}));
    },

    send_statistics: function() {
      if(this.ishronology) { this.hronology[(new Date()).getTime()] = 'Send statistics'; }
      console.debug('p2p:send_statistics');
      var str = JSON.stringify(this.stat);
      this.ws.send(JSON.stringify({cmd: 'send_statistics', stat: str}));
    },

    health: function() {
      console.debug('p2p:health');
      if (!this.file_meta) {
        return 0;
      }

      var i, tmp = [];
      for (i=0; i<this.file_meta.piece_cnt; i++) {
        tmp.push(0);
      }

      var This = this;
      _.each(this.peer_list, function(value, key) {
        for (i=0; i<This.file_meta.piece_cnt; i++) {
          tmp[i] += (value.bitmap[i] == '1' ? 1 : 0);
        }
      });

      var min = _.min(tmp);
      return min+(_.filter(tmp, function(num) { return num > min; }).length / tmp.length);
    },

    fill_info_table: function(report) {
//      if(this.ishronology) { this.hronology[(new Date()).getTime()] = 'fill_info_table'; }
//      console.debug('p2p:fill_info_table');

      stat_traf['send'] = ((stat_traf['send'] || 0)+report.sended) || 0;
      stat_traf['recv'] = ((stat_traf['recv'] || 0)+report.recved) || 0;
      stat_traf['htsend'] = ((stat_traf['htsend'] || 0)+report.htsended) || 0;
      stat_traf['htrecv'] = ((stat_traf['htrecv'] || 0)+report.htrecved) || 0;

      var info_table = $('#infoTable')[0];
      if(info_table)
      {
        info_table.rows[1].cells[0].innerHTML = utils.format_size(report.send)+'/s';
        if(stat_traf['send']) { info_table.rows[1].cells[1].innerHTML = utils.format_size(stat_traf['send']); }
        info_table.rows[1].cells[2].innerHTML = utils.format_size(report.recv)+'/s';
        if(stat_traf['recv']) { info_table.rows[1].cells[3].innerHTML = utils.format_size(stat_traf['recv']); }
        info_table.rows[1].cells[4].innerHTML = utils.format_size(report.htsend)+'/s';
        if(stat_traf['htsend']) { info_table.rows[1].cells[5].innerHTML = utils.format_size(stat_traf['htsend']); }
        info_table.rows[1].cells[6].innerHTML = utils.format_size(report.htrecv)+'/s';
        if(stat_traf['htrecv']) { info_table.rows[1].cells[7].innerHTML = utils.format_size(stat_traf['htrecv']); }
      }
    },

    // export 
    onready: function() { console.log('onready'); },
    onfilemeta: function(file_meta) { console.log('onfilemeta', file_meta); },
    onpeerlist: function(peer_list) { console.log('onpeerlist', peer_list); },
    ongeturl: function(url) { console.log('ongeturl', url); },
    onpeerconnect: function(peer) { console.log('onnewpeer', peer); },
    onpeerdisconnect: function(peer) { console.log('onnewpeer', peer); },
    onpiece: function(piece) { console.log('onpiece', piece); },
    onfinished: function() { console.log('onfinished'); },
//    onspeedreport: function(report) { console.log('onspeedreport', report); },
    onspeedreport: function(report) { },
    oncreatebitmap: function() { console.log('oncreatebitmap'); },
//    onupdatebitmap: function() { console.log('onupdatebitmap'); },

    // private
    ensure_connection: function(peerid, connect) {
      console.debug('p2p:ensure_connection');
      if (this.peers[peerid]) {
        return this.peers[peerid];
      } else {
        var p;
        if (peerid.indexOf('http:') === 0 || peerid.indexOf('https:') === 0)
          p = new hpeer.Peer(peerid, this);
        else if (peerid.indexOf('ws:') === 0 || peerid.indexOf('wss:') === 0)
          p = new ws_peer.Peer(peerid, this);
        else
          p = new peer.Peer(this.ws, this.peerid, peerid);
        p.trans_id = _.uniqueId('peer_');

        this.inuse_peer[peerid] = 0;
        this.peers[peerid] = p;

        p.onmessage = _.bind(function(data) {
          if (_.isObject(data) || data.indexOf('{') === 0) {
            var msg = _.isObject(data) ? data : JSON.parse(data);
            if (msg.cmd == 'request_block') {
              this.send_block(p, msg.piece, msg.block);
            } else if (msg.cmd == 'block') {
              this.recv_block(p, msg.piece, msg.block, msg.data);
            }
          } else {  // proto 2
            var piece_block = data.slice(0, data.indexOf('|')).split(',');
            data = data.slice(data.indexOf('|')+1);
            this.recv_block(p, parseInt(piece_block[0], 10), parseInt(piece_block[1], 10), data);
          }
        }, this);
        p.onclose = _.bind(function() {
          console.log('peer connect with '+peerid+' disconnected;');
          this.remove_pending(peerid);
          delete this.peers[peerid];
          if (_.isFunction(this.onpeerdisconnect)) {
            this.onpeerdisconnect(p);
          }
        }, this);
        if (connect) {
          p.connect();
        }

        if (_.isFunction(this.onpeerconnect)) {
          console.log('new connect to '+peerid);
          this.onpeerconnect(p);
        }
        return p;
      }
    },

    send_block: function(peer, piece, block) {
      console.debug('p2p:send_block');
      console.log('sending block '+piece+','+block);
      if (!this.file) return;
      if (this.finished_piece[piece] != 1) return;

      var start = this.file_meta.piece_size*piece + this.file_meta.block_size*block;
      this.file.readAsBinaryString(start, start+this.file_meta.block_size, function(data) {
        peer.send(''+piece+','+block+'|'+data);
      });
    },

    request_block: function(peer, piece, block) {
      console.debug('p2p:request_block');
      console.debug('request_block: '+peer.id+', '+piece+', '+block);
      this.inuse_peer[peer.id] += 1;
      this.pending_block[piece][block] = peer.id;
      peer.send({cmd: 'request_block', piece: piece, block: block});
    },

    recv_block: function(peer, piece, block, data) {
      console.debug('p2p:recv_block');
      console.log('recv block '+piece+','+block);
      this.inuse_peer[peer.id] -= 1;
      if (this.finished_block[piece] && this.finished_block[piece][block] != 1) {
        // conv to arraybuffer
        if (data.byteLength === undefined) {
          var binarray = new Uint8Array(data.length);
          for (var i=0;i<data.length;i++) {
            binarray[i] = data.charCodeAt(i) & 0xff;
          }
          data = binarray;
        }

        if (this.pending_block[piece][block]) {
          this.pending_block[piece][block] = 0;
        }
        this.finished_block[piece][block] = 1;
        this.block_chunks[piece][block] = data;
        this.onblock_finished(piece, block);
      }
    },

    speed_report: function() {
      //console.debug('p2p:speed_report');
      var This = this;
      _.map(_.values(this.peers), function(peer) {
        if(peer.id.indexOf('http:') === 0 || peer.id.indexOf('https:') === 0)
        {
          This.peer_trans[peer.trans_id] = {
            sended: 0,
            recved: 0,
            htsended: peer.sended(),
            htrecved: peer.recved()
          };
        }
        else
        {
          This.peer_trans[peer.trans_id] = {
            sended: peer.sended(),
            recved: peer.recved(),
            htsended: 0,
            htrecved: 0
          };
        }
//        console.debug('p2p:peer_trans['+peer.trans_id+']='+This.peer_trans[peer.trans_id].htrecved+', '+This.peer_trans[peer.trans_id].htsended+' | '+This.peer_trans[peer.trans_id].recved+', '+This.peer_trans[peer.trans_id].sended);
//        if(This.peer_trans[peer.trans_id].recved || This.peer_trans[peer.trans_id].sended) { debugger; }
      });
      var _sended = sum(_.pluck(_.values(this.peer_trans), 'sended')) || 0;
      var _recved = sum(_.pluck(_.values(this.peer_trans), 'recved')) || 0;
      var _htsended = sum(_.pluck(_.values(this.peer_trans), 'htsended')) || 0;
      var _htrecved = sum(_.pluck(_.values(this.peer_trans), 'htrecved')) || 0;

      if (_.isFunction(this.onspeedreport)) {
        if(!(_sended == 0 &&  this._sended) &&  
           !(_recved == 0 && this._recved) &&
           !(_htsended == 0 &&  this._htsended) &&  
           !(_htrecved == 0 && this._htrecved) ) { 
            var elapsed = (now() - this.last_speed_report) / 1000;
            var sendps = (_sended - this._sended) / elapsed || 0;
            var recvps = (_recved - this._recved) / elapsed || 0;
            var sended = (_sended - this._sended) || 0;
            var recved = (_recved - this._recved) || 0;
            var htsendps = (_htsended - this._htsended) / elapsed || 0;
            var htrecvps = (_htrecved - this._htrecved) / elapsed || 0;
            var htsended = (_htsended - this._htsended) || 0;
            var htrecved = (_htrecved - this._htrecved) || 0;
            this.onspeedreport({send: sendps, sended: sended,
                            recv: recvps, recved: recved,
                            htsend: htsendps, htsended: htsended,
                            htrecv: htrecvps, htrecved: htrecved,
            });
        }
        this.stat['roomid'] = this.roomid;
        this.stat['peerid'] = this.peerid;
        this.stat['send'] = _sended || 0;
        this.stat['recv'] = _recved || 0;
        this.stat['sendps'] = sendps || 0;
        this.stat['recvps'] = recvps || 0;
        this.stat['htsend'] = _htsended || 0;
        this.stat['htrecv'] = _htrecved || 0;
        this.stat['htsendps'] = htsendps || 0;
        this.stat['htrecvps'] = htrecvps || 0;
        this.stat['hronology'] = this.hronology || 0;
      }

      this._sended = _sended;
      this._recved = _recved;
      this._htsended = _htsended;
      this._htrecved = _htrecved;
      this.last_speed_report = now();
    },

    pickup_block: function() {
      console.debug('p2p:pickup_block');
      if (_.isEmpty(this.piece_queue)) {
        return null;
      }

      // choice a piece
      var i, j, block_cnt = Math.ceil(1.0 * this.file_meta.piece_size / this.file_meta.block_size);

      for (i=0; i<this.piece_queue.length; i++) {
        var piece = this.piece_queue[i];

        // init if it's a new piece
        if (this.block_chunks[piece] === undefined) {
          this.block_chunks[piece] = [];
          this.finished_block[piece] = [];
          this.pending_block[piece] = [];
          for (i=0; i<block_cnt; ++i) {
            this.finished_block[piece][i] = 0;
            this.pending_block[piece][i] = 0;
          }
        }

        // pick up block
        for (j=0; j<block_cnt; ++j) {
          if (this.finished_block[piece][j] || this.pending_block[piece][j])
            continue;
          return [piece, j];
        }
      }
      return null;
    },

    find_available_peer: function(piece) {
      console.debug('p2p:find_available_peer');
      var peers = [];
      for (var key in this.peer_list) {
        if (key == this.peerid) continue;
        if (this.peer_list[key].bitmap[piece] &&
            (!_.has(this.inuse_peer, key) || this.inuse_peer[key] < this.block_per_connect) &&
            !this.blocked_peer[key]) {
          peers.push(key);
        }
      }

      if (peers.length === 0) {
        return null;
      } else if (peers.length == 1) {
        return peers[0];
      }

      var This = this;
      var peers_score = _.map(peers, function(key) {
        return (This.bad_peer[key] || 0) * 1000 +
          (This.peers[key] ? 0 : 1) * 100 +
          (This.inuse_peer[key] || 0) * 10;
      });
      var tmp = [];
      var min_score = _.min(peers_score);
      for (var i=0; i<peers.length; i++) {
        if (peers_score[i] == min_score) {
          tmp.push(peers[i]);
        }
      }

      return tmp[_.random(tmp.length-1)];
    },

    start_process: _.throttle(function() {
      console.debug('p2p:start_proccess');
      while (_.size(this.inuse_peer) < this.connect_limit && this._start_progress()) {
      }
    }, 100),

    _start_progress: function() {
      console.debug('p2p:_start_progress');
      // pickup block
      var piece_block = this.pickup_block();
      if (piece_block === null) {
        //console.log('no block to go.');
        return false;
      }
      var piece = piece_block[0]; block = piece_block[1];

      // find available peer
      var best_peer = this.find_available_peer(piece);
      if (best_peer === null) {
        //console.log('no peer has the piece.');
        return false;
      }
      var peer = this.ensure_connection(best_peer, true);

      // mark
      this.request_block(peer, piece, block);

      // set timeout for block, abandon all pending block when one is timeout
      _.delay(_.bind(this.check_pending, this, best_peer, piece, block, peer.recved(), this._recved, now()),
           this.check_pending_interval * 2);

      return true;
    },

    check_pending: function(peerid, piece, block, last_recved, total_recved, last_time) {
      console.debug('p2p:check_pending');
      // it's still working on it
      if (this.pending_block[piece] && this.pending_block[piece][block] == peerid && this.peers[peerid]) {
        var recved = this.peers[peerid].recved();
        var speed = (recved - last_recved) / (now() - last_time) * 1000;
        var global_speed = (this._recved - total_recved) / (now() - last_time) * 1000;
        if (speed > global_speed / _.size(this.peers) / 4) {  // 1/4 of avg speed
          // ok
          _.delay(_.bind(this.check_pending, this, peerid, piece, block, recved, this._recved, now()),
                  this.check_pending_interval);
        } else {
          // timeout
          console.log('low download speed from '+peerid+'...', speed, global_speed);
          this.bad_peer[peerid] = this.bad_peer[peerid] || 0;
          this.bad_peer[peerid] += 1;
          // close and block the peer for one block time
          this.peers[peerid].close();
          this.blocked_peer[peerid] = 998;
          _.delay(_.bind(function() {
            delete this.blocked_peer[peerid];
            delete this.inuse_peer[peerid];
            _.defer(_.bind(this.start_process, this));
          }, this), (this.file_meta.block_size / speed > 120 ? 120 : this.file_meta.block_size / speed) * 1000);
          _.defer(_.bind(this.start_process, this));
        }
      }
    },

    remove_pending: function(peerid) {
      console.debug('p2p:remove_pending');
      for (var p in this.pending_block) {
        for (var b=0; b<this.pending_block[p].length; b++) {
          if (this.pending_block[p][b] == peerid) {
            this.pending_block[p][b] = 0;
          }
        }
      }
    },

    onblock_finished: function(piece, block) {
      console.debug('p2p:onblock_finished');
      // piece finished
      if (_.all(this.finished_block[piece])) {
        var blob = new Blob(this.block_chunks[piece]);
        var This = this;
        this.file.write(blob, this.file_meta.piece_size * piece, function() {
          if (_.isFunction(This.onpiece)) {
            This.onpiece(piece);
          }
          _.defer(_.bind(This.update_bitmap, This), This);
//          _.defer(This.update_bitmap(This));

          // check all finished
          if (_.all(This.finished_piece) && _.isEmpty(This.piece_queue) &&
              _.isFunction(This.onfinished)) {
            This.finishonce = This.finishonce || _.once(This.onfinished);
            This.finishonce();
          }
        });
        This.finished_piece[piece] = 1;
        if (This.piece_queue.indexOf(piece) != -1) {
          this.piece_queue.splice(This.piece_queue.indexOf(piece), 1);
        }
        delete This.block_chunks[piece];
        delete This.finished_block[piece];
        delete This.pending_block[piece];
      }
      _.defer(_.bind(this.start_process, this));
//      _.defer(This.start_process());
    },

    onwsopen: function() { console.debug('p2p:onwsopen'); },

    onwsmessage: function(evt) {
      console.debug('p2p:onwsmessage');
      var msg = JSON.parse(evt.data);

      if (!msg.cmd && msg.type && msg.origin) {
        var peer = this.ensure_connection(msg.origin, false);
        peer.onwsmessage(msg);
      } else if (msg.cmd) {
        console.debug('p2p:', msg);
        switch (msg.cmd) {
          case 'peerid':
            this.peerid = msg.peerid;
            this.ready = true;
            if (_.isFunction(this.onready)) {
              this.onready();
            }
            break;
          case 'file_meta':
//            if (this.file_meta !== null)
//              break;
            this.file_meta = msg.file_meta;
            for (var i=0; i<this.file_meta.piece_cnt; ++i) {
              this.finished_piece[i] = 0;
              this.piece_queue.push(i);
            }

            var This = this;
            this.file = new FileSystem.File(this.file_meta, function() {
              if (_.isFunction(This.onfilemeta)) {
                This.onfilemeta(This.file_meta);
              }
            });
            break;
          case 'peer_list':
            this.peer_list = msg.peer_list;
            if (_.isFunction(this.onpeerlist)) {
              this.onpeerlist(this.peer_list);
            }
            break;
          case 'find_url':
            this.url = msg.url;
            if (_.isFunction(this.ongeturl)) {
              this.ongeturl(this.url);
            }
            break;
//          case 'update_bitmap':
//            if (_.isFunction(this.ongeturl)) {
//              this.onupdatebitmap();
//            }
//            break;

          default:
            break;
        }
      }
    }
  };

  return {
    Client: Client
  };
});


