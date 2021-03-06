'use strict';

var _ = require('lodash');
var chalk = require('chalk');
var spawn = require('child_process').spawn;
var utils = require('./utils');
var path = require('path');

module.exports = Process;

var colors = [
  chalk.red,
  chalk.green,
  chalk.yellow,
  chalk.blue,
  chalk.magenta,
  chalk.cyan
];

var idx = 0;

function Process(doc, name) {
  var proc = doc.processes[name];
  this.name = name;
  this.cmd = proc.cmd;
  this.env = _.assign({}, process.env, doc.env, proc.env);
  this.dir = proc.dir ? path.resolve(doc.dir, proc.dir) : doc.dir;
  this.color = colors[idx++ % colors.length];
  this.doc = doc;
}

Process.prototype.start = function () {
  var file, args;
  var self = this;
  var options = {
    env: this.env,
    cwd: this.dir
  };
  // from exec implementation
  if (process.platform === 'win32') {
    file = process.env.comspec || 'cmd.exe';
    args = ['/s', '/c', '"' + this.cmd + '"'];
    options.windowsVerbatimArguments = true;
  } else {
    file = '/bin/bash'; // bash forwards SIGINT to children
    args = ['-c', this.cmd];
  }
  var child = spawn(file, args, options);
  this.child = child;
  this.info(this.name + ' started with pid ' + child.pid);

  child.stdout.on('data', function (data) {
    self.log(data.toString('utf8'));
  });

  child.stderr.on('data', function (data) {
    self.log(data.toString('utf8'));
  });

  child.on('close', function (code, signal) {
    var sig = signal ? (' by signal ' + signal) : '';
    self.info(self.name + ' exited with code ' + code + sig);
    delete self.child;
  });
}

Process.prototype.log = function (msg) {
  utils.splitLines(msg).forEach(function (line) {
    var head = _.padEnd(this.name, this.doc.nameWidth) + '> ';
    console.log(this.color(head) + line);
  }, this);
};

Process.prototype.info = function (msg) {
  console.log(this.color(msg));
};

Process.prototype.kill = function (signal) {
  this.child && this.child.kill(signal);
}