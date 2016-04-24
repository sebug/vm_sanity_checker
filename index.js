/*global require, process */
(function () {
    'use strict';

    var walk = require('walk');
    var fs = require('fs');
    var args = process.argv.slice(2);
    var acorn = require('acorn');

    if (args.length === 0) {
	console.log('Usage: node index.js directory');
	return 1;
    }

    var directory = args[0];
    var walker = walk.walk(directory);

    walker.on('file', function (root, fileStats, next) {
	if (fileStats.name && fileStats.name.indexOf('.js') === fileStats.name.length - 3) {
	    fs.readFile(root + '/' + fileStats.name, 'utf8', function (err, data) {
		if (err) {
		    throw err;
		}
		var tree = acorn.parse(data);
		console.log(tree);
		next();
	    });
	} else {
	    next();
	}
    });
}());
